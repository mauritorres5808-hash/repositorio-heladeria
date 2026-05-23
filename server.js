// ==========================================
// ===============  SERVER.JS  ===============
// ==========================================

const pool = require('./db');

const express = require("express");
const session = require('express-session');

const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const db = require('./db');
const productosRoutes = require('./routes/productos');
const saboresRoutes = require('./routes/sabores');
const tipoSaboresRoutes = require('./routes/tipo-sabores');
const clientesRoutes = require('./routes/clientes');
const usuariosRoutes = require('./routes/usuarios');
const empresaRoutes = require('./routes/empresa');
const permisosRoutes = require('./routes/permisos');
const fpagoRoutes = require('./routes/fpago');
const gruposRoutes = require('./routes/grupos');
const productosSubRouter = require('./routes/productos-sub');
const ventasAnuladasRoutes = require('./routes/ventas_anuladas');
const ventasDetalleRoutes = require('./routes/ventas_detalle');
const reportesRoutes = require('./routes/reportes');

const ventasCabRoutes = require('./routes/ventas_cab'); 
const ventasDetRoutes = require('./routes/ventas_det'); 
const ventasAuditoriaRoutes = require('./routes/ventas_auditoria'); 

const aperturasRoutes = require('./routes/aperturas');
const movimientosRoutes = require('./routes/movimientos');

const cierresRoutes = require("./routes/cierres");

const comprasCabRoutes = require("./routes/compras_cab");
const funcionesRoutes = require('./routes/funciones');

const PermiUsuariosRoutes = require('./routes/permisos-usuarios');

const auditoriaVentasRoutes = require('./routes/auditoria_ventas');
const auditoriaPreciosRoutes = require('./routes/auditoria-precios');

const comprasRoutes = require('./routes/compras');
const pedidosRoutes = require('./routes/pedidos');

const estadisticasRoutes = require('./routes/estadisticas');
const promocionesRoutes = require('./routes/promociones'); 
const ventasPromocionesRoutes = require('./routes/ventas_promociones');
const promocionesABMRouter = require('./routes/promociones-abm');



// ==========================================
//  Inicializar Express
// ==========================================
const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.json());

app.use(session({

    secret: 'mi-clave-secreta-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8
    }
}));
app.use(express.static('public'));

app.use('/heladeria-backend', express.static('heladeria-backend'));
app.use('/api/productos', productosRoutes);
app.use('/api/sabores', saboresRoutes);
app.use('/api/tipo-sabores', validarSesion, tipoSaboresRoutes);
app.use('/api/clientes', validarSesion, clientesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/permisos', validarSesion, permisosRoutes);
app.use('/api/fpago', validarSesion, fpagoRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/productos-sub', validarSesion, productosSubRouter);
app.use('/api/ventas-anuladas', ventasAnuladasRoutes);
app.use('/api/ventas-detalle', ventasDetalleRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/ventas_cab', ventasCabRoutes); 
app.use('/api/ventas_det', ventasDetRoutes); 
app.use('/api/ventas_auditoria', ventasAuditoriaRoutes);
app.use('/api/aperturas', aperturasRoutes);
app.use('/api/movimientos', movimientosRoutes);
app.use("/api/cierres", cierresRoutes);
app.use("/api/compras_cab", comprasCabRoutes);
app.use('/api/funciones', funcionesRoutes);

app.use('/api/permisos-usuarios', PermiUsuariosRoutes);
app.use('/api/auditoria-ventas', auditoriaVentasRoutes);
	
app.use('/api/auditoria-precios', auditoriaPreciosRoutes);

//app.use('/api/compras', require('./routes/compras'));
app.use('/api/compras', comprasRoutes);

app.use('/api/pedidos', pedidosRoutes);

app.use('/api/estadisticas', estadisticasRoutes);

app.use( '/api/promociones', promocionesRoutes );
app.use('/api/ventas_promociones',ventasPromocionesRoutes);
app.use('/api/promociones-abm',promocionesABMRouter);



app.get('/api/session', (req, res) => {
    if (!req.session.usuario) {
        return res.status(401).json({
            ok: false
        });
    }
    res.json({
        ok: true,
        usuario: req.session.usuario
    });
});
app.post('/api/logout', (req, res) => {

    req.session.destroy(() => {

        res.json({
            ok: true
        });
    });
});


function validarSesion(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({
            ok: false,
            error: 'Sesion no valida'
        });
    }
    next();
}


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
// PRODUCTOS / SABORES / FPAGO / GRUPOS (cache)
// ==========================================

let cacheProductos = [];
let cacheSabores = [];
let cacheFPago = [];
let cacheGrupos = [];
let cacheClientes = [];

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// ==========================================
// PRODUCTOS
// ==========================================

async function cargarProductos() {

  try {

    const [rows] = await db.query(`
      SELECT *
      FROM PRODUCTOS
      WHERE deshabilitado = 0
      ORDER BY descripcion
    `);

    cacheProductos = rows;

//    console.log("✅ Productos cacheados:", cacheProductos.length);

  } catch (err) {

    console.error("❌ ERROR cargando PRODUCTOS:", err.message);

  }
}

// ==========================================
// SABORES
// ==========================================

async function cargarSabores() {

  try {

    const [rows] = await db.query(`
      SELECT
        s.*,
        ts.descripcion AS desc_tipo_sabor
      FROM SABORES s
      LEFT JOIN TIPO_SABORES ts
        ON s.id_tipo_sabor = ts.id_tipo_sabor
      WHERE s.deshabilitado = 0
      ORDER BY s.descripcion
    `);

    cacheSabores = rows;

//    console.log("✅ Sabores cacheados MYSQL:", cacheSabores.length);

  } catch (err) {

    console.error("❌ ERROR cargando SABORES MYSQL:", err.message);

  }
}

// ==========================================
// FORMAS DE PAGO
// ==========================================

async function cargarFPago() {

  try {

    const [rows] = await db.query(`
      SELECT *
      FROM F_PAGO
      WHERE deshabilitado = 0
      ORDER BY id_fpago
    `);

    cacheFPago = rows;

//    console.log("✅ Formas de pago cacheadas MYSQL:", cacheFPago.length);

  } catch (err) {

    console.error("❌ ERROR cargando F_PAGO MYSQL:", err.message);

  }
}

// ==========================================
// GRUPOS
// ==========================================

async function cargarGrupos() {

  try {

    const [rows] = await db.query(`
      SELECT *
      FROM GRUPOS
      WHERE deshabilitado = 0
      ORDER BY descripcion
    `);

    cacheGrupos = rows;

//    console.log("✅ Grupos cacheados MYSQL:", cacheGrupos.length);

  } catch (err) {

    console.error("❌ ERROR cargando GRUPOS MYSQL:", err.message);

  }
}

// ==========================================
// CLIENTES
// ==========================================
async function cargarClientes() {

  try {

    const [rows] = await db.query(`
      SELECT *
      FROM CLIENTES
      WHERE deshabilitado = 0
      ORDER BY nombre
    `);

    cacheClientes = rows;

//    console.log("✅ Clientes cacheados MYSQL:", cacheClientes.length);

  } catch (err) {

    console.error("❌ ERROR cargando CLIENTES MYSQL:", err.message);

  }
}


// ==========================================
// CARGA INICIAL
// ==========================================

cargarProductos();
cargarSabores();
cargarFPago();
cargarGrupos();
cargarClientes();


// ==========================================
// RECARGA AUTOMÁTICA CADA 5 MINUTOS
// ==========================================

//setInterval(cargarProductosFirebase, CACHE_TTL);
//setInterval(cargarSaboresFirebase, CACHE_TTL);
//setInterval(cargarFPago, CACHE_TTL);
//setInterval(cargarGruposFirebase, CACHE_TTL);

// ==========================================
// ENDPOINTS CACHEADOS
// ==========================================

app.get("/api/productos", (req, res) => {
  res.json(cacheProductos);
});

app.get("/api/sabores", (req, res) => {
  res.json(cacheSabores);
});

app.get("/api/fpago", (req, res) => {
  res.json(cacheFPago);
});

app.get("/api/grupos", (req, res) => {
  res.json(cacheGrupos);
});

app.get("/api/clientes", (req, res) => {
  res.json(cacheClientes);
});



// ==========================================
// INICIAR SERVIDOR
// ==========================================
console.log("VERSION SERVER:", new Date().toISOString());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
});



