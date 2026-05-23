const express = require('express');
const router = express.Router();

const db = require('../db');


// ==========================================
// LISTAR MODULOS
// ==========================================
router.get('/modulos', async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                id_modulo,
                descripcion
            FROM modulos
            ORDER BY descripcion
        `);

        res.json({
            ok: true,
            modulos: rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo módulos'
        });
    }
});


// ==========================================
// LISTAR FUNCIONES
// ==========================================
router.get('/', async (req, res) => {

    try {

        const id_modulo = req.query.id_modulo || 0;

        let sql = `
            SELECT
                id_funcion,
                descripcion,
                id_modulo
            FROM funciones
        `;

        let params = [];

        if (id_modulo) {

            sql += ` WHERE id_modulo = ? `;
            params.push(id_modulo);
        }

        sql += ` ORDER BY id_funcion `;

        const [rows] = await db.query(sql, params);

        res.json({
            ok: true,
            funciones: rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo funciones'
        });
    }
});


// ==========================================
// INSERT / UPDATE
// ==========================================
router.post('/', async (req, res) => {

    try {

        const {
            id_funcion,
            descripcion,
            id_modulo
        } = req.body;

        const [existe] = await db.query(`
            SELECT id_funcion
            FROM funciones
            WHERE id_funcion = ?
        `, [id_funcion]);

        if (existe.length > 0) {

            // UPDATE
            await db.query(`
                UPDATE funciones
                SET
                    descripcion = ?,
                    id_modulo = ?
                WHERE id_funcion = ?
            `, [
                descripcion,
                id_modulo,
                id_funcion
            ]);

        } else {

            // INSERT
            await db.query(`
                INSERT INTO funciones
                (
                    id_funcion,
                    descripcion,
                    id_modulo
                )
                VALUES (?, ?, ?)
            `, [
                id_funcion,
                descripcion,
                id_modulo
            ]);
        }

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error guardando función'
        });
    }
});


// ==========================================
// ELIMINAR
// ==========================================
router.delete('/:id', async (req, res) => {

    try {

        const id = req.params.id;

        await db.query(`
            DELETE FROM funciones
            WHERE id_funcion = ?
        `, [id]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error eliminando función'
        });
    }
});

module.exports = router;
