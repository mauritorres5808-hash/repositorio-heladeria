const express = require("express");
const router = express.Router();
const db = require("../db");

// ======================================================
// COMPRAS SIN CIERRE
// ======================================================

router.get("/sin_cierre", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT *
            FROM compras_cab
            WHERE id_cierre = 0
            AND anulada = 0
            ORDER BY id_compra
        `);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: "Error obteniendo compras"
        });
    }
});

module.exports = router;
