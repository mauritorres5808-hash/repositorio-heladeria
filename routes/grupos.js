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
            FROM grupos
            ORDER BY descripcion
        `);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo grupos'
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
            FROM grupos
            WHERE id_grupo = ?
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
// BUSCAR POR DESCRIPCION
// ============================================

router.get('/buscar/:texto', async (req, res) => {

    try {

        const { texto } = req.params;

        const [rows] = await db.query(`
            SELECT *
            FROM grupos
            WHERE descripcion LIKE ?
            ORDER BY descripcion
        `, [`%${texto}%`]);

        res.json(rows);

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
            deshabilitado,
            publica
        } = req.body;

        const [maximo] = await db.query(`
            SELECT IFNULL(MAX(id_grupo),0)+1 AS nuevo_id
            FROM grupos
        `);

        const nuevoId = maximo[0].nuevo_id;

        await db.query(`
            INSERT INTO grupos
            (
                id_grupo,
                descripcion,
                deshabilitado,
                publica
            )
            VALUES (?, ?, ?, ?)
        `, [
            nuevoId,
            descripcion,
            deshabilitado,
            publica
        ]);

        res.json({
            ok: true,
            id_grupo: nuevoId
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
            deshabilitado,
            publica
        } = req.body;

        await db.query(`
            UPDATE grupos
            SET
                descripcion = ?,
                deshabilitado = ?,
                publica = ?
            WHERE id_grupo = ?
        `, [
            descripcion,
            deshabilitado,
            publica,
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
