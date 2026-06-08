const express = require('express');
const router = express.Router();
const db = require('../db');


// =============================
// FORMAS DE PAGO para Publicar
// =============================
router.get('/publicadas', async (req, res) => {

    try {
        const [rows] = await db.query(`
            SELECT *
            FROM f_pago
            WHERE deshabilitado = 0
            and publica = 1
            ORDER BY descripcion
        `);

        res.json({
            ok: true,
            formasPago: rows
        });

    } catch (err) {
        console.error('Error obteniendo formas de pago:', err);
        res.status(500).json({
            ok: false,
            error: 'Error obteniendo formas de pago'
        });
    }
});

module.exports = router;
