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
            FROM f_pago
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
            deshabilitado,
            publica
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
            deshabilitado,
            publica
        } = req.body;

        await db.query(`
            UPDATE f_pago
            SET
                descripcion = ?,
                deshabilitado = ?,
                publica = ?
            WHERE id_fpago = ?
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

// ======================================
// ELIMINAR 
// ======================================
router.delete('/:id', async (req, res) => {

    const conn = await db.getConnection();

    try {
        const id = parseInt(req.params.id);
        await conn.beginTransaction();

        // ==========================
        // BORRAR 
        // ==========================
        const [result] = await conn.query(`
            DELETE FROM f_pago
            WHERE id_fpago = ?
        `, [id]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({
                ok: false,
                mensaje: 'Forma de Pago no encontrado'
            });
        }

        await conn.commit();

        res.json({
            ok: true,
            mensaje: 'Forma de Pago eliminada correctamente'
        });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: '- ERROR eliminando Forma de Pago -'
        });

    } finally {
        conn.release();
    }
});


module.exports = router;
