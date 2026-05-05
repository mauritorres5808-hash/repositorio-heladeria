// pedidos-online.js

const formateadorMoneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS',   minimumFractionDigits: 0, maximumFractionDigits: 0 });

let grupos = [];
let productos = [];
let sabores = [];
let carrito = {}; // { id_producto: [ { sabores: [] }, ... ] }

// ------------------ carga inicial ------------------
async function cargarDatos() {

  const loading = document.getElementById("loadingMsg");
  if (loading) loading.style.display = "block";

  // cargar grupos, productos y sabores
  try {
    const [gRes, pRes, sRes] = await Promise.all([
      fetch(`${API_BASE}/api/grupos`),
      fetch(`${API_BASE}/api/productos`),
      fetch(`${API_BASE}/api/sabores`)
    ]);

    grupos = await gRes.json();
    productos = await pRes.json();
    sabores = await sRes.json();

    // inicializar carrito (vacío para cada producto existente)
    carrito = {};
    productos.forEach(p => carrito[p.id_producto] = []);

    renderGrupos();
    renderProductos();
    actualizarTotalUI();

document.getElementById("loadingMsg").style.display = "none";
	
const cont = document.getElementById("listaProductos");
cont.innerHTML = "";
  } catch (err) {
    console.error("Error cargando datos:", err);
    document.getElementById("listaProductos").innerText = "Error cargando productos.";
	  if (loading) loading.innerText = "Error cargando productos.";
    return;
  } finally {
    // 👇 SIEMPRE se ejecuta, haya error o no
    if (loading) loading.style.display = "none";
  }
}

// ------------------ render grupos ------------------
function renderGrupos() {
  const cmb = document.getElementById("cmbGrupo");
  cmb.innerHTML = `<option value="">-- Seleccione un grupo --</option>`;

  grupos
    .filter(g => (String(g.deshabilitado).toUpperCase() === "N" || g.deshabilitado === undefined) && (String(g.publica).toUpperCase() === "S" || g.deshabilitado === undefined) )
    .forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id_grupo;
      opt.textContent = `${g.id_grupo} - ${g.descripcion}`;
      cmb.appendChild(opt);
    });
}

// ------------------ obtener filtro actual ------------------
function getGrupoSeleccionado() {
  const val = document.getElementById("cmbGrupo").value;
  return val === "" ? null : Number(val);
}

function getTextoBusqueda() {
  return (document.getElementById("txtBuscar").value || "").trim().toLowerCase();
}

// ------------------ render productos (filtrados por grupo y búsqueda) ------------------
function renderProductos(){
  const cont = document.getElementById("listaProductos");
  cont.innerHTML = "";

  const idGrupo = getGrupoSeleccionado();
  const q = getTextoBusqueda();

	const lista = productos.filter(p => {

	// 🛑 PRIMERO: filtrar por stock
	  if (Number(p.stock) <= 0) return false;
  
	  // 🔴 CASO 1: hay texto de búsqueda → manda el texto (independiente del grupo)
	  if (q) {
		const text = (p.descripcion || "").toString().toLowerCase();
		return text.includes(q);
	  }

	  // 🟡 CASO 2: NO hay texto → usar SOLO el grupo
	  if (idGrupo !== null) {
		return Number(p.id_grupo) === idGrupo;
	  }

	  // ⚫ CASO 3: no hay nada → no mostrar nada
	  return false;
	});

  // si no hay grupo seleccionado mostrar mensaje
  if (lista.length === 0) {
    cont.innerHTML = `<div class="meta">No hay productos para mostrar. Seleccioná otro grupo o escribe en la búsqueda.</div>`;
    actualizarTotalUI();
    actualizarCarritoUI();
    return;
  }

  lista.forEach(p => {
    const box = document.createElement("div");
    box.className = "producto";

    box.innerHTML = `
      <div class="header">
        <div>
          <div><b>${p.id_producto} - ${p.descripcion}</b></div>
          <div class="meta">${formateadorMoneda.format(p.precio)} ${p.sabores==='S' ? '• Hasta ' + p.max_sabores + ' sabores' : ''}</div>
        </div>
        <div class="acciones-prod">
          <button class="agregar" type="button" onclick="agregarUnidad(${p.id_producto})">+ Agregar unidad</button>
          <span id="count_${p.id_producto}" class="meta">${carrito[p.id_producto] ? carrito[p.id_producto].length : 0} unidad/es</span>
        </div>
      </div>
      <div id="unidades_${p.id_producto}"></div>
    `;

    cont.appendChild(box);
    renderUnidades(p.id_producto);
  });

  actualizarTotalUI();
  actualizarCarritoUI();
}

// ------------------ agregar / quitar unidad ------------------
function agregarUnidad(id_producto){
  if (!carrito[id_producto]) carrito[id_producto] = [];
  carrito[id_producto].push({ sabores: [] });
  renderUnidades(id_producto);
  const el = document.getElementById("count_" + id_producto);
  if (el) el.innerText = carrito[id_producto].length + " unidad/es";
  actualizarTotalUI();
  actualizarCarritoUI();
}

function quitarUnidad(id_producto, index){
  if (!carrito[id_producto]) return;
  carrito[id_producto].splice(index,1);
  renderUnidades(id_producto);
  const el = document.getElementById("count_" + id_producto);
  if (el) el.innerText = carrito[id_producto].length + " unidad/es";
  actualizarTotalUI();
  actualizarCarritoUI();
}

function descSabor(id) {
  const s = sabores.find(x => x.id_sabor == id);
  return s ? s.descripcion : "";
}

// ------------------ render unidades ------------------
function renderUnidades(id_producto){
  const cont = document.getElementById("unidades_" + id_producto);
  cont.innerHTML = "";

  const prod = productos.find(x => x.id_producto === id_producto);

  // ----------------------------------------------------
  // ⚠ SI EL PRODUCTO NO REQUIERE SABORES → NO MOSTRAR NADA
  // ----------------------------------------------------
  if (prod.sabores !== "S") {
    // No renderizamos nada de unidades
    return;
  }

  // ----------------------------------------------------
  // 🔽 EL PRODUCTO SÍ REQUIERE SABORES
  // ----------------------------------------------------
  carrito[id_producto].forEach((unidad, idx) => {
    const div = document.createElement("div");
    div.className = "unidad";

    let html = `<div class="titulo">Unidad #${idx+1}</div>`;

    // Dibujar selects de sabores
    for (let s = 1; s <= prod.max_sabores; s++) {
      const sid = unidad.sabores[s-1] ?? "";

      html += `
        <div>
          <label>Sabor ${s}:</label>
          <select id="sel_${id_producto}_${idx}_${s-1}"
                  onchange="onChangeSabor(${id_producto},${idx},${s-1})">
            <option value="">-- elegir --</option>
            ${sabores.map(sb => `
              <option value="${sb.id_sabor}" 
                      ${String(sb.id_sabor)===String(sid)?'selected':''}>
                ${sb.descripcion}
              </option>`).join("")}
          </select>
        </div>`;
    }

    // mostrar lista de sabores elegidos
    const elegidos = (unidad.sabores || [])
      .filter(x => x !== undefined && x !== "")
      .map(id => descSabor(id));

    if (elegidos.length > 0) {
      html += `<div class="meta"><b>Elegidos:</b> ${elegidos.join(", ")}</div>`;
    }

    // botón quitar unidad
    html += `
      <button class="quitar" type="button" onclick="quitarUnidad(${id_producto},${idx})">
        Quitar unidad
      </button>`;

    div.innerHTML = html;
    cont.appendChild(div);
  });

  actualizarTotalUI();
}


// ------------------ onChange sabor ------------------
function onChangeSabor(id_producto, uIndex, sIndex){
  const el = document.getElementById(`sel_${id_producto}_${uIndex}_${sIndex}`);
  if (!el) return;
  const val = el.value;

  const unidad = (carrito[id_producto] || [])[uIndex];
  if (!unidad) return;

  if (val === "") unidad.sabores[sIndex] = undefined;
  else unidad.sabores[sIndex] = Number(val);
  
  // refrescar vista con nombres
  renderUnidades(id_producto);
}

// ------------------ normalizar teléfono ------------------
function normalizarTelefono(tel) {
  tel = tel.replace(/\D/g, "");

  if (tel.startsWith("54911") && tel.length === 13) return "+" + tel;
  if (tel.startsWith("911") && tel.length === 11) return "+54" + tel;
  if (tel.startsWith("11") && tel.length === 10) return "+549" + tel;

  return null;
}

// ------------------ validación tel UI ------------------
function validarTelefonoUI(input) {
  const msg = document.getElementById("telefonoMsg");
  let valor = input.value.replace(/\D/g, "");

  if (valor.length >= 2 && valor.length <= 6)
    input.value = valor.slice(0,2) + (valor.length>2 ? " " + valor.slice(2) : "");
  else if (valor.length > 6)
    input.value = valor.slice(0,2) + " " + valor.slice(2,6) + " " + valor.slice(6);

  const ok = normalizarTelefono(input.value);

  if (ok) {
    input.style.borderColor = "green";
    msg.style.color = "green";
    msg.innerText = "✓ Número válido → " + ok;
  } else {
    input.style.borderColor = "red";
    msg.style.color = "#b00";
    msg.innerText = "Formato inválido. Ej: 11 3456 7890";
  }
}

// ------------------ total ------------------
function calcularTotal() {
  let total = 0;
  for (const p of productos) {
    const unidades = carrito[p.id_producto] || [];
    total += (p.precio || 0) * unidades.length;
  }
  return total;
}

function actualizarTotalUI() {
  const tv = document.getElementById("totalValor");
  if (tv) tv.innerText = calcularTotal();
  actualizarCarritoUI();
}

// ------------------ actualizar carrito visual (lateral) ------------------
function actualizarCarritoUI() {
  const cont = document.getElementById("carritoItems");
  cont.innerHTML = "";

  let any = false;
  let total = 0;

  for (const p of productos) {
    const unidades = carrito[p.id_producto] || [];
    if (!unidades || unidades.length === 0) continue;
    any = true;

    const div = document.createElement("div");
    div.className = "carrito-item";

    const qty = unidades.length;
    const subtotal = qty * (p.precio || 0);
    total += subtotal;

    const left = document.createElement("div");
    left.innerHTML = `<div style="font-weight:600">${p.descripcion}</div>
                      <div class="meta">${qty} × ${formateadorMoneda.format(p.precio)} = ${formateadorMoneda.format(subtotal)}</div>`;

    const right = document.createElement("div");
    right.className = "carrito-controls";
    right.innerHTML = `
      <button onclick="agregarUnidad(${p.id_producto})" title="Agregar +">+</button>
      <button onclick="quitarUnidad(${p.id_producto}, ${Math.max(0, unidades.length-1)})" title="Quitar última">-</button>
    `;

    div.appendChild(left);
    div.appendChild(right);
    cont.appendChild(div);
  }

  if (!any) {
    cont.innerHTML = "No hay productos seleccionados.";
  }

  document.getElementById("carritoTotal").innerText = formateadorMoneda.format(total);
  document.getElementById("totalValor").innerText = total;
}

// ------------------ VALIDACIÓN SABORES (solo para productos en el carrito) ------------------
function validarSabores() {
  for (const p of productos) {
    const unidades = carrito[p.id_producto] || [];
    if (!unidades || unidades.length === 0) continue;
    if (p.sabores !== "S") continue;

    for (const unidad of unidades) {
      const elegidos = (unidad.sabores || []).filter(x => x !== undefined && x !== "");
      if (elegidos.length === 0) {
        alert(`⚠ El producto "${p.descripcion}" requiere al menos 1 sabor por unidad.`);
        return false;
      }
    }
  }
  return true;
}

// ------------------ VALIDAR DIRECCIÓN (via backend) ------------------
async function validarDireccionBackend(direccion) {
  try {
    const resp = await fetch(`${API_BASE}/api/verificar-direccion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direccion })
    });

    const data = await resp.json();
    return data.ok;

  } catch (err) {
    console.error("Error verificando dirección:", err);
    return false;
  }
}



// ------------------ enviar pedido ------------------
async function enviarPedido(){
  const nombre = document.getElementById("nombre").value.trim();
  const domicilio = document.getElementById("domicilio").value.trim();
  
  const domLower = domicilio.toLowerCase();

if (!(domLower.endsWith("bs as") || domLower.endsWith("caba"))) {
  alert("El domicilio debe terminar con 'Bs As' o 'CABA'.\nEj: Av Triunvirato 123, CABA");
  return;
}

const pagaCon = document.getElementById("paga_con").value.trim();
  const nota = document.getElementById("nota").value.trim();
  const tel = normalizarTelefono(document.getElementById("telefono").value);

	if (!nombre || !domicilio || !tel || !pagaCon) {
	  alert("Complete nombre, domicilio, teléfono y cómo piensa pagar.");
	  return;
	}

	// Validar domicilio con backend
	const direccionOk = await validarDireccionBackend(domicilio);

	if (!direccionOk) {
	  const seguir = confirm(
		"No pudimos verificar la dirección.\n" +
		"¿Deseás continuar igualmente?"
	  );
	  if (!seguir) return;
	}


  if (!validarSabores()) return;

  // construir array final de items (cada unidad -> 1 item)
  const pedidoBackend = [];
  for (const p of productos) {
    const unidades = carrito[p.id_producto];
    if (!unidades || unidades.length === 0) continue;

    for (const unidad of unidades) {
      const item = {
        id_producto: p.id_producto,
        descripcion: p.descripcion,
        precio: p.precio
      };

      if (p.sabores === "S") {
        const sids = (unidad.sabores || [])
          .map(s => (s === "" || s === undefined || s === null) ? null : Number(s))
          .filter(s => s !== null && !Number.isNaN(s));
        item.sabores = sids;
      } else {
        item.sabores = [];
      }

      pedidoBackend.push(item);
    }
  }

  if (pedidoBackend.length === 0) {
    alert("Debe agregar al menos 1 producto.");
    return;
  }

  try {
    let r = await fetch(`${API_BASE}/whatsapp/pedido`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ nombre, domicilio, telefono:tel, nota, paga_con: pagaCon, pedido:pedidoBackend })
    });
    let data = await r.json();

    if (!data.ok) {
      alert("Error guardando el pedido: " + (data.error || JSON.stringify(data)));
      return;
    }

    mostrarMensajeFinal(data.idPedido);
    resetAll();
  } catch (err) {
    console.error("Error enviando pedido:", err);
    alert("Error enviando el pedido. Revisa la consola.");
  }
}

// ------------------ mensaje final ------------------
function mostrarMensajeFinal(idPedido) {

	// guardar el id para usar después
	window.idPedidoActual = idPedido;
	window.nombreClienteActual = document.getElementById("nombre").value.trim();
	window.pagaConActual = document.getElementById("paga_con").value.trim();

	document.getElementById("nroPedido").innerHTML = `N° de Pedido: ${idPedido}`;
	document.getElementById("mensajeFinal").style.display = "block";
}

function aceptarPedido() {

	const idPedido = window.idPedidoActual;
	const nombre = window.nombreClienteActual;
	const pagaCon = window.pagaConActual;
	const mensaje = `Hola soy *${nombre}*, mi pedido es el Nro *${idPedido}*.\nPago con: *${pagaCon}*`;
	const mensajeCodificado = encodeURIComponent(mensaje);
	const numeroEmpresa = "5491134692013"; // <-- tu número
	const url = `https://wa.me/${numeroEmpresa}?text=${mensajeCodificado}`;

	// 👉 esto ahora NO se bloquea
	window.open(url, "_blank");

	// cerrar popup
	cerrarMensajeFinal();
}


function cerrarMensajeFinal() {
  document.getElementById("mensajeFinal").style.display = "none";
}

// ------------------ reset formulario ------------------
function resetAll() {
  document.getElementById("formPedido").reset();
const cont = document.getElementById("listaProductos");
cont.innerHTML = "";
  
  carrito = {};
  productos.forEach(p => carrito[p.id_producto] = []);
  //renderProductos();
  actualizarTotalUI();
}

// ------------------ evento cambio grupo ------------------
function onGrupoChange() {
  renderProductos();
}



document.getElementById("btnValidarDom").onclick = async () => {
    const dom = document.getElementById("domicilio").value.trim();
    const msg = document.getElementById("msgValidacionDom");

    if (!dom) {
        msg.style.color = "red";
        msg.textContent = "Ingrese un domicilio para validar.";
        return;
    }

    msg.style.color = "blue";
    msg.textContent = "Validando domicilio...";

    const ok = await validarDireccionBackend(dom);

    if (ok) {
        msg.style.color = "green";
        msg.textContent = "✓ Domicilio válido";
    } else {
        msg.style.color = "red";
        msg.textContent = "✗ No se pudo verificar la dirección";
    }
};


// ------------------ inicia todo ------------------
cargarDatos();
