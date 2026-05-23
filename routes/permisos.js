const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================
// OBTENER FUNCIONES DE UN USUARIO
// ============================================
router.get('/:id_usuario', async (req, res) => {

    try {

        const { id_usuario } = req.params;

        const [rows] = await db.query(`
            SELECT
                uf.id_funcion,
                f.descripcion,
                f.id_modulo
            FROM usuarios_funciones uf
            INNER JOIN funciones f
                ON uf.id_funcion = f.id_funcion
            WHERE uf.id_usuario = ?
        `, [id_usuario]);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo permisos'
        });
    }
});

module.exports = router;
