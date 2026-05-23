const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================
// LISTAR TODOS
// ============================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT *
            FROM f_pago
            ORDER BY descripcion
        `);

		res.json({
			ok: true,
			formasPago: rows
		});

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo formas de pago'
        });
    }
});

// =============================
// FORMAS DE PAGO habilitadas
// =============================
router.get('/habilitadas', async (req, res) => {

    try {
        const [rows] = await db.query(`
            SELECT *
            FROM F_PAGO
            WHERE deshabilitado = 0
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

// ============================================
// BUSCAR POR ID
// ============================================
router.get('/:id', async (req, res) => {

    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT *
            FROM f_pago
            WHERE id_fpago = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false
        });
    }
});

// ============================================
// BUSQUEDA POR DESCRIPCION
// ============================================
router.get('/buscar/:texto', async (req, res) => {
    try {
        const { texto } = req.params;
        const [rows] = await db.query(`
            SELECT *
            FROM f_pago
            WHERE descripcion LIKE ?
            ORDER BY descripcion
        `, [`%${texto}%`]);

		res.json({
			ok: true,
			formasPago: rows
		});

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false
        });
    }
});

// ============================================
// ALTA
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            descripcion,
            deshabilitado
        } = req.body;

        const [maximo] = await db.query(`
            SELECT IFNULL(MAX(id_fpago),0)+1 AS nuevo_id
            FROM f_pago
        `);

        const nuevoId = maximo[0].nuevo_id;

        await db.query(`
            INSERT INTO f_pago
            (
                id_fpago,
                descripcion,
                deshabilitado
            )
            VALUES (?, ?, ?)
        `, [
            nuevoId,
            descripcion,
            deshabilitado
        ]);

        res.json({
            ok: true,
            id_fpago: nuevoId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false
        });
    }
});

// ============================================
// MODIFICAR
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            descripcion,
            deshabilitado
        } = req.body;

        await db.query(`
            UPDATE f_pago
            SET
                descripcion = ?,
                deshabilitado = ?
            WHERE id_fpago = ?
        `, [
            descripcion,
            deshabilitado,
            id
        ]);

        res.json({
            ok: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false
        });
    }
});

module.exports = router;
