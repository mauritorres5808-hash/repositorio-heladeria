const express = require('express');
const router = express.Router();

const db = require('../db');

// ==========================================
// OBTENER PROMOCIONES DE UNA VENTA
// ==========================================
router.get('/:idVenta', async (req, res) => {

    try {

        const idVenta =
            parseInt(req.params.idVenta);

        const [rows] = await db.query(`
            SELECT
                id_promocion,
                descripcion,
                descuento
            FROM ventas_promociones
            WHERE id_venta = ?
            ORDER BY id
        `, [idVenta]);

        res.json({
            ok: true,
            promociones: rows
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

