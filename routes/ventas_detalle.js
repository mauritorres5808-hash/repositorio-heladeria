const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================
// DETALLE DE VENTA
// ============================================
router.get('/:idVenta', async (req, res) => {

  try {

    const { idVenta } = req.params;

    const [rows] = await db.query(`
      SELECT
        vd.*,
        p.descripcion
      FROM ventas_det vd
      LEFT JOIN productos p
        ON p.id_producto = vd.id_producto
      WHERE vd.id_venta = ?
    `, [idVenta]);

    res.json({
      ok: true,
      detalle: rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error obteniendo detalle'
    });
  }

});

module.exports = router;

