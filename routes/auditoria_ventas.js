const express = require('express');
const router = express.Router();

const db = require('../db');


// ========================================
// AUDITORIA DE VENTAS
// ========================================
router.get('/', async (req, res) => {

  try {

    const {
      fechadesde,
      fechahasta,
      id_usuario,
      tipo
    } = req.query;

    let sql = `
		SELECT
			va.id_auditoria,
			va.usuario,
			va.fecha,
			va.hora,
			va.fecha_venta,
			va.id_venta,
			va.id_usuario,
			va.tipo,

			va.valor_anterior_fpago1,
			fp1_ant.descripcion AS desc_anterior_fpago1,

			va.valor_nuevo_fpago1,
			fp1_nuevo.descripcion AS desc_nuevo_fpago1,

			va.valor_anterior_imp_fpago1,
			va.valor_nuevo_imp_fpago1,

			va.valor_anterior_fpago2,
			fp2_ant.descripcion AS desc_anterior_fpago2,

			va.valor_nuevo_fpago2,
			fp2_nuevo.descripcion AS desc_nuevo_fpago2,

			va.valor_anterior_imp_fpago2,
			va.valor_nuevo_imp_fpago2

		FROM ventas_auditoria va

		LEFT JOIN f_pago fp1_ant
			   ON fp1_ant.id_fpago = va.valor_anterior_fpago1

		LEFT JOIN f_pago fp1_nuevo
			   ON fp1_nuevo.id_fpago = va.valor_nuevo_fpago1

		LEFT JOIN f_pago fp2_ant
			   ON fp2_ant.id_fpago = va.valor_anterior_fpago2

		LEFT JOIN f_pago fp2_nuevo
			   ON fp2_nuevo.id_fpago = va.valor_nuevo_fpago2

      WHERE 1 = 1
    `;

    const params = [];

    // =====================================
    // FILTRO FECHA
    // =====================================
    if (fechadesde && fechahasta) {

      sql += ` and fecha BETWEEN ? AND ?`;

      params.push(fechadesde);
      params.push(fechahasta);
    }

    // =====================================
    // FILTRO USUARIO
    // =====================================
    if (id_usuario) {

      sql += ` AND id_usuario = ?`;

      params.push(id_usuario);
    }

    // =====================================
    // FILTRO TIPO
    // =====================================
    if (tipo) {

      sql += ` AND tipo = ?`;

      params.push(tipo);
    }

    // =====================================
    // ORDER
    // =====================================
    sql += `
      ORDER BY
        fecha DESC,
        hora DESC,
        id_auditoria DESC
    `;

    const [rows] =
        await db.query(sql, params);

    res.json({
      ok: true,
      auditoria: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo auditoría'
    });
  }
});

module.exports = router;
