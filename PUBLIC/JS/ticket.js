async function generarComprobanteTermicoPDF(
  idVenta, cabecera, productos,
  fp1, fp2, imp1, imp2,
  pempresa, tipoVenta, promocionesAplicadas = [], datosCliente = null
	) 
{
		// =====================================
		// SI NO RECIBE PROMOCIONES,
		// BUSCARLAS AUTOMATICAMENTE
		// =====================================
		if (!promocionesAplicadas || promocionesAplicadas.length === 0) 
		{
			try {
				const resp = await fetch(`/api/ventas_promociones/${idVenta}`);
				const data = await resp.json();
				if (data.ok) {
					promocionesAplicadas = data.promociones || [];
				}
			} catch (err) {
				console.error('Error obteniendo promociones:',err);
			}
		}

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
  
			const fechaTexto = cabecera.fecha;
			const fechaFormateada =
				fechaTexto.substring(8,10) + "/" +
				fechaTexto.substring(5,7) + "/" +
				fechaTexto.substring(0,4);

  console.log("cabecera.fecha:"+cabecera.fecha);
  console.log("fechaFormateada:"+fechaFormateada);


  doc.setFontSize(7);
  doc.text(`Venta N°: ${idVenta}`, 1, y);

  y += 4;
  doc.text(String(fechaFormateada || ''), 1, y);
  doc.text(String(cabecera.hora || ''), 14, y);

  y += 4;
  doc.text("=============================", 0, y);

	// =====================================
	// DATOS CLIENTE
	// =====================================
	if (tipoVenta === 1 && datosCliente) {

	  y += 4;
	  doc.setFontSize(6);
	  doc.text("CLIENTE:", 0, y);

	  y += 3;
	  doc.setFontSize(5);
	  doc.text(
		String(datosCliente.nombre || '').substring(0, 35),
		0,
		y
	  );

	  y += 3;
	  doc.text(
		String(datosCliente.domicilio || '').substring(0, 35),
		0,
		y
	  );

	  y += 3;
	  doc.text(
		"Tel: " + String(datosCliente.telefono || '').substring(0, 25),
		0,
		y
	  );

	  // NOTA
	  if (datosCliente.nota && datosCliente.nota !== '-') {

		y += 3;

		doc.text(
		  "Nota: " + String(datosCliente.nota).substring(0, 35),
		  0,
		  y
		);
	  }

	  y += 4;
	  doc.text("=============================", 0, y);
	}

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

y += 1;
doc.setFontSize(7);
doc.text(".........................................", 0, y);

// =====================================
// SUBTOTAL
// =====================================
y += 3;
doc.setFontSize(6);
doc.text(`Subtotal: $${parseFloat(cabecera.subtotal || 0).toFixed(2)}`,5,y);


// =====================================
// PROMOCIONES
// =====================================
	let totalPromos = 0;

	if (promocionesAplicadas && promocionesAplicadas.length > 0) 
	{
/*
		y += 2;
		doc.setFontSize(4);
		doc.text("Promociones:", 0, y);
*/
		doc.setFontSize(4);
		promocionesAplicadas.forEach(pr => {
			y += 2;
			const descuento = Number(pr.descuento || 0);
			totalPromos += descuento;

			doc.text(`${pr.descripcion.substring(0,28)}`+`  -$ ${descuento.toFixed(2)}`,0,y);
			//y += 3;
			//doc.text(`-$ ${descuento.toFixed(2)}`,5,y);
		});
		y += 2;
		doc.setFontSize(4);
		doc.text(`Total PROMOS: -$ ${totalPromos.toFixed(2)}`,0,y);
	}

  y += 3;
  doc.text(`Dto: $${parseFloat(cabecera.descuento || 0).toFixed(2)}`, 0, y);
  doc.text(`Rec: $${parseFloat(cabecera.recargo || 0).toFixed(2)}`, 25, y);

  y += 3;
  doc.setFontSize(6);
  doc.text(`TOTAL: $${parseFloat(cabecera.total || 0).toFixed(2)}`, 5, y);

  y += 3;
  doc.setFontSize(5);
  doc.text("Formas de Pago:", 0, y);

  y += 3;

		// formas de pago
		const fpagos = {};
		try {
			const resp = await fetch('/api/fpago');
			const data = await resp.json();
			if (data.ok) {
				data.formasPago.forEach(f => {fpagos[f.id_fpago] = f.descripcion;});
			}
		} catch (err) {
			console.error('Error obteniendo formas de pago:', err);
		}

  if (fp1) {
    doc.text(`- ${fpagos[fp1] || ''}: $${parseFloat(imp1 || 0).toFixed(2)}`, 0, y);
    y += 3;
  }

  if (fp2) {
    doc.text(`- ${fpagos[fp2] || ''}: $${parseFloat(imp2 || 0).toFixed(2)}`, 0, y);
    y += 3;
  }

  doc.save(`Ticket_Venta_${idVenta}.pdf`);
}
