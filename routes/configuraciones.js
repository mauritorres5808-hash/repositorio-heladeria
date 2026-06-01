const express = require('express');
const router = express.Router();

const db = require('../db');

// ==========================================
// OBTENER CONFIGURACION
// ==========================================
router.get("/", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT *
            FROM configuraciones
            WHERE id_configuracion = 1
        `);

        res.json(rows[0] || {});

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Error obteniendo configuración"
        });
    }
});

// ==========================================
// GUARDAR CONFIGURACION
// ==========================================
router.put("/", async (req, res) => {

    try {

        const {
            costo_envio,
            total_pedido,
            distancia_maxima
        } = req.body;

        await db.query(`
            UPDATE configuraciones
            SET
                costo_envio = ?,
                total_pedido = ?,
                distancia_maxima = ?
            WHERE id_configuracion = 1
        `, [
            costo_envio,
            total_pedido,
            distancia_maxima
        ]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

module.exports = router;

