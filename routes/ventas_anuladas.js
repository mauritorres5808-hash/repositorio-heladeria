const express = require('express');
const router = express.Router();
const db = require('../db');

// ======================================================
// listado DE VENTAS ANULADAS - 
// ======================================================
router.get('/', async (req, res) => {
  try {
    const {
      desde,
      hasta,
      id_venta,
      tipo_venta
    } = req.query;

    let sql = `
      SELECT *
      FROM VENTAS_CAB
      WHERE anulada = 1
    `;

    const params = [];

    // =========================
    // BUSQUEDA POR NRO VENTA
    // =========================
    if (id_venta) {
      sql += ` AND id_venta = ? `;
      params.push(id_venta);
    }

    // =========================
    // BUSQUEDA POR FECHAS
    // =========================
    if (desde && hasta) {
      sql += ` AND DATE(fecha) BETWEEN ? AND ? `;
      params.push(desde, hasta);
    }

    // =========================
    // TIPO VENTA
    // =========================
    if (tipo_venta && tipo_venta !== 'todas') {
      sql += ` AND tipo_venta = ? `;
      params.push(tipo_venta);
    }

    sql += ` ORDER BY id_venta DESC `;

    const [rows] = await db.query(sql, params);

    res.json({
      ok: true,
      ventas: rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error obteniendo ventas anuladas'
    });
  }

});

module.exports = router;

