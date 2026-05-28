const express = require('express');
const router = express.Router();
const db = require('../db');

// ======================================================
// LISTADO DE MOVIMIENTOS
// ======================================================
router.get('/listado', async (req, res) => {

    try {

        const {
            fecha_desde,
            fecha_hasta,
            tipo,
			sin_cierre
        } = req.query;

        let sql = `
            SELECT
                id_movimiento,
                hora,
                DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                importe,
                descripcion,
                tipo,
                anulado,
                id_cierre
            FROM movimientos
            WHERE fecha BETWEEN ? AND ?
        `;

        const params = [
            fecha_desde,
            fecha_hasta
        ];

        // filtro tipo
        if (tipo && tipo !== 'T') {
            sql += ` AND tipo = ? `;
            params.push(tipo);
        }
       // filtro cierre
        if (sin_cierre == 1) {
            sql += ` AND id_cierre = 0 `;
            params.push(sin_cierre);
        }

        sql += `
            ORDER BY fecha desc, hora desc, id_movimiento
        `;

        const [rows] = await db.query(sql, params);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo listado'
        });
    }
});

// ======================================================
// INSERTAR MOVIMIENTO
// ======================================================
router.post('/', async (req, res) => {

    try {

        const {
            hora,
            fecha,
            importe,
            descripcion,
            tipo,
            anulado,
            id_cierre
        } = req.body;

        await db.query(`
            INSERT INTO movimientos
            (
                hora,
                fecha,
                importe,
                descripcion,
                tipo,
                anulado,
                id_cierre
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            hora,
            fecha,
            importe,
            descripcion,
            tipo,
            anulado,
            id_cierre
        ]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error creando movimiento'
        });
    }
});

// ======================================================
// MOVIMIENTOS SIN CIERRE
// ======================================================
router.get("/sin_cierre", async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT id_movimiento,
			hora,
			DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
			importe,
			descripcion,
			tipo,
			anulado,
			id_cierre
            FROM movimientos
            WHERE id_cierre = 0
            AND anulado = 0
            ORDER BY id_movimiento
        `);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: "Error obteniendo movimientos"
        });
    }
});


// ======================================================
// MOVIMIENTOS POR FECHA
// ======================================================
router.get("/", async (req, res) => {

    try {

        const { fecha } = req.query;

        const [rows] = await db.query(`
            SELECT 
                id_movimiento,
				hora,
                DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                importe,
                descripcion,
                tipo,
                anulado,
                id_cierre
            FROM movimientos
            WHERE fecha = ?
            AND id_cierre = 0
            ORDER BY id_movimiento
        `, [fecha]);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: "Error obteniendo movimientos"
        });
    }
});

// ======================================================
// EDITAR MOVIMIENTO
// ======================================================
router.put("/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            importe,
            descripcion
        } = req.body;

        await db.query(`
            UPDATE movimientos
            SET
                importe = ?,
                descripcion = ?
            WHERE id_movimiento = ?
        `, [
            importe,
            descripcion,
            id
        ]);

        res.json({
            ok: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: "Error actualizando movimiento"
        });
    }
});

// ======================================================
// BUSCAR MOVIMIENTOS POR FECHA/TIPO
// ======================================================
router.get('/buscar', async (req, res) => {

    try {
        const { fecha, tipo } = req.query;

        const [rows] = await db.query(`
            SELECT
                hora,
                id_movimiento,
                descripcion,
                importe,
                anulado
            FROM movimientos
            WHERE fecha = ?
            AND tipo = ?
            AND id_cierre = 0
            ORDER BY id_movimiento DESC
        `, [fecha, tipo]);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error buscando movimientos'
        });
    }
});

// ======================================================
// ANULAR MOVIMIENTO
// ======================================================
router.put('/anular/:id', async (req, res) => {

    try {
        const id = req.params.id;

        await db.query(`
            UPDATE movimientos
            SET anulado = 1
            WHERE id_movimiento = ?
        `, [id]);

        res.json({
            ok: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error anulando movimiento'
        });
    }
});


module.exports = router;
