
verificarSesion();

const formateador = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

// Convertir yyyy-mm-dd → dd/mm/yyyy
function fechaToDMY(f) {
  if (!f) return "";
  // Si viene como objeto Date
  if (typeof f === "object") {
    f = f.toISOString().split("T")[0];
  }
  // Si viene como string ISO
  if (String(f).includes("T")) {
    f = String(f).split("T")[0];
  }
  const [yyyy, mm, dd] = String(f).split("-");
  return `${dd}/${mm}/${yyyy}`;
}


async function buscarCierres() {

  const desde = document.getElementById("fechaDesde").value;
  const hasta = document.getElementById("fechaHasta").value;

  const cont = document.getElementById("listaCierres");

  cont.innerHTML = "⏳ Buscando...";

  try {

    const response = await fetch(`/api/cierres/desde/${desde}/hasta/${hasta}`);
    const docs = await response.json();

    if (docs.length === 0) {
      cont.innerHTML = "<p>No se encontraron cierres.</p>";
      return;
    }

    let html = `
      <table>
        <thead>
          <tr>
            <th>ID cierre</th>
            <th>Fecha Cierre</th>
            <th>Hora Cierre</th>
            <th>Usuario</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
    `;

    docs.forEach(c => {
      html += `
        <tr>
          <td>${c.id_cierre}</td>
          <td>${fechaToDMY(c.fecha)}</td>
          <td>${c.hora}</td>
          <td>${c.usuario}</td>
          <td>${formateador.format(c.total_general)}</td>
          <td>
            <button onclick="verDetalle(${c.id_cierre})">
              Ver
            </button>
          </td>
        </tr>
      `;
    });

    html += "</tbody></table>";

    cont.innerHTML = html;

  } catch (error) {
    console.error(error);
    cont.innerHTML = `
      <p style="color:red">
        Error obteniendo cierres
      </p>
    `;
  }
}



let detalleCierrePDF = null; // 🔹 guardará datos para exportar

async function verDetalle(idCierre) {

  // CABECERA
  const responseCab = await fetch(`/api/cierres/${idCierre}`);
  const cab = await responseCab.json();

  // FORMAS DE PAGO
  const responseFP = await fetch("/api/fpago");
  const dataFP = await responseFP.json();

  const FP_MAP = {};

  dataFP.formasPago.forEach(f => {
    FP_MAP[f.id_fpago] = f.descripcion;
  });

  // DETALLE
  const responseDet = await fetch(`/api/cierres/${idCierre}/detalle`);
  const detalle = await responseDet.json();

  let ventas = [];
  let ingresos = [];
  let egresos = [];
  let compras = [];

  detalle.forEach(x => {

    if (x.tipo === "VENTAS") {
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
  detalleCierrePDF = {
    idCierre,
    cab,
    ventas,
    ingresos,
    egresos,
    compras
  };

  // ===== ARMADO HTML =====

  let html = `
    <h4>
      ID Cierre: ${idCierre}
      - fecha: ${fechaToDMY(cab.fecha)}
      - hora: ${cab.hora}
      <br>
      usuario: ${cab.usuario}
    </h4>
    <hr>
  `;

  // =========================
  // VENTAS
  // =========================
  html += `
    <div class="subtitulo">
      Ventas por Forma de Pago (y Tipo)
    </div>
  `;

  if (ventas.length > 0) {

    html += `
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Forma de Pago</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
    `;

    let TOT_V = 0;

    ventas.forEach(v => {

      TOT_V += parseFloat(v.total || 0);

      let TipoVenta = "--indefinida--";

      if (v.id_tipo_venta === 1) TipoVenta = "Delivery propio";
      else if (v.id_tipo_venta === 2) TipoVenta = "Rappi";
      else if (v.id_tipo_venta === 3) TipoVenta = "PedidosYa";
      else if (v.id_tipo_venta === 4) TipoVenta = "Mostrador";
      else if (v.id_tipo_venta === 5) TipoVenta = "Vtas OnLine";

      html += `
        <tr>
          <td>
            ${FP_MAP[v.id_fpago] || v.id_fpago}
            (${TipoVenta})
          </td>
          <td>
            ${formateador.format(v.total)}
          </td>
        </tr>
      `;
    });

    html += `
      <tr>
        <td style="text-align:right">
          <b>TOTAL</b>
        </td>
        <td>
          <b>${formateador.format(TOT_V)}</b>
        </td>
      </tr>
    `;

    html += `
        </tbody>
      </table>
    `;
  }
  else {
    html += `<p>No hay ventas en este cierre.</p>`;
  }

  // =========================
  // INGRESOS
  // =========================
  html += `
    <div class="subtitulo">
      Movimientos de Ingreso
    </div>
  `;

  if (ingresos.length > 0) {

    html += `
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
    `;

    ingresos.forEach(i => {

      html += `
        <tr>
          <td>${formateador.format(i.total)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
  }
  else {
    html += `<p>No hay movimientos de ingreso.</p>`;
  }

  // =========================
  // EGRESOS
  // =========================
  html += `
    <div class="subtitulo">
      Movimientos de Egreso
    </div>
  `;

  if (egresos.length > 0) {

    html += `
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
    `;

    egresos.forEach(e => {

      html += `
        <tr>
          <td>${formateador.format(e.total)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
  }
  else {
    html += `<p>No hay movimientos de egreso.</p>`;
  }

  // =========================
  // COMPRAS
  // =========================
  html += `
    <div class="subtitulo">
      Compras
    </div>
  `;

  if (compras.length > 0) {

    html += `
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
    `;

    compras.forEach(c => {

      html += `
        <tr>
          <td>${formateador.format(c.total)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;
  }
  else {
    html += `<p>No hay compras en este cierre.</p>`;
  }

  // =========================
  // TOTAL GENERAL
  // =========================
  html += `
    <h3 style="margin-top:25px">
      💰 Total General:
      ${formateador.format(cab.total_general)}
    </h3>
  `;

  // MOSTRAR MODAL
  document.getElementById("detalleContenido").innerHTML = html;
  document.getElementById("detalleModal").style.display = "flex";
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

  doc.setFontSize(11);
  doc.text(`Fecha cierre: ${fechaToDMY(cab.fecha)}`, 10, y);
  y += 6;
  doc.text(`Hora cierre: ${cab.hora}`, 10, y);
  y += 6;
  doc.text(`Usuario: ${cab.usuario}`, 10, y);

  y += 10;
  // --- Ventas ---
  doc.setFontSize(13);
  doc.text("Ventas por Forma de Pago (y Tipo):", 10, y);
  y += 6;


  // Formas de Pago
	const responseFP = await fetch("/api/fpago");
	const dataFP = await responseFP.json();
	const FP_MAP = {};
	dataFP.formasPago.forEach(f => {
	  FP_MAP[f.id_fpago] = f.descripcion;
	});


  if (ventas.length > 0) {
	  	let TOT_V = 0;
    ventas.forEach(v => {
		TOT_V += parseFloat(v.total || 0);
		let TipoVenta = "--indefinida--";
			if (v.id_tipo_venta === 1) TipoVenta = "Delivery propio";
			else if (v.id_tipo_venta === 2) TipoVenta = "Rappi";
			else if (v.id_tipo_venta === 3) TipoVenta = "PedidosYa";
			else if (v.id_tipo_venta === 4) TipoVenta = "Mostrador";
      doc.setFontSize(11);

	  let fp = FP_MAP[v.id_fpago] || v.id_fpago;
	  
      doc.text(`${fp} (${TipoVenta})   ${formateador.format(parseFloat(v.total || 0))}`, 14, y);
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
