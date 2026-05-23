const express = require('express');
const router = express.Router();
const db = require('../db');

// =====================================================
// TOTALES POR GRUPO - ventas
// =====================================================
router.get('/totales-grupo', async (req, res) => {

    try {

        const { desde, hasta, sin_cierre } = req.query;

        let where = `
            vc.fecha BETWEEN ? AND ?
            AND IFNULL(vc.anulada,2) <> 1
        `;

        if (parseInt(sin_cierre) === 1) {
            where += ` AND IFNULL(vc.id_cierre,0)=0 `;
        }

        const [rows] = await db.query(`
            SELECT
                p.id_grupo,
                g.descripcion,
                SUM(vd.cantidad) AS cantidad,
                SUM(vd.subtotal) AS total
            FROM ventas_det vd
            INNER JOIN ventas_cab vc
                ON vc.id_venta = vd.id_venta
            INNER JOIN productos p
                ON p.id_producto = vd.id_producto
            LEFT JOIN grupos g
                ON g.id_grupo = p.id_grupo
            WHERE ${where}
            GROUP BY
                p.id_grupo,
                g.descripcion
            ORDER BY total DESC
        `, [desde, hasta]);

        res.json({
            ok: true,
            totales: rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo totales por grupo'
        });

    }

});

// =====================================================
// TOTALES POR TIPO DE VENTA - ventas
// =====================================================
router.get('/totales-tipo-venta', async (req, res) => {

    try {

        const { desde, hasta, sin_cierre } = req.query;

        let where = `
            fecha BETWEEN ? AND ?
            AND IFNULL(anulada,2) <> 1
        `;

        if (parseInt(sin_cierre) === 1) {

            where += `
                AND IFNULL(id_cierre,0)=0
            `;
        }

        const [rows] = await db.query(`
            SELECT
                tipo_venta,
                COUNT(*) AS cantidad,
                SUM(total) AS total
            FROM ventas_cab
            WHERE ${where}
            GROUP BY tipo_venta
            ORDER BY total DESC
        `, [desde, hasta]);

        res.json({
            ok: true,
            totales: rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo totales por tipo de venta'
        });

    }

});

module.exports = router;
