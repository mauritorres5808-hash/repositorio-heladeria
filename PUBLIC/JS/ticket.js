async function generarComprobanteTermicoPDF(
  idVenta, cabecera, productos,
  fp1, fp2, imp1, imp2,
  pempresa, tipoVenta
) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: [58, 200] });

  let y = 5;

  let TipoVtaNom = '';
  if (tipoVenta === 1) TipoVtaNom = 'Delivery propio';
  if (tipoVenta === 2) TipoVtaNom = 'Rappi';
  if (tipoVenta === 3) TipoVtaNom = 'Pedidos Ya';
  if (tipoVenta === 4) TipoVtaNom = 'Mostrador';
  if (tipoVenta === 5) TipoVtaNom = 'Vta Online';

  doc.setFontSize(8);
  doc.text(pempresa, 0, y);

  y += 4;
  doc.setFontSize(9);
  doc.text("TICKET", 1, y);
  doc.setFontSize(6);
  doc.text("(" + TipoVtaNom + ")", 14, y);

  y += 5;
  doc.setFontSize(7);
  doc.text(`Venta N°: ${idVenta}`, 1, y);

  y += 4;
  doc.text(`${cabecera.fecha}`, 1, y);
  doc.text(`${cabecera.hora}`, 14, y);

  y += 4;
  doc.text("=============================", 0, y);

  y += 4;
  doc.setFontSize(5);
  doc.text("Cod  Descripcion", 0, y);

  y += 3;
  doc.text("Cant  P.Unit  Subtotal", 0, y);

  y += 3;

  productos.forEach(p => {
    doc.text(`${String(p.id).substring(0,6)} ${p.nombre.substring(0,25)}`, 0, y);
    y += 3;
    doc.text(`${p.cantidad} x $${p.precio.toFixed(2)} = $${(p.precio*p.cantidad).toFixed(2)}`, 0, y);
    y += 4;
  });

  y += 3;
  doc.setFontSize(7);
  doc.text(".........................................", 0, y);

  y += 3;
  doc.setFontSize(6);
  doc.text(`Subtotal: $${cabecera.subtotal.toFixed(2)}`, 5, y);

  y += 3;
  doc.text(`Dto: $${cabecera.descuento.toFixed(2)}`, 0, y);
  doc.text(`Rec: $${cabecera.recargo.toFixed(2)}`, 25, y);

  y += 3;
  doc.text(`TOTAL: $${cabecera.total.toFixed(2)}`, 5, y);

  y += 3;
  doc.setFontSize(5);
  doc.text("Formas de Pago:", 0, y);

  y += 3;

  const fpagos = {};
  const fSnap = await db.collection("F_PAGO").get();
  fSnap.forEach(d => fpagos[d.data().id_fpago] = d.data().descripcion);

  if (fp1) {
    doc.text(`${fp1} - ${fpagos[fp1] || ''}: $${imp1.toFixed(2)}`, 0, y);
    y += 3;
  }

  if (fp2) {
    doc.text(`${fp2} - ${fpagos[fp2] || ''}: $${imp2.toFixed(2)}`, 0, y);
    y += 3;
  }

  doc.save(`Ticket_Venta_${idVenta}.pdf`);
}
