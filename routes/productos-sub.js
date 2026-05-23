const express = require('express');
const router = express.Router();
const db = require('../db');


// ============================================
// BUSCAR PRODUCTOS
// ============================================
router.get('/buscar', async (req, res) => {
    try {

        const texto = req.query.texto || "";
        const grupo = req.query.grupo || "";

        let sql = `
            SELECT
                id_producto,
                descripcion
            FROM PRODUCTOS
            WHERE LOWER(descripcion) LIKE ?
        `;

        const params = [`%${texto.toLowerCase()}%`];

        if (grupo !== "") {

            sql += ` AND id_grupo = ?`;

            params.push(grupo);
        }

        sql += ` ORDER BY descripcion`;

        const [rows] = await db.query(sql, params);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error buscando productos'
        });
    }
});

// ============================================
// OBTENER SUBPRODUCTOS
// ============================================
router.get('/:id_producto', async (req, res) => {

    try {

        const { id_producto } = req.params;

        const [rows] = await db.query(`
            SELECT *
            FROM RELA_PROD_SUB
            WHERE id_producto = ?
        `, [id_producto]);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error obteniendo subproductos'
        });
    }
});


// ============================================
// GUARDAR SUBPRODUCTOS
// ============================================
router.post('/:id_producto', async (req, res) => {

    try {

        const { id_producto } = req.params;

        const { subproductos } = req.body;

        // borrar anteriores
        await db.query(`
            DELETE FROM RELA_PROD_SUB
            WHERE id_producto = ?
        `, [id_producto]);

        // insertar nuevos
        for (const idSub of subproductos) {

            await db.query(`
                INSERT INTO RELA_PROD_SUB (
                    id_producto,
                    id_prod_sub
                )
                VALUES (?,?)
            `, [
                id_producto,
                idSub
            ]);
        }

        // actualizar marca
        const tieneSub = subproductos.length > 0 ? 1 : 0;

        await db.query(`
            UPDATE PRODUCTOS
            SET subproductos = ?
            WHERE id_producto = ?
        `, [
            tieneSub,
            id_producto
        ]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error guardando subproductos'
        });
    }
});

module.exports = router;
