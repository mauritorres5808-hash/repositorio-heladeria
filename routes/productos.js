const express = require('express');
const router = express.Router();

const db = require('../db');


// OBTENER TODOS LOS PRODUCTOS
router.get('/', async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                p.*,
                g.descripcion AS desc_grupo
            FROM PRODUCTOS p
            LEFT JOIN GRUPOS g
                ON p.id_grupo = g.id_grupo
            WHERE p.deshabilitado = 0
            ORDER BY p.descripcion
        `);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error obteniendo productos'
        });
    }
});


// ============================================
// LISTAR PRODUCTOS
// ============================================
router.get('/', async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT *
            FROM productos
            ORDER BY descripcion
        `);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo productos'
        });
    }
});

// ============================================
// PRODUCTO POR CODIGO o codigo de BARRAS
// ============================================
router.get('/busqueda/:codigo', async (req, res) => {

    try {

        //const codigo = req.params.codigo;
const codigoTexto = req.params.codigo.trim(); 
const codigoNumero = parseInt(codigoTexto);

        const [rows] = await db.query(`
            SELECT *
            FROM productos
            WHERE
                id_producto = ?
                OR cod_barra = ?
            LIMIT 1
        `, [codigoNumero || 0, codigoTexto]);

        if (rows.length === 0) {
            return res.json(null);
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo producto'
        });
    }
});

// ============================================
// BUSCAR PRODUCTOS
// ============================================
router.get('/buscar/:texto', async (req, res) => {

    try {

        const texto = `%${req.params.texto}%`;

        const [rows] = await db.query(`
            SELECT *
            FROM productos
            WHERE descripcion LIKE ?
            ORDER BY descripcion
        `, [texto]);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error buscando productos'
        });
    }
});



// ======================================
// CAMBIO MASIVO DE PRECIOS
// ======================================
router.put('/cambio-masivo', async (req, res) => {

    const conn = await db.getConnection();

    try {

        const {
            productos,
            auditoria
        } = req.body;

        await conn.beginTransaction();

        // ======================================
        // ACTUALIZAR PRODUCTOS
        // ======================================
        for (const p of productos) {

            await conn.query(`
                UPDATE productos
                SET precio = ?
                WHERE id_producto = ?
            `, [
                p.nuevo_precio,
                p.id_producto
            ]);
        }

        // ======================================
        // GUARDAR AUDITORIA
        // ======================================
		await conn.query(`
			INSERT INTO auditoria_precios (

				fecha,
				hora,

				id_usuario,
				usuario,

				id_grupo,
				grupo,

				tipo_cambio,
				valor_cambio

			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, [

			auditoria.fecha,
			auditoria.hora,

			auditoria.id_usuario,
			auditoria.usuario,

			auditoria.id_grupo,
			auditoria.grupo,

			auditoria.tipo_cambio,
			auditoria.valor_cambio
		]);

        await conn.commit();

        res.json({
            ok: true
        });

    } catch (error) {

        await conn.rollback();

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error aplicando cambio masivo'
        });

    } finally {

        conn.release();
    }
});


// ======================================
// ACTUALIZAR PRECIO PRODUCTO
// ======================================
router.put('/precio/:id_producto', async (req, res) => {

    try {

        const { id_producto } = req.params;

        const {
            precio
        } = req.body;

        await db.query(`
            UPDATE productos
            SET precio = ?
            WHERE id_producto = ?
        `, [
            precio,
            id_producto
        ]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error actualizando precio'
        });
    }
});



// ======================================
// PRODUCTOS POR GRUPO
// ======================================
router.get('/grupo/:id_grupo', async (req, res) => {

    try {

        const id_grupo =
            parseInt(req.params.id_grupo);

        const [rows] = await db.query(`
            SELECT *
            FROM PRODUCTOS
            WHERE id_grupo = ?
            ORDER BY descripcion
        `, [id_grupo]);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error obteniendo productos'
        });
    }
});

// ============================================
// ACTUALIZAR CAMPO SUBPRODUCTOS
// ============================================
router.put('/:id/subproductos', async (req, res) => {

    try {

        const { id } = req.params;

        const {
            subproductos
        } = req.body;

//console.log("ACTUALIZANDO SUBPRODUCTOS", id, subproductos);

        await db.query(`
            UPDATE productos
            SET subproductos = ?
            WHERE id_producto = ?
        `, [
            subproductos,
            id
        ]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error actualizando campo subproductos'
        });
    }
});


// ============================================
// OBTENER PRODUCTO
// ============================================
router.get('/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT *
            FROM productos
            WHERE id_producto = ?
        `, [id]);

        if (rows.length === 0) {
            return res.json(null);
        }

        res.json(rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo producto'
        });
    }
});


// ============================================
// ALTA
// ============================================
router.post('/', async (req, res) => {

    try {

        const datos = req.body;

        // buscar ultimo del grupo
        const [ultimos] = await db.query(`
            SELECT MAX(id_producto) AS ultimo
            FROM productos
            WHERE id_grupo = ?
        `, [datos.id_grupo]);

        let nuevoCodigo = datos.id_grupo * 1000 + 1;

        if (ultimos[0].ultimo) {
            nuevoCodigo = ultimos[0].ultimo + 1;
        }

        await db.query(`
            INSERT INTO productos (
                id_producto,
                descripcion,
                contenido,
                id_grupo,
                precio,
                cod_barra,
                stock,
                imagen,
                stock_minimo,
                max_sabores,
                deshabilitado,
                publica,
                publica_s,
                modifica,
                sabores
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nuevoCodigo,
            datos.descripcion,
            datos.contenido,
            datos.id_grupo,
            datos.precio,
            datos.cod_barra,
            datos.stock,
            `img/${nuevoCodigo}.png`,
            datos.stock_minimo,
            datos.max_sabores,
            datos.deshabilitado,
            datos.publica,
            datos.publica_s,
            datos.modifica,
            datos.sabores
        ]);

        res.json({
            ok: true,
            id_producto: nuevoCodigo
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error dando alta'
        });
    }
});


// ============================================
// MODIFICAR
// ============================================
router.put('/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const datos = req.body;

        await db.query(`
            UPDATE productos
            SET
                descripcion = ?,
                contenido = ?,
                id_grupo = ?,
                precio = ?,
                cod_barra = ?,
                stock = ?,
				imagen = ?,
                stock_minimo = ?,
                max_sabores = ?,
                deshabilitado = ?,
                publica = ?,
                publica_s = ?,
                modifica = ?,
                sabores = ?
            WHERE id_producto = ?
        `, [
            datos.descripcion,
            datos.contenido,
            datos.id_grupo,
            datos.precio,
            datos.cod_barra,
            datos.stock,
			`img/${id}.png`,
            datos.stock_minimo,
            datos.max_sabores,
            datos.deshabilitado,
            datos.publica,
            datos.publica_s,
            datos.modifica,
            datos.sabores,
            id
        ]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error modificando producto'
        });
    }
});




module.exports = router;

