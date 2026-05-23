const express = require('express');
const router = express.Router();
const db = require('../db');

// ======================================================
// GET DETALLE DE VENTA
// ======================================================
// /api/ventas_det/123
// ======================================================
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
            ORDER BY vd.id_producto
        `, [idVenta]);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo detalle'
        });
    }
});

// ==========================================
// DETALLE DE VENTA
// ==========================================
router.get('/detalle/:id', async (req, res) => {

    try {

        const idVenta = parseInt(req.params.id);

        const [detalle] = await db.query(`
            SELECT
                vd.id_producto,
                p.descripcion,
                vd.precio,
                vd.cantidad,
                vd.subtotal
            FROM ventas_det vd
            LEFT JOIN productos p
                ON p.id_producto = vd.id_producto
            WHERE vd.id_venta = ?
            ORDER BY vd.id_producto
        `, [idVenta]);

        res.json({
            ok: true,
            detalle
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});


module.exports = router;
