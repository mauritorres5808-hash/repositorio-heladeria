
verificarSesion();

const formateador = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

// Convertir yyyy-mm-dd → dd/mm/yyyy
function fechaToDMY(f) {
  const [yyyy, mm, dd] = f.split("-");
  return `${dd.padStart(2,"0")}/${mm.padStart(2,"0")}/${yyyy}`;
}

async function buscarCierres() {
  const desde = document.getElementById("fechaDesde").value;
  const hasta = document.getElementById("fechaHasta").value;
  const cont = document.getElementById("listaCierres");
  cont.innerHTML = "⏳ Buscando...";

  let query = db.collection("CIERRES_CAB");

  if (desde) query = query.where("fecha", ">=", fechaToDMY(desde));
  if (hasta) query = query.where("fecha", "<=", fechaToDMY(hasta));

  const snap = await query.orderBy("fecha", "desc").get();
  if (snap.empty) return cont.innerHTML = "<p>No se encontraron cierres.</p>";

  let html = `<table class="table table-striped">
                <thead><tr><th>ID cierre</th><th>Fecha Cierre</th><th>Hora Cierre</th><th>Usuario</th><th>Total</th><th></th></tr></thead><tbody>`;

  snap.forEach(d => {
    const c = d.data();
	
	//	let hora_grab = format_hora(c.fecha_hora_grabacion);
let hora_grab = c.fecha_hora_grabacion;

    html += `<tr>
              <td>${c.id_cierre}</td>
              <td>${c.fecha}</td>
              <td>${hora_grab}</td>
              <td>${c.usuario}</td>
              <td>${formateador.format(c.total_general)}</td>
              <td><button class="btn btn-sm btn-info" onclick="verDetalle(${c.id_cierre})">Ver</button></td>
            </tr>`;
  });

  html += "</tbody></table>";
  cont.innerHTML = html;
}

let detalleCierrePDF = null; // 🔹 guardará datos para exportar

async function verDetalle(idCierre) {

  // Traer cabecera del cierre
  const cabSnap = await db.collection("CIERRES_CAB").where("id_cierre","==",idCierre).limit(1).get();
  const cab = cabSnap.docs[0].data();

  // Formas de Pago
  const fpSnap = await db.collection("F_PAGO").get();
  const FP_MAP = {};
  fpSnap.forEach(f => FP_MAP[f.data().id_fpago] = `${f.data().descripcion}`);

  // Traer detalle
  const detSnap = await db.collection("CIERRES_DET").where("id_cierre","==",idCierre).get();

  let ventas = [];
  let ingresos = [];
  let egresos = [];
  let compras = [];

  detSnap.forEach(d => {
    const x = d.data();

    if (x.tipo === "VENTA") {
      ventas.push(x);
    }
    else if (x.tipo === "INGRESOS") {
      ingresos.push(x);
    }
    else if (x.tipo === "EGRESOS") {
      egresos.push(x);
    }
    else if (x.tipo === "COMPRAS") {
      compras.push(x);
    }
  });

  // Guardar para Exportar PDF
  detalleCierrePDF = { idCierre, cab, ventas, ingresos, egresos, compras };

  // ===== ARMADO DE HTML =====
 
	//let hora_grab = format_hora(cab.fecha_hora_grabacion);
let hora_grab = cab.fecha_hora_grabacion;
	
  let html = `<h4>ID Cierre: ${idCierre} - fecha: ${cab.fecha} - hora: ${hora_grab} <br> usuario: ${cab.usuario}</h4><hr>`;

  // --- Ventas ---
  html += `<div class="subtitulo">Ventas por Forma de Pago (y Tipo)</div>`;
  if (ventas.length > 0) {
    html += `<table class="table table-sm"><thead><tr><th>Forma de Pago</th><th>Total</th></tr></thead><tbody>`;
	let TOT_V = 0;
    ventas.forEach(v => {
		TOT_V += v.total; 
		let TipoVenta = "--indefinida--";
			if (v.id_tipo_venta === 1) TipoVenta = "Delivery propio";
			else if (v.id_tipo_venta === 2) TipoVenta = "Rappi";
			else if (v.id_tipo_venta === 3) TipoVenta = "PedidosYa";
			else if (v.id_tipo_venta === 4) TipoVenta = "Mostrador";
//      html += `<tr><td>${FP_MAP[v.id_fpago] || v.id_fpago}</td><td>${formateador.format(v.total)}</td></tr>`;
      html += `<tr><td>${FP_MAP[v.id_fpago] || v.id_fpago} (${TipoVenta})</td><td>${formateador.format(v.total)}</td></tr>`;
    });
      html += `<tr><td style="text-align:right"><b>TOTAL</td><td><b>${formateador.format(TOT_V)}</b></td></tr>`;

    html += `</tbody></table>`;
  } else {
    html += `<p>No hay ventas en este cierre.</p>`;
  }

  // --- Ingresos ---
  html += `<div class="subtitulo">Movimientos de Ingreso</div>`;
  if (ingresos.length > 0) {
    html += `<table class="table table-sm"><thead><tr><th>Total</th></tr></thead><tbody>`;
    ingresos.forEach(i => {
      html += `<tr><td>${formateador.format(i.total)}</td></tr>`;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p>No hay movimientos de ingreso.</p>`;
  }

  // --- Egresos ---
  html += `<div class="subtitulo">Movimientos de Egreso</div>`;
  if (egresos.length > 0) {
    html += `<table class="table table-sm"><thead><tr><th>Total</th></tr></thead><tbody>`;
    egresos.forEach(e => {
      html += `<tr><td>${formateador.format(e.total)}</td></tr>`;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p>No hay movimientos de egreso.</p>`;
  }

  // --- Compras ---
  html += `<div class="subtitulo">Compras</div>`;
  if (compras.length > 0) {
    html += `<table class="table table-sm"><thead><tr><th>Total</th></tr></thead><tbody>`;
    compras.forEach(e => {
      html += `<tr><td>${formateador.format(e.total)}</td></tr>`;
    });
    html += `</tbody></table>`;
  } else {
    html += `<p>No hay movimientos de compras.</p>`;
  }

  // Total General
        html += `<h3 style="margin-top:25px">💰 Total General: ${formateador.format(cab.total_general)}</h3>`;

  // Mostrar modal
  document.getElementById("detalleContenido").innerHTML = html;
 // new bootstrap.Modal(document.getElementById("modalDetalle")).show();
  document.getElementById("detalleModal").style.display = "flex";

}

	function format_hora(pFechaTimestamp) {
		let fecha_g = pFechaTimestamp.toDate();
		let hora_g = fecha_g.toLocaleTimeString("es-AR", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false
		});
	return hora_g;
	}

// exportar a PDF
async function exportarPDF() {
  if (!detalleCierrePDF) return alert("Primero abra un cierre.");

  const { idCierre, cab, ventas, ingresos, egresos, compras } = detalleCierrePDF;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;

  doc.setFontSize(14);
  doc.text(`Detalle del Cierre Nº ${idCierre}`, 10, y);
  y += 8;

		//let hora_grab = format_hora(cab.fecha_hora_grabacion);
let hora_grab = cab.fecha_hora_grabacion;

  doc.setFontSize(11);
  doc.text(`Fecha cierre: ${cab.fecha}`, 10, y);
  y += 6;
  doc.text(`Hora cierre: ${hora_grab}`, 10, y);
  y += 6;
  doc.text(`Usuario: ${cab.usuario}`, 10, y);

  y += 10;
  // --- Ventas ---
  doc.setFontSize(13);
  doc.text("Ventas por Forma de Pago (y Tipo):", 10, y);
  y += 6;


  // Formas de Pago
  const fpSnap = await db.collection("F_PAGO").get();
  const FP_MAP = {};
  fpSnap.forEach(f => FP_MAP[f.data().id_fpago] = `${f.data().descripcion}`);

  if (ventas.length > 0) {
	  	let TOT_V = 0;
    ventas.forEach(v => {
		TOT_V += v.total; 
		let TipoVenta = "--indefinida--";
			if (v.id_tipo_venta === 1) TipoVenta = "Delivery propio";
			else if (v.id_tipo_venta === 2) TipoVenta = "Rappi";
			else if (v.id_tipo_venta === 3) TipoVenta = "PedidosYa";
			else if (v.id_tipo_venta === 4) TipoVenta = "Mostrador";
      doc.setFontSize(11);
	  //let fp = FP_MAP[v.id_fpago] || v.id_fpago;
	  let fp = FP_MAP[v.id_fpago] || v.id_fpago;
	  
      doc.text(`${fp} (${TipoVenta})  ${formateador.format(v.total)}`, 14, y);
      y += 6;
    });
	      doc.text(`TOTAL      ${formateador.format(TOT_V)}`, 14, y);
      y += 6;

  } else {
    doc.text("No hay ventas en este cierre.", 14, y);
    y += 6;
  }

  y += 4;

  // --- Ingresos ---
  doc.setFontSize(13);
  doc.text("Movimientos de Ingresos:", 10, y);
  y += 6;

  if (ingresos.length > 0) {
    ingresos.forEach(i => {
      doc.setFontSize(11);
      doc.text(`${formateador.format(i.total)}`, 14, y);
      y += 6;
    });
  } else {
    doc.text("No hay ingresos registrados.", 14, y);
    y += 6;
  }

  y += 4;
  // --- Egresos ---
  doc.setFontSize(13);
  doc.text("Movimientos de Egresos:", 10, y);
  y += 6;

  if (egresos.length > 0) {
    egresos.forEach(e => {
      doc.setFontSize(11);
      doc.text(`${formateador.format(e.total)}`, 14, y);
      y += 6;
    });
  } else {
    doc.text("No hay egresos registrados.", 14, y);
    y += 6;
  }

  y += 4;
  // --- Compras ---
  doc.setFontSize(13);
  doc.text("Compras:", 10, y);
  y += 6;

  if (compras.length > 0) {
    compras.forEach(e => {
      doc.setFontSize(11);
      doc.text(`${formateador.format(e.total)}`, 14, y);
      y += 6;
    });
  } else {
    doc.text("No hay compras registradas.", 14, y);
    y += 6;
  }

  y += 10;
  // --- TOTAL GENERAL ---
  doc.setFontSize(14);
  doc.text(`TOTAL GENERAL: ${formateador.format(cab.total_general)}`, 10, y);

  doc.save(`Cierre_${idCierre}.pdf`);
}
