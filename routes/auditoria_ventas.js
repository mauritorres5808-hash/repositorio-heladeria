const express = require('express');
const router = express.Router();

const db = require('../db');


// ========================================
// AUDITORIA DE VENTAS
// ========================================
router.get('/', async (req, res) => {

  try {

    const {
      fecha,
      id_usuario,
      tipo
    } = req.query;

    let sql = `
      SELECT
        id_auditoria,
        usuario,
        fecha,
        hora,
        fecha_venta,
        id_venta,
        id_usuario,
        tipo,

        valor_anterior_fpago1,
        valor_nuevo_fpago1,

        valor_anterior_imp_fpago1,
        valor_nuevo_imp_fpago1,

        valor_anterior_fpago2,
        valor_nuevo_fpago2,

        valor_anterior_imp_fpago2,
        valor_nuevo_imp_fpago2

      FROM ventas_auditoria

      WHERE 1 = 1
    `;

    const params = [];

    // =====================================
    // FILTRO FECHA
    // =====================================
    if (fecha) {

      sql += ` AND fecha = ?`;

      params.push(fecha);
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
