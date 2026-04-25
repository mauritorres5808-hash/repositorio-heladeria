// ==========================================
// ===============  SERVER.JS  ===============
// ==========================================

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const path = require("path");


// ==========================================
//  Inicializar Firebase Admin
// ==========================================
require("dotenv").config();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});


const db = admin.firestore();

// ==========================================
//  Inicializar Express
// ==========================================
const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static('public'));
app.use('/whatsapp-backend', express.static('whatsapp-backend'));

// ==========================================
//  FUNCION → OBTENER SIGUIENTE ID CORRELATIVO
// ==========================================
async function nextId(nombreColeccion, campoID) {
  const snap = await db
    .collection(nombreColeccion)
    .orderBy(campoID, "desc")
    .limit(1)
    .get();

  if (snap.empty) return 1;
  return snap.docs[0].data()[campoID] + 1;
}


// ==========================================
//  ENDPOINT → RECIBIR PEDIDO ONLINE
// ==========================================
app.post("/whatsapp/pedido", async (req, res) => {
	console.log("🔥 ENTRO A /whatsapp/pedido");
  try {
    const pedido = req.body;

	// VALIDACIÓN → evitar sabores vacíos solo en productos que requieren sabores
	for (const item of pedido.pedido) {

	  // ⚠ identificar si el producto requiere sabores
		const prod = cacheProductos.find(p => p.id_producto === item.id_producto);
	  // Si no existe el producto o no requiere sabores → NO validar sabores
	  if (!prod || prod.sabores !== "S") continue;

	  // Si requiere sabores, pero vienen 0 → error
	  if (!item.sabores || item.sabores.length === 0) {
		return res.status(400).json({
		  ok: false,
		  error: `El producto "${prod.descripcion}" requiere seleccionar sabores.`
		});
	  }
	}

    // 1) CREAR / OBTENER CLIENTE
    const tel = pedido.telefono.trim();
    const clientesRef = db.collection("CLIENTES");
    const cliSnap = await clientesRef.where("telefono", "==", tel).get();

    let id_cliente;

    if (cliSnap.empty) {
      id_cliente = await nextId("CLIENTES", "id_cliente");

      await clientesRef.add({
        id_cliente,
        nombre: pedido.nombre,
        domicilio: pedido.domicilio,
        telefono: tel,
        nota: pedido.nota || "",
        deshabilitado: "N"
      });

    } else {
      id_cliente = cliSnap.docs[0].data().id_cliente;
    }

    // 2) GUARDAR PEDIDO
    const id_pedido = await nextId("PEDIDOS_WHATSAPP", "id_pedido");

/*
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-AR");
    const hora = ahora.toLocaleTimeString("es-AR");
*/
const ahora = new Date();
const fecha = formatearFecha(ahora);
const hora = formatearHora(ahora);
console.log("GUARDANDO PEDIDO con FECHA:", fecha);
console.log("GUARDANDO PEDIDO con HORA:", hora);

    await db.collection("PEDIDOS_WHATSAPP").add({
      id_pedido,
      id_cliente,
      telefono: tel,
      nombre: pedido.nombre,
      domicilio: pedido.domicilio,
      nota: pedido.nota || "",
      pedido_detalle: pedido.pedido,
      fecha,
      hora,
      estado: "nuevo"
    });

    res.json({ ok: true, msg: "Pedido guardado correctamente." });

  } catch (err) {
    console.error("ERROR en /whatsapp/pedido:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/*
function formatearFecha(fechaObj) {
  return [
    String(fechaObj.getDate()).padStart(2, "0"),
    String(fechaObj.getMonth() + 1).padStart(2, "0"),
    fechaObj.getFullYear()
  ].join("/");
}
function formatearHora(fechaObj) {
  return [
    String(fechaObj.getHours()).padStart(2, "0"),
    String(fechaObj.getMinutes()).padStart(2, "0"),
    String(fechaObj.getSeconds()).padStart(2, "0")
  ].join(":");
}
*/
function formatearFecha(fechaObj) {
  return fechaObj.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatearHora(fechaObj) {
  return fechaObj.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

// ==========================================
//  API: validar domicilio
// ==========================================
const fetch = require("node-fetch");
/*
app.get("/api/verificar-direccion", async (req, res) => {
    const q = req.query.q;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1`;
        const resp = await fetch(url, {
            headers: { "User-Agent": "whatsapp-backend/1.0" }
        });
        const data = await resp.json();
        res.json({ ok: true, resultados: data });
    } catch (e) {
        console.error("Error en Nominatim:", e);
        res.json({ ok: false, resultados: [] });
    }
});
*/
app.post("/api/verificar-direccion", async (req, res) => {
    try {
        const direccion = req.body.direccion;

        if (!direccion) {
            return res.json({ ok: false, error: "Sin direccion" });
        }

        const url =
          "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q="
          + encodeURIComponent(direccion);

        const resp = await fetch(url, {
            headers: { "User-Agent": "whatsapp-backend/1.0" }
        });

        const data = await resp.json();

        // Si Nominatim devuelve HTML → data será un string → entonces NO es válido
        if (!Array.isArray(data)) {
            return res.json({ ok: false });
        }

        res.json({ ok: data.length > 0, resultados: data });

    } catch (err) {
        console.error("Error en verificar-direccion:", err);
        res.json({ ok: false });
    }
});


// ==========================================
//  API: LISTAR PEDIDOS
// ==========================================
app.get('/api/pedidos_whatsapp', async (req, res) => {
  try {
    const estado = req.query.estado;
    const qtext = req.query.q ? req.query.q.toLowerCase() : null;

    let ref = db.collection('PEDIDOS_WHATSAPP');
    if (estado) ref = ref.where('estado', '==', estado);

    const snap = await ref.get();
    let items = snap.docs.map(d => d.data());

    // ordenar por id_pedido desc
    items.sort((a,b) => (b.id_pedido || 0) - (a.id_pedido || 0));

    // búsqueda
    if (qtext) {
      items = items.filter(it => {
        const n = (it.nombre || '').toLowerCase();
        const t = (it.telefono || '').toLowerCase();
        return n.includes(qtext) || t.includes(qtext);
      });
    }

    res.json(items);

  } catch (e) {
    console.error('GET /api/pedidos_whatsapp error', e);
    res.status(500).json({ error: 'Error al listar pedidos' });
  }
});

// ==========================================
//  API: OBTENER UN PEDIDO (para convertir)
// ==========================================
app.get("/api/pedidos_whatsapp/:id", async (req, res) => {
  try {
    const idPedido = Number(req.params.id);

    const snap = await db
      .collection("PEDIDOS_WHATSAPP")
      .where("id_pedido", "==", idPedido)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    res.json(snap.docs[0].data());

  } catch (err) {
    console.error("ERROR GET /api/pedidos_whatsapp/:id", err);
    res.status(500).json({ error: "Error cargando pedido" });
  }
});

// ==========================================
//  API: Convertir pedido a venta
// ==========================================
app.post("/api/pedidos_whatsapp/:id/convertir", async (req, res) => {
  try {
    const idPedido = Number(req.params.id);

    const snap = await db
      .collection("PEDIDOS_WHATSAPP")
      .where("id_pedido", "==", idPedido)
      .limit(1)
      .get();

    if (snap.empty) return res.status(404).json({ error: "Pedido no encontrado" });

    const pedidoDoc = snap.docs[0];
    const pedido = pedidoDoc.data();

    if (pedido.estado === "convertido") {
      return res.status(400).json({ error: "Pedido ya confirmado como venta" });
    }

    const detalles = pedido.pedido_detalle;

    let subtotal = 0;
    detalles.forEach(it => subtotal += (it.precio || 0));
    const total = subtotal;

    // Validación combos / importes
    const { f_pago1, f_pago2, importe_fp1, importe_fp2 } = req.body;

    if ((importe_fp1 + importe_fp2) !== total) {
      return res.status(400).json({ error: "Los importes no coinciden con el total" });
    }

    if (importe_fp1 > 0 && (!f_pago1 || f_pago1 === 0)) {
      return res.status(400).json({ error: "Debe seleccionar forma de pago 1" });
    }

    if (importe_fp2 > 0 && (!f_pago2 || f_pago2 === 0)) {
      return res.status(400).json({ error: "Debe seleccionar forma de pago 2" });
    }

    // Crear Venta
    const last = await db.collection("VENTAS_CAB")
      .orderBy("id_venta", "desc")
      .limit(1)
      .get();

    const id_venta = last.empty ? 1 : last.docs[0].data().id_venta + 1;
/*
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString("es-AR");
    const hora = ahora.toLocaleTimeString("es-AR");
*/

const ahora = new Date();
const fecha = formatearFecha(ahora);
const hora = formatearHora(ahora);
console.log("GUARDANDO venta con FECHA:", fecha);

    // CABECERA
    await db.collection("VENTAS_CAB").add({
      id_venta,
	  anulada:"N",
      id_cliente: pedido.id_cliente,
      id_cierre: 0,
      f_pago1,
      f_pago2,
      importe_fp1,
      importe_fp2,
      recargo: 0,
      descuento: 0,
      subtotal,
      total,
      tipo_venta: 5,
      fecha,
      hora
    });

    // DETALLE
    const batch = db.batch();
    for (const it of detalles) {
      const ref = db.collection("VENTAS_DET").doc();
      batch.set(ref, {
        id_venta,
        id_producto: it.id_producto,
        precio: it.precio,
        cantidad: 1,
        subtotal: it.precio,
        sabores: Array.isArray(it.sabores) ? it.sabores : []
      });
    }
    await batch.commit();

    await pedidoDoc.ref.update({ estado: "convertido", id_venta });

    res.json({ ok: true, id_venta });

  } catch (e) {
    console.error("Error al convertir pedido", e);
    res.status(500).json({ error: "Error al convertir pedido" });
  }
});

// ==========================================
//  API: Eliminar pedido
// ==========================================
app.delete("/api/pedidos_whatsapp/:id", async (req, res) => {
  try {
    const idPedido = Number(req.params.id);
    const snap = await db
      .collection("PEDIDOS_WHATSAPP")
      .where("id_pedido", "==", idPedido)
      .limit(1)
      .get();

    if (snap.empty) return res.status(404).json({ error: "Pedido no encontrado" });

    await snap.docs[0].ref.delete();
    res.json({ ok: true });

  } catch (e) {
    console.error("Error eliminando pedido", e);
    res.status(500).json({ error: "Error al eliminar pedido" });
  }
});

app.get("/api/grupos", async (req, res) => {
    const snap = await db.collection("GRUPOS").get();
    const datos = snap.docs.map(d => d.data());
    res.json(datos);
});



// ==========================================
// PRODUCTOS / SABORES / FPAGO (cache)
// ==========================================
let cacheProductos = [];
let cacheSabores = [];
let cacheFPago = [];
const CACHE_TTL = 5 * 60 * 1000;

// PRODUCTOS
async function cargarProductosFirebase() {
  const snap = await db
    .collection("PRODUCTOS")
    .where("deshabilitado", "!=", "S")
    .orderBy("deshabilitado")
    .get();

  cacheProductos = snap.docs.map(d => d.data());
}
cargarProductosFirebase();
setInterval(cargarProductosFirebase, CACHE_TTL);

// SABORES
async function cargarSaboresFirebase() {
  const snap = await db.collection("SABORES").orderBy("id_sabor").get();
  cacheSabores = snap.docs.map(d => d.data());
}
cargarSaboresFirebase();
setInterval(cargarSaboresFirebase, CACHE_TTL);

// FORMAS DE PAGO
async function cargarFPago() {
  const snap = await db.collection("F_PAGO")
    .where("deshabilitado", "==", "N")
    .get();

  cacheFPago = snap.docs
    .map(d => d.data())
    .sort((a, b) => a.id_fpago - b.id_fpago);
}
cargarFPago();
setInterval(cargarFPago, CACHE_TTL);

// ENDPOINTS DE CATALOGOS
app.get("/api/productos", (req, res) => res.json(cacheProductos));
app.get("/api/sabores", (req, res) => res.json(cacheSabores));
app.get("/api/fpago", (req, res) => res.json(cacheFPago));

// ==========================================
// PÁGINAS HTML
// ==========================================
app.get("/pedidos-whatsapp", (req, res) => {
  res.sendFile(path.join(__dirname, "pedidos-whatsapp.html"));
});

app.get("/pedidos-online", (req, res) => {
  res.sendFile(path.join(__dirname, "pedidos-online.html"));
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================
console.log("VERSION SERVER:", new Date().toISOString());
app.listen(3000, () => {
  console.log("Servidor escuchando en http://localhost:3000");
});
