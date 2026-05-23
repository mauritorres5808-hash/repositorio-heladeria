const express = require('express');
const router = express.Router();

const db = require('../db');

// ======================================================
// LISTAR PROMOCIONES
// ======================================================
router.get('/', async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                p.*,
                GROUP_CONCAT(
                    CONCAT(pr.id_producto, ' - ', pr.descripcion)
                    SEPARATOR ' | '
                ) AS productos
            FROM promociones p
            LEFT JOIN rela_promo_productos rp
                ON rp.id_promocion = p.id_promocion
            LEFT JOIN productos pr
                ON pr.id_producto = rp.id_producto
            GROUP BY p.id_promocion
            ORDER BY p.id_promocion DESC
        `);

        res.json({
            ok: true,
            promociones: rows
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});


// ======================================================
// BUSCAR PRODUCTOS ACTIVOS
// ======================================================
router.get('/productos/buscar', async (req, res) => {

    try {

        const texto = (req.query.q || '').trim();

        const [rows] = await db.query(`
            SELECT
                id_producto,
                descripcion,
                precio
            FROM productos
            WHERE
                deshabilitado = 0
                AND (
                    descripcion LIKE ?
                    OR id_producto LIKE ?
                )
            ORDER BY descripcion
            LIMIT 50
        `, [
            `%${texto}%`,
            `%${texto}%`
        ]);

        res.json({
            ok: true,
            productos: rows
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});


// ======================================================
// VALIDAR PRODUCTOS YA CON PROMO
// ======================================================
async function validarProductosSinPromo(
    productos,
    idPromocionExcluir = 0
) {

    for (const prod of productos) {

        const idProducto = prod.id_producto;

        const [rows] = await db.query(`
            SELECT
                rp.id_promocion,
                p.descripcion AS promo
            FROM rela_promo_productos rp
            INNER JOIN promociones p
                ON p.id_promocion = rp.id_promocion
            WHERE
                rp.id_producto = ?
                AND rp.id_promocion <> ?
                AND p.activa = 1
        `, [
            idProducto,
            idPromocionExcluir
        ]);

        if (rows.length > 0) {
			//console.log(`Producto duplicado: ${idProducto} - Promo: ${rows[0].promo}`);
            return {
                ok: false,
                error: `El producto ${idProducto} ya pertenece a la promoción "${rows[0].promo}"`
            };
        }
    }

    return {
        ok: true
    };
}



// ======================================================
// CREAR PROMOCION
// ======================================================
router.post('/', async (req, res) => {

    const conn = await db.getConnection();

    try {

        await conn.beginTransaction();

        const {
            descripcion,
            tipo,
            activa,
            fecha_desde,
            fecha_hasta,
            cantidad_min,
            porcentaje_desc,
            precio_fijo,
            lleva_cant,
            paga_cant,
            productos
        } = req.body;

        // ==========================================
        // VALIDAR PRODUCTOS DUPLICADOS
        // ==========================================

        const validacion = await validarProductosSinPromo(productos);

        if (!validacion.ok) {
            await conn.rollback();
            return res.status(400).json(validacion);
        }

        // ==========================================
        // INSERT PROMO
        // ==========================================

        const [result] = await conn.query(`
            INSERT INTO promociones (
                descripcion,
                tipo,
                activa,
                fecha_desde,
                fecha_hasta,
                cantidad_min,
                porcentaje_desc,
                precio_fijo,
                lleva_cant,
                paga_cant,
                prioridad
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `, [
            descripcion,
            tipo,
            activa ? 1 : 0,
            fecha_desde || null,
            fecha_hasta || null,
            cantidad_min || 0,
            porcentaje_desc || 0,
            precio_fijo || 0,
            lleva_cant || 0,
            paga_cant || 0
        ]);

        const idPromocion = result.insertId;

        // ==========================================
        // RELACIONAR PRODUCTOS
        // ==========================================

        for (const prod of productos) {

            await conn.query(`
                INSERT INTO rela_promo_productos (
                    id_promocion,
                    id_producto
                )
                VALUES (?, ?)
            `, [
                idPromocion,
                prod.id_producto
            ]);
        }

        await conn.commit();

        res.json({
            ok: true,
            id_promocion: idPromocion
        });

    } catch (err) {

        await conn.rollback();

        console.error(err);

        res.status(500).json({
            ok: false,
            error: err.message
        });

    } finally {

        conn.release();
    }
});


// ======================================================
// MODIFICAR PROMOCION
// ======================================================
router.put('/:id', async (req, res) => {

    const conn = await db.getConnection();

    try {

        await conn.beginTransaction();

        const idPromocion = parseInt(req.params.id);

        const {
            descripcion,
            tipo,
            activa,
            fecha_desde,
            fecha_hasta,
            cantidad_min,
            porcentaje_desc,
            precio_fijo,
            lleva_cant,
            paga_cant,
            productos
        } = req.body;

        // ==========================================
        // VALIDAR PRODUCTOS DUPLICADOS
        // ==========================================

        const validacion = await validarProductosSinPromo(productos,idPromocion);

        if (!validacion.ok) {
            await conn.rollback();
            return res.status(400).json(validacion);
        }

        // ==========================================
        // UPDATE PROMO
        // ==========================================

        await conn.query(`
            UPDATE promociones
            SET
                descripcion = ?,
                tipo = ?,
                activa = ?,
                fecha_desde = ?,
                fecha_hasta = ?,
                cantidad_min = ?,
                porcentaje_desc = ?,
                precio_fijo = ?,
                lleva_cant = ?,
                paga_cant = ?
            WHERE id_promocion = ?
        `, [
            descripcion,
            tipo,
            activa ? 1 : 0,
            fecha_desde || null,
            fecha_hasta || null,
            cantidad_min || 0,
            porcentaje_desc || 0,
            precio_fijo || 0,
            lleva_cant || 0,
            paga_cant || 0,
            idPromocion
        ]);

        // ==========================================
        // BORRAR RELACIONES ANTERIORES
        // ==========================================

        await conn.query(`
            DELETE FROM rela_promo_productos
            WHERE id_promocion = ?
        `, [idPromocion]);

        // ==========================================
        // NUEVAS RELACIONES
        // ==========================================

        for (const prod of productos) {

            await conn.query(`
                INSERT INTO rela_promo_productos (
                    id_promocion,
                    id_producto
                )
                VALUES (?, ?)
            `, [
                idPromocion,
                prod.id_producto
            ]);
        }

        await conn.commit();

        res.json({
            ok: true
        });

    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({
            ok: false,
            error: err.message
        });

    } finally {

        conn.release();
    }
});


// ======================================================
// ELIMINAR PROMOCION
// ======================================================
router.delete('/:id', async (req, res) => {

    const conn = await db.getConnection();

    try {

        await conn.beginTransaction();

        const idPromocion =
            parseInt(req.params.id);

        await conn.query(`
            DELETE FROM rela_promo_productos
            WHERE id_promocion = ?
        `, [idPromocion]);

        await conn.query(`
            DELETE FROM promociones
            WHERE id_promocion = ?
        `, [idPromocion]);

        await conn.commit();

        res.json({
            ok: true
        });

    } catch (err) {

        await conn.rollback();

        console.error(err);

        res.status(500).json({
            ok: false,
            error: err.message
        });

    } finally {

        conn.release();
    }
});


// ======================================================
// PROMOCIONES VIGENTES
// ======================================================
router.get('/vigentes', async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                p.*,

                GROUP_CONCAT(
                    CONCAT(
                        pr.id_producto,
                        ' - ',
                        pr.descripcion
                    )
                    SEPARATOR ' | '
                ) AS productos

            FROM promociones p

            LEFT JOIN rela_promo_productos rp
                ON rp.id_promocion = p.id_promocion

            LEFT JOIN productos pr
                ON pr.id_producto = rp.id_producto

            WHERE
                p.activa = 1
                AND (
                    p.fecha_hasta IS NULL
                    OR p.fecha_hasta >= CURDATE()
                )

            GROUP BY p.id_promocion

            ORDER BY p.descripcion
        `);

        res.json({
            ok: true,
            promociones: rows
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});


module.exports = router;
