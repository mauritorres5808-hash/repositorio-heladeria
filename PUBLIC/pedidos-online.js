// pedidos-online.js

let promocionesAplicadas = [];
let descuentoPromos = 0;
let totalFinalPromos = 0;

const formateadorMoneda = new Intl.NumberFormat(
  'es-AR',
  {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }
);

let grupos = [];
let productos = [];
let sabores = [];
let carrito = {};
let telefonoEmpresa = "";

// ==========================================
// CONFIGURACION DEL DELIVERY
// ==========================================
let configuracion = {
  costo_envio: 0,
  total_pedido: 0,
  distancia_maxima: 0
};


// =====================================================
// CARGA INICIAL
// =====================================================
async function cargarDatos() {

  const loading = document.getElementById("loadingMsg");

  if (loading) {
    loading.style.display = "block";
  }

  try {

    const [
      gRes,
      pRes,
      sRes,
      eRes
    ] = await Promise.all([

      fetch(`${API_BASE}/api/grupos`),
      fetch(`${API_BASE}/api/productos`),
      fetch(`${API_BASE}/api/sabores`),
      fetch(`${API_BASE}/api/empresa`)

    ]);

	const gData = await gRes.json();
	const pData = await pRes.json();
	const sData = await sRes.json();
	const eData = await eRes.json();

grupos = Array.isArray(gData)
  ? gData
  : (gData.grupos || []);

productos = Array.isArray(pData)
  ? pData
  : (pData.productos || []);

sabores = Array.isArray(sData)
  ? sData
  : (sData.sabores || []);

	telefonoEmpresa = eData.empresa?.telefono || eData.telefono || "";

	if (!Array.isArray(grupos)) grupos = [];
	if (!Array.isArray(productos)) productos = [];
	if (!Array.isArray(sabores)) sabores = [];


    carrito = {};

    productos.forEach(p => {
      carrito[p.id_producto] = [];
    });

    renderGrupos();
    renderProductos();
	await cargarConfiguracion();
    actualizarTotalUI();

    document.getElementById("loadingMsg").style.display = "none";

    const cont = document.getElementById("listaProductos");

    cont.innerHTML = "";

  } catch (err) {

    console.error("Error cargando datos:", err);

    document.getElementById("listaProductos").innerText =
      "Error cargando productos.";

    if (loading) {
      loading.innerText = "Error cargando productos.";
    }

  } finally {

    if (loading) {
      loading.style.display = "none";
    }

  }

}

// ==========================================
// cargar la CONFIGURACION DEL DELIVERY
// ==========================================
async function cargarConfiguracion() {

  try {
    const resp = await fetch('/api/configuraciones');
    configuracion = await resp.json();
  } catch (error) {
    console.error(
      "Error cargando configuración:",
      error
    );
  }
}

// =====================================================
// RENDER GRUPOS
// =====================================================
function renderGrupos() {

  const cmb = document.getElementById("cmbGrupo");

  cmb.innerHTML =
    `<option value="">-- Seleccione un grupo --</option>`;

  grupos
    .filter(g =>
      Number(g.deshabilitado || 0) === 0 &&
      Number(g.publica || 0) === 1
    )
    .forEach(g => {
      const opt = document.createElement("option");
      opt.value = g.id_grupo;
      opt.textContent = `${g.descripcion}`;
      cmb.appendChild(opt);
    });
}

// =====================================================
// OBTENER FILTROS
// =====================================================
function getGrupoSeleccionado() {
  const val = document.getElementById("cmbGrupo").value;
  return val === ""
    ? null
    : Number(val);
}

function getTextoBusqueda() {
  return (document.getElementById("txtBuscar").value || "").trim().toLowerCase();
}

// =====================================================
// calculo el costo de envio
// =====================================================
function calcularCostoEnvio(subtotal) {

  if (subtotal >= configuracion.total_pedido) {
    return 0;
  }
  return parseFloat( configuracion.costo_envio || 0 );
}


function obtenerProductosParaPromos(){

  const items = [];

  for (const p of productos){
    const unidades = carrito[p.id_producto] || [];

    if (unidades.length <= 0){
      continue;
    }

    items.push({
      id: p.id_producto,
      precio: Number(p.precio || 0),
      cantidad: unidades.length
    });
  }
  return items;
}

async function recalcularPromociones(){

  try {

    const productosPromo = obtenerProductosParaPromos();

    if (productosPromo.length === 0){
      promocionesAplicadas = [];
      descuentoPromos = 0;
      totalFinalPromos = 0;
      return;
    }

    const resp = await fetch(
      `${API_BASE}/api/promociones/calcular`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          productos: productosPromo
        })
      }
    );

    const data = await resp.json();

    if (!data.ok){
      return;
    }

    promocionesAplicadas = data.promocionesAplicadas || [];
    descuentoPromos = Number(data.descuentoPromos || 0);
    totalFinalPromos = Number(data.totalFinal || 0);

  } catch(err){
    console.error(
      "Error calculando promociones:",
      err
    );
  }
}


// =====================================================
// RENDER PRODUCTOS
// =====================================================


function renderProductos(){

  const cont = document.getElementById("listaProductos");

  cont.innerHTML = "";

  const idGrupo = getGrupoSeleccionado();

  const q = getTextoBusqueda();

const lista = productos.filter(p => {

  //if (Number(p.stock) <= 0) return false;
  if (Number(p.deshabilitado || 0) === 1) return false;
  if (Number(p.publica || 0) === 0) return false;

  if (q) {

    const text =
      (p.descripcion || "")
      .toString()
      .toLowerCase();

    return text.includes(q);
  }

  if (idGrupo !== null) {
    return Number(p.id_grupo) === idGrupo;
  }

  return false;
});


  if (lista.length === 0) {

    cont.innerHTML = `
      <div class="meta">
        No hay productos para mostrar.
      </div>
    `;

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

          <div>
            <b>
              ${p.descripcion}
            </b>
          </div>

          <div class="meta">

            ${formateadorMoneda.format(Number(p.precio || 0))}

            ${
              Number(p.sabores) === 1
                ? `• Hasta ${p.max_sabores} sabores`
                : ""
            }

          </div>

        </div>

        <div class="acciones-prod">

          <button
            class="agregar"
            type="button"
            onclick="agregarUnidad(${p.id_producto})">

            + Agregar unidad

          </button>

          <span
            id="count_${p.id_producto}"
            class="meta">

            ${
              carrito[p.id_producto]
                ? carrito[p.id_producto].length
                : 0
            }

            unidad/es

          </span>

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

// =====================================================
// AGREGAR / QUITAR
// =====================================================

function agregarUnidad(id_producto){

  if (!carrito[id_producto]) {
    carrito[id_producto] = [];
  }

  carrito[id_producto].push({
    sabores:[]
  });

  renderUnidades(id_producto);

  const el =
    document.getElementById("count_" + id_producto);

  if (el) {

    el.innerText =
      carrito[id_producto].length + " unidad/es";

  }

  actualizarTotalUI();
  actualizarCarritoUI();

}

function quitarUnidad(id_producto,index){

  if (!carrito[id_producto]) {
    return;
  }

  carrito[id_producto].splice(index,1);

  renderUnidades(id_producto);

  const el =
    document.getElementById("count_" + id_producto);

  if (el) {

    el.innerText =
      carrito[id_producto].length + " unidad/es";

  }

  actualizarTotalUI();
  actualizarCarritoUI();

}

// =====================================================
// DESC SABOR
// =====================================================

function descSabor(id){

  const s =
    sabores.find(x => x.id_sabor == id);

  return s
    ? s.descripcion
    : "";

}

// =====================================================
// RENDER UNIDADES
// =====================================================

function renderUnidades(id_producto){

  const cont =
    document.getElementById("unidades_" + id_producto);

  cont.innerHTML = "";

  const prod =
    productos.find(x => x.id_producto === id_producto);

  if (Number(prod.sabores) !== 1) {
    return;
  }

  carrito[id_producto].forEach((unidad,idx)=>{

    const div = document.createElement("div");

    div.className = "unidad";

    let html =
      `<div class="titulo">Unidad #${idx+1}</div>`;

    for (let s=1; s<=prod.max_sabores; s++){

      const sid =
        unidad.sabores[s-1] ?? "";

      html += `

        <div>

          <label>Sabor ${s}:</label>

          <select
            id="sel_${id_producto}_${idx}_${s-1}"
            onchange="onChangeSabor(${id_producto},${idx},${s-1})">

            <option value="">
              -- elegir --
            </option>

            ${sabores.map(sb => `

              <option
                value="${sb.id_sabor}"

                ${
                  String(sb.id_sabor) === String(sid)
                    ? 'selected'
                    : ''
                }>

                ${sb.descripcion}

              </option>

            `).join("")}

          </select>

        </div>

      `;

    }

    const elegidos =
      (unidad.sabores || [])
        .filter(x => x !== undefined && x !== "")
        .map(id => descSabor(id));

    if (elegidos.length > 0){

      html += `
        <div class="meta">
          <b>Elegidos:</b>
          ${elegidos.join(", ")}
        </div>
      `;

    }

    html += `

      <button
        class="quitar"
        type="button"
        onclick="quitarUnidad(${id_producto},${idx})">

        Quitar unidad

      </button>

    `;

    div.innerHTML = html;

    cont.appendChild(div);

  });

}

// =====================================================
// CAMBIO SABOR
// =====================================================

function onChangeSabor(id_producto,uIndex,sIndex){

  const el =
    document.getElementById(
      `sel_${id_producto}_${uIndex}_${sIndex}`
    );

  if (!el) return;

  const val = el.value;

  const unidad =
    (carrito[id_producto] || [])[uIndex];

  if (!unidad) return;

  if (val === "") {

    unidad.sabores[sIndex] = undefined;

  } else {

    unidad.sabores[sIndex] = Number(val);

  }

  renderUnidades(id_producto);

}

// =====================================================
// NORMALIZAR TELEFONO
// =====================================================

function normalizarTelefono(tel){

  tel = tel.replace(/\D/g,"");

  if (
    tel.startsWith("54911")
    && tel.length === 13
  ) {
    return "+" + tel;
  }

  if (
    tel.startsWith("911")
    && tel.length === 11
  ) {
    return "+54" + tel;
  }

  if (
    tel.startsWith("11")
    && tel.length === 10
  ) {
    return "+549" + tel;
  }

  return null;

}

// =====================================================
// VALIDACION TELEFONO
// =====================================================

function validarTelefonoUI(input){

  const msg =
    document.getElementById("telefonoMsg");

  let valor =
    input.value.replace(/\D/g,"");

  if (valor.length >= 2 && valor.length <= 6){

    input.value =
      valor.slice(0,2)
      + (valor.length > 2
          ? " " + valor.slice(2)
          : "");

  } else if (valor.length > 6){

    input.value =
      valor.slice(0,2)
      + " "
      + valor.slice(2,6)
      + " "
      + valor.slice(6);

  }

  const ok =
    normalizarTelefono(input.value);

  if (ok){

    input.style.borderColor = "green";

    msg.style.color = "green";

    msg.innerText =
      "✓ Número válido → " + ok;

  } else {

    input.style.borderColor = "red";

    msg.style.color = "#b00";

    msg.innerText =
      "Formato inválido. Ej: 11 3456 7890";

  }

}

// =====================================================
// TOTAL
// =====================================================

function calcularTotal(){

  let total = 0;

  for (const p of productos){
    const unidades = carrito[p.id_producto] || [];
    total += Number(p.precio || 0) * unidades.length;
  }
  return total;
}

async function actualizarTotalUI(){

  await recalcularPromociones();
  const subtotal = calcularTotal();

  const subtotalConPromos  =
    totalFinalPromos > 0
      ? totalFinalPromos
      : subtotal;

const costoEnvio = calcularCostoEnvio(subtotalConPromos);
const total = subtotalConPromos + costoEnvio;
  
  const tv = document.getElementById("totalValor");

  if (tv){
    tv.innerText = formateadorMoneda.format(total);
  }

  actualizarCarritoUI();
}


// =====================================================
// CARRITO VISUAL
// =====================================================

function actualizarCarritoUI(){

  const cont = document.getElementById("carritoItems");

  cont.innerHTML = "";

  let any = false;

  let total = 0;

  for (const p of productos){

    const unidades = carrito[p.id_producto] || [];

    if (!unidades || unidades.length === 0){
      continue;
    }

    any = true;

    const div = document.createElement("div");

    div.className = "carrito-item";

    const qty = unidades.length;

    const subtotal = qty * Number(p.precio || 0);

    total += subtotal;

    const left = document.createElement("div");

    left.innerHTML = `
      <div style="font-weight:600">
        ${p.descripcion}
      </div>
      <div class="meta">
        ${qty}
        ×
        ${formateadorMoneda.format(Number(p.precio || 0))}
        =
        ${formateadorMoneda.format(subtotal)}
      </div>
    `;

    const right = document.createElement("div");

    right.className = "carrito-controls";

    right.innerHTML = `
      <button
        onclick="quitarUnidad(${p.id_producto},${Math.max(0,unidades.length-1)})">
        -
      </button>
      <button onclick="agregarUnidad(${p.id_producto})">
        +
      </button>
    `;

    div.appendChild(left);
    div.appendChild(right);

    cont.appendChild(div);

  }

  if (!any){
    cont.innerHTML = "No hay productos seleccionados.";
  }
  
  			  //muestro el subtotal (sin promos)
			  const SubtotDiv = document.createElement("div");
			  SubtotDiv.style.marginTop = "10px";
			  SubtotDiv.innerHTML = `
				<hr>
				<div style="
				  color:#666;
				  font-weight:bold;
				">
				  - Subtotal:
				  ${formateadorMoneda.format(total)}
				</div>
			  `;
			  cont.appendChild(SubtotDiv);
			  //---------------
  
  
		// =====================================
		// PROMOCIONES aplicadas
		// =====================================
		if (promocionesAplicadas.length > 0){
		  const promoDiv = document.createElement("div");

		  promoDiv.style.marginTop = "10px";
		  promoDiv.innerHTML = `
			  <hr>
			  <div style="
				color:green;
				font-weight:bold;
				margin-bottom:6px;
			  ">
				🎁 Promociones aplicadas
			  </div>
			  ${
				promocionesAplicadas.map(p => `
				  <div style="
					font-size:13px;
					margin-bottom:4px;
				  ">
					✔ ${p.descripcion}
					(-${formateadorMoneda.format(p.descuento)})
				  </div>
				`).join("")
			  }
			  <div style="
				margin-top:8px;
				font-weight:bold;
				color:#c0392b;
			  ">
				Descuento total:
				${formateadorMoneda.format(descuentoPromos)}
			  </div>
			`;
		  cont.appendChild(promoDiv);

  			  //muestro el subtotal (CON promos)
			  const SubtotDiv2 = document.createElement("div");
			  SubtotDiv2.style.marginTop = "10px";
			  SubtotDiv2.innerHTML = `
				<hr>
				<div style="
				  color:#666;;
				  font-weight:bold;
				">
				  - Subtotal:
				  ${formateadorMoneda.format(totalFinalPromos)}
				</div>
			  `;
			  cont.appendChild(SubtotDiv2);
			  //---------------

		}

		const subtotalPromos =
		  totalFinalPromos > 0
			? totalFinalPromos
			: total;

		const costoEnvio = calcularCostoEnvio(subtotalPromos);
		const totalMostrar = subtotalPromos + costoEnvio;
  
			  //muestro costo de envio
			  const envioDiv = document.createElement("div");
			  envioDiv.style.marginTop = "10px";
			  envioDiv.innerHTML = `
				<hr>
				<div style="
				  color:#e67e22;
				  font-weight:bold;
				">
				  🚚 Costo de envío:
				  ${formateadorMoneda.format(costoEnvio)}
				</div>
			  `;
			  cont.appendChild(envioDiv);
			  //---------------
  
		document.getElementById("carritoTotal").innerText = formateadorMoneda.format(totalMostrar);

}

// =====================================================
// VALIDAR SABORES
// =====================================================

function validarSabores(){

  for (const p of productos){

    const unidades =
      carrito[p.id_producto] || [];

    if (!unidades || unidades.length === 0){
      continue;
    }

    if (Number(p.sabores) !== 1){
      continue;
    }

    for (const unidad of unidades){

      const elegidos =
        (unidad.sabores || [])
          .filter(x => x !== undefined && x !== "");

      if (elegidos.length === 0){

        alert(
          `⚠ El producto "${p.descripcion}" requiere al menos 1 sabor por unidad.`
        );

        return false;

      }

    }

  }

  return true;

}

// =====================================================
// VALIDAR DIRECCION
// =====================================================

async function validarDireccionBackend(direccion){

  try {

    const resp = await fetch(
      `${API_BASE}/api/verificar-direccion`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          direccion
        })
      }
    );

    const data = await resp.json();

    return data.ok;

  } catch(err){

    console.error(
      "Error verificando dirección:",
      err
    );

    return false;

  }

}

// =====================================================
// ENVIAR PEDIDO
// =====================================================
async function enviarPedido(){

  const nombre = document.getElementById("nombre").value.trim();
  const domicilio = document.getElementById("domicilio").value.trim();
  const nota = document.getElementById("nota").value.trim();
  const pagaCon = document.getElementById("paga_con").value.trim();
  const tel = normalizarTelefono(document.getElementById("telefono").value);
  const domLower = domicilio.toLowerCase();

  if (!(domLower.endsWith("bs as") || domLower.endsWith("caba")))
  {
    alert("El domicilio debe terminar con Bs As o CABA");
    return;
  }

  if ( !nombre || !domicilio || !tel || !pagaCon ){
    alert("Complete nombre, domicilio, teléfono y cómo piensa pagar.");
    return;
  }

/*
  const direccionOk = await validarDireccionBackend(domicilio);

  if (!direccionOk){
    const seguir = confirm("No pudimos verificar la dirección.\n¿Deseás continuar igualmente?");
    if (!seguir){
      return;
    }
  }
*/

  if (!validarSabores()){
    return;
  }



const pedidoBackend = [];
// =====================================
// ITEMS DETALLE
// =====================================
for (const p of productos){

  const unidades = carrito[p.id_producto];

  if (!unidades || unidades.length === 0){
    continue;
  }

  for (const unidad of unidades){

    const item = {
      id_producto: p.id_producto,
      descripcion: p.descripcion,
      precio: Number(p.precio || 0)

    };

    if (Number(p.sabores) === 1){

      const sids =
        (unidad.sabores || [])
          .map(s => {

            if (
              s === ""
              || s === undefined
              || s === null
            ){
              return null;
            }

            return Number(s);

          })

          .filter(s =>
            s !== null
            && !Number.isNaN(s)
          );

      item.sabores = sids;

    } else {

      item.sabores = [];

    }

    pedidoBackend.push(item);

  }

}

// =====================================
// AGRUPAR PRODUCTOS PARA PROMOS
// =====================================
const productosPromo = [];

for (const p of productos){

  const unidades =
    carrito[p.id_producto] || [];

  if (unidades.length === 0){
    continue;
  }

  productosPromo.push({

    id: p.id_producto,
    cantidad: unidades.length,
    precio: Number(p.precio || 0)

  });

}

// =====================================
// CALCULAR PROMOCIONES
// =====================================
let descuentoPromos = 0;
let promocionesAplicadas = [];
let totalFinal = calcularTotal();
let costoEnvio = 0;

try {

  const promoResp = await fetch(
    `${API_BASE}/api/promociones/calcular`,
    {
      method: "POST",
      headers: {
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        productos: productosPromo
      })
    }
  );

  const promoData = await promoResp.json();

  if (promoData.ok){
    descuentoPromos = Number(promoData.descuentoPromos || 0);
    promocionesAplicadas = promoData.promocionesAplicadas || [];
    totalFinal = Number(promoData.totalFinal || 0);
  }
  
  costoEnvio = calcularCostoEnvio(totalFinal);
  totalFinal = totalFinal + costoEnvio;

} catch(err){
  console.error("Error calculando promociones:",err);
}


  if (pedidoBackend.length === 0){
    alert("Debe agregar al menos 1 producto.");
    return;
  }

  try {

    const r = await fetch(`${API_BASE}/api/pedidos`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({
          nombre,
          domicilio,
          telefono: tel,
          nota,
          paga_con: pagaCon,
          detalle: pedidoBackend,
		  descuento_promociones: descuentoPromos, 
		  promociones_aplicadas: promocionesAplicadas,
		  costo_envio: costoEnvio,		  
		  total_final: totalFinal
        })

      }
    );

    const data = await r.json();

    if (!data.ok){
      alert("Error guardando el pedido: " + (data.error || ""));
      return;
    }

    mostrarMensajeFinal(data.id_pedido);

    resetAll();

  } catch(err){
    console.error("Error enviando pedido:", err);
    alert("Error enviando el pedido.");
  }

}

// =====================================================
// MENSAJE FINAL
// =====================================================

function mostrarMensajeFinal(idPedido){
  window.idPedidoActual = idPedido;
  window.nombreClienteActual = document.getElementById("nombre").value.trim();
  window.pagaConActual = document.getElementById("paga_con").value.trim();
  document.getElementById("nroPedido").innerHTML = `N° de Pedido: ${idPedido}`;
  document.getElementById("mensajeFinal").style.display = "block";
}

function aceptarPedido(){

  const idPedido = window.idPedidoActual;
  const nombre = window.nombreClienteActual;
  const pagaCon = window.pagaConActual;
//  const mensaje =`Hola soy *${nombre}* mi pedido es el *Nro ${idPedido}* y pago con *${pagaCon}*`;
//  const mensaje = `👋 Hola soy *${nombre}* 🧾 Mi pedido es el *Nro ${idPedido}* 💰 Pago con: *${pagaCon}*`;
  const mensaje = `*Nuevo Pedido*\n► Hola soy *${nombre}*\n► Mi pedido es el *Nro: ${idPedido}*\n► Pago con: *${pagaCon}*`;
  
  const mensajeCodificado = encodeURIComponent(mensaje);
  const numeroEmpresa = telefonoEmpresa;

  if (!numeroEmpresa){
    alert(
      "No se pudo obtener el teléfono de la empresa."
    );
    return;
  }

  // =====================================
  // DETECTAR si es CELULAR
  // =====================================
  const esMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  let url = "";

  if (esMovil) {
	  // CELULAR  ===================================
    url =`https://wa.me/${numeroEmpresa}?text=${mensajeCodificado}`;
  } else {
    // PC =====================================
    url =`https://web.whatsapp.com/send?phone=${numeroEmpresa}&text=${mensajeCodificado}`;
  }

//  const url = `https://wa.me/${numeroEmpresa}?text=${mensajeCodificado}`;
//  window.open(url,"_blank");
  // abrir en misma pestaña
  window.location.href = url;

  cerrarMensajeFinal();
}


function cerrarMensajeFinal(){
  document.getElementById("mensajeFinal").style.display = "none";
}

// =====================================================
// RESET
// =====================================================

function resetAll(){

  document.getElementById("formPedido").reset();
  const cont = document.getElementById("listaProductos");
  cont.innerHTML = "";
  carrito = {};
  productos.forEach(p => {
    carrito[p.id_producto] = [];
  });
  actualizarTotalUI();
}

// =====================================================
// EVENTOS
// =====================================================

function onGrupoChange(){

  renderProductos();

}


/*
document.getElementById("btnValidarDom").onclick =
async () => {

  const dom =
    document.getElementById("domicilio").value.trim();

  const msg =
    document.getElementById("msgValidacionDom");

  if (!dom){

    msg.style.color = "red";

    msg.textContent =
      "Ingrese un domicilio para validar.";

    return;

  }

  msg.style.color = "blue";

  msg.textContent =
    "Validando domicilio...";

  const ok =
    await validarDireccionBackend(dom);

  if (ok){

    msg.style.color = "green";

    msg.textContent =
      "✓ Domicilio válido";

  } else {

    msg.style.color = "red";

    msg.textContent =
      "✗ No se pudo verificar la dirección";

  }

};
*/

// =====================================================
// INICIO
// =====================================================

cargarDatos();
