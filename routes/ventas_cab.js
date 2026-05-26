const express = require('express');
const router = express.Router();
const db = require('../db');

// ======================================================
// GET VENTAS POR FECHA
// ======================================================
router.get('/fecha/:fecha', async (req, res) => {

    try {
        const { fecha } = req.params;
        const [rows] = await db.query(`
            SELECT *
            FROM ventas_cab
            WHERE fecha = ?
            ORDER BY hora
        `, [fecha]);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo ventas'
        });
    }
});

// ======================================================
// VENTAS SIN CIERRE
// ======================================================
router.get("/sin_cierre", async (req, res) => {

    try {
        const [rows] = await db.query(`
            SELECT *
            FROM ventas_cab
            WHERE id_cierre = 0
            AND anulada = 0
            ORDER BY id_venta
        `);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: "Error obteniendo ventas"
        });
    }
});



// ======================================================
// grabacion de la Venta
// ======================================================
router.post('/delivery', async (req, res) => {

		const conn = await db.getConnection();
		
    try {
        await conn.beginTransaction();

        const {
            tipo_venta,
            id_cliente,
            subtotal,
            descuento,
            recargo,
			descuento_promociones,
            total,
            f_pago1,
            f_pago2,
            importe_fp1,
            importe_fp2,
			promociones,
            productos

        } = req.body;

        // NUEVO ID VENTA

        const [ultVenta] = await conn.query(`
            SELECT IFNULL(MAX(id_venta),0)+1 AS nuevo
            FROM ventas_cab
        `);

        const id_venta = ultVenta[0].nuevo;

		const ahora = new Date();

		// FECHA formato MySQL DATE
		const fecha = ahora.toISOString().split('T')[0];

		// HORA
		const hora = ahora.toLocaleTimeString('es-AR', {hour12: false});

        // INSERT CABECERA

        await conn.query(`
            INSERT INTO ventas_cab
            (
                id_venta,
                fecha,
                hora,
                total,
                subtotal,
                descuento,
                recargo,
				descuento_promociones,
                f_pago1,
                f_pago2,
                importe_fp1,
                importe_fp2,
                id_cierre,
                anulada,
                tipo_venta,
                id_cliente
            )
            VALUES
            (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `, [
            id_venta,
            fecha,
            hora,
            total,
            subtotal,
            descuento,
            recargo,
			descuento_promociones || 0,
            f_pago1,
            f_pago2,
            importe_fp1,
            importe_fp2,
            0,
            false,
            tipo_venta,
            id_cliente
        ]);

        // DETALLE + STOCK

        for (const p of productos) {

            const subtotalDet = p.precio * p.cantidad;

            // INSERT DETALLE

            await conn.query(`
                INSERT INTO ventas_det
                (
                    id_venta,
                    id_producto,
                    cantidad,
                    precio,
                    subtotal
                )
                VALUES (?,?,?,?,?)
            `, [
                id_venta,
                p.id,
                p.cantidad,
                p.precio,
                subtotalDet
            ]);

            // DESCONTAR STOCK

            await conn.query(`
                UPDATE productos
                SET stock = stock - ?
                WHERE id_producto = ?
            `, [
                p.cantidad,
                p.id
            ]);

            // VERIFICAR SUBPRODUCTOS

            const [prod] = await conn.query(`
                SELECT subproductos
                FROM productos
                WHERE id_producto = ?
            `, [p.id]);

            if (
                prod.length > 0 &&
                prod[0].subproductos
            ) {
                const [subs] = await conn.query(`
                    SELECT id_prod_sub
                    FROM rela_prod_sub
                    WHERE id_producto = ?
                `, [p.id]);

                for (const s of subs) {
                    await conn.query(`
                        UPDATE productos
                        SET stock = stock - ?
                        WHERE id_producto = ?
                    `, [
                        p.cantidad,
                        s.id_prod_sub
                    ]);
                }
            }
        }

		// =====================================
		// PROMOCIONES
		// =====================================

		if (promociones && promociones.length > 0) {

			for (const promo of promociones) {

				await conn.query(`
					INSERT INTO ventas_promociones
					(
						id_venta,
						id_promocion,
						descripcion,
						descuento
					)
					VALUES (?,?,?,?)
				`, [
					id_venta,
					promo.id_promocion || 0,
					promo.descripcion || '',
					promo.descuento || 0
				]);
			}
		}

        await conn.commit();

       // EMPRESA

        const [emp] = await conn.query(`
            SELECT nombre
            FROM empresa
            LIMIT 1
        `);

        res.json({
            ok: true,
            id_venta,
            cabecera: {
                id_venta,
                fecha,
                hora,
                total,
                subtotal,
                descuento,
                recargo
            },
            nombre: emp.length > 0 ? emp[0].nombre : ''
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
// UPDATE FORMAS DE PAGO
// ======================================================
router.put('/:id/fpago', async (req, res) => {

    try {

        const { id } = req.params;

        const {
            f_pago1,
            importe_fp1,
            f_pago2,
            importe_fp2,
            usuario,
            id_usuario
        } = req.body;

        // ============================================
        // BUSCAR VENTA ACTUAL
        // ============================================

        const [ventaRows] = await db.query(`
            SELECT *
            FROM ventas_cab
            WHERE id_venta = ?
            LIMIT 1
        `, [id]);

        if (ventaRows.length === 0) {

            return res.status(404).json({
                ok: false,
                mensaje: 'Venta no encontrada'
            });
        }

        const ventaAnterior = ventaRows[0];

        // ============================================
        // ACTUALIZAR VENTA
        // ============================================

        await db.query(`
            UPDATE ventas_cab
            SET
                f_pago1 = ?,
                importe_fp1 = ?,
                f_pago2 = ?,
                importe_fp2 = ?
            WHERE id_venta = ?
        `, [
            f_pago1,
            importe_fp1,
            f_pago2,
            importe_fp2,
            id
        ]);

        // ============================================
        // FECHA Y HORA ACTUAL
        // ============================================
        const ahora = new Date();

        const fechaHoy =
            ahora.getFullYear() + '-' +
            String(ahora.getMonth() + 1).padStart(2, '0') + '-' +
            String(ahora.getDate()).padStart(2, '0');

        const horaHoy =
            String(ahora.getHours()).padStart(2, '0') + ':' +
            String(ahora.getMinutes()).padStart(2, '0') + ':' +
            String(ahora.getSeconds()).padStart(2, '0');

        // ============================================
        // INSERTAR AUDITORIA
        // ============================================

        await db.query(`
            INSERT INTO ventas_auditoria
            (
                usuario,
                fecha,
                hora,
                fecha_venta,
                id_venta,
                id_usuario,
                tipo,

                valor_anterior_fpago1,
                valor_nuevo_fpago1,

                valor_anterior_imp_fpago1,
                valor_nuevo_imp_fpago1,

                valor_anterior_fpago2,
                valor_nuevo_fpago2,

                valor_anterior_imp_fpago2,
                valor_nuevo_imp_fpago2
            )
            VALUES
            (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?
            )
        `, [

            usuario || '',
            fechaHoy,
            horaHoy,
            ventaAnterior.fecha,
            id,
            id_usuario || 0,
            'FP',

            ventaAnterior.f_pago1 || 0,
            f_pago1 || 0,

            ventaAnterior.importe_fp1 || 0,
            importe_fp1 || 0,

            ventaAnterior.f_pago2 || 0,
            f_pago2 || 0,

            ventaAnterior.importe_fp2 || 0,
            importe_fp2 || 0
        ]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error actualizando formas de pago'
        });
    }
});

// ==========================================
// CONSULTA DE VENTAS
// ==========================================
router.get('/consulta', async (req, res) => {

    try {

        const {
            desde,
            hasta,
            nro,
            tipo_venta,
            sin_cierre,
			id_cliente
        } = req.query;

        let where = [];
        let params = [];

        // =========================
        // FILTRO POR FECHA
        // =========================
        if (desde && hasta) {

            where.push('fecha BETWEEN ? AND ?');

            params.push(desde);
            params.push(hasta);
        }

        // =========================
        // FILTRO POR NUMERO
        // =========================
        if (nro) {

            where.push('id_venta = ?');

            params.push(parseInt(nro));
        }

        // =========================
        // FILTRO TIPO VENTA
        // =========================
        if (
            tipo_venta && tipo_venta !== 'todas'
        ) {
            where.push('tipo_venta = ?');
            params.push(parseInt(tipo_venta));
        }

        // =========================
        // SOLO SIN CIERRE
        // =========================
        if (sin_cierre === 'true') {
            where.push('id_cierre = 0');
        }
		// ========================= 
		// FILTRO CLIENTE 
		// ========================= 
		if ( id_cliente && parseInt(id_cliente) > 0 ) { 
			where.push('id_cliente = ?'); 
			params.push(parseInt(id_cliente)); 
			}

        const sqlWhere =
            where.length > 0
                ? 'WHERE ' + where.join(' AND ')
                : '';

        // =========================
        // VENTAS
        // =========================
        const [ventas] = await db.query(`
            SELECT *
            FROM ventas_cab
            ${sqlWhere}
            ORDER BY id_venta DESC
        `, params);

        // =========================
        // FORMAS DE PAGO
        // =========================
        const [formasPago] = await db.query(`
            SELECT *
            FROM f_pago
        `);

        // =========================
        // CLIENTES
        // =========================
        const [clientes] = await db.query(`
            SELECT *
            FROM clientes
        `);

        res.json({
            ok: true,
            ventas,
            formasPago,
            clientes
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});

// ==========================================
// REIMPRESION TICKET
// ==========================================
router.get('/reimpresion/:id', async (req, res) => {

    try {

        const idVenta = parseInt(req.params.id);

        // =========================
        // CABECERA
        // =========================
        const [cabRows] = await db.query(`
              SELECT
                vc.*,
                c.nombre AS cli_nombre,
                c.domicilio AS cli_domicilio,
                c.telefono AS cli_telefono,
                c.nota AS cli_nota

            FROM ventas_cab vc

            LEFT JOIN clientes c
                ON c.id_cliente = vc.id_cliente

            WHERE id_venta = ?
            LIMIT 1
        `, [idVenta]);

        if (cabRows.length === 0) {

            return res.json({
                ok: false,
                error: 'Venta no encontrada'
            });
        }

        const cabecera = cabRows[0];

        // =========================
        // DETALLE
        // =========================
        const [detalle] = await db.query(`
            SELECT
                vd.id_producto,
                p.descripcion,
                vd.precio,
                vd.cantidad
            FROM ventas_det vd
            LEFT JOIN productos p
                ON p.id_producto = vd.id_producto
            WHERE vd.id_venta = ?
        `, [idVenta]);

        // =========================
        // EMPRESA
        // =========================
        const [empresaRows] = await db.query(`
            SELECT nombre
            FROM empresa
            LIMIT 1
        `);

        let empresa = '';

        if (empresaRows.length > 0) {

            empresa = empresaRows[0].nombre;
        }

        res.json({
            ok: true,
            cabecera,
            detalle,
            empresa
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});

// ==========================================
// BUSCAR VENTA PARA ANULAR
// ==========================================
router.get('/consul_anu/:id', async (req, res) => {

    try {

        const idVenta = parseInt(req.params.id);

        // CABECERA
        const [cab] = await db.query(`
            SELECT *
            FROM ventas_cab
            WHERE id_venta = ?
            LIMIT 1
        `, [idVenta]);

        if (cab.length === 0) {
            return res.status(404).json({
                ok: false,
                error: 'Venta no encontrada'
            });
        }

        // DETALLE
        const [det] = await db.query(`
            SELECT
                d.*,
                p.descripcion
            FROM ventas_det d
            LEFT JOIN productos p
                ON p.id_producto = d.id_producto
            WHERE d.id_venta = ?
        `, [idVenta]);

        res.json({
            ok: true,
            venta: cab[0],
            detalle: det
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});

// ==========================================
// ANULAR VENTA
// ==========================================
router.put('/anular/:id', async (req, res) => {

		const conn = await db.getConnection();

    try {

        await conn.beginTransaction();

        const idVenta = parseInt(req.params.id);

        // VERIFICAR CABECERA
        const [cab] = await conn.query(`
            SELECT *
            FROM ventas_cab
            WHERE id_venta = ?
            LIMIT 1
        `, [idVenta]);

        if (cab.length === 0) {
            throw new Error('Venta no encontrada');
        }

        const venta = cab[0];

        if (venta.anulada) {
            throw new Error('La venta ya está anulada');
        }

        if (venta.id_cierre && venta.id_cierre !== 0) {
            throw new Error('La venta tiene cierre');
        }

		// ==========================================
		// AUDITORIA
		// ==========================================
		const ahora = new Date();
		// FECHA YYYY-MM-DD
		const fechaAud = ahora.toISOString().split('T')[0];
		// HORA
		const horaAud = ahora.toTimeString().split(' ')[0];
		// USUARIO
		const usuario = req.session.usuario || {};

		await conn.query(`
			INSERT INTO ventas_auditoria
			(
				usuario,
				fecha,
				hora,
				fecha_venta,
				id_venta,
				id_usuario,
				tipo,
				valor_anterior_fpago1,
				valor_nuevo_fpago1,
				valor_anterior_imp_fpago1,
				valor_nuevo_imp_fpago1,
				valor_anterior_fpago2,
				valor_nuevo_fpago2,
				valor_anterior_imp_fpago2,
				valor_nuevo_imp_fpago2
			)
			VALUES
			(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
		`, [
			usuario.nombre || '',
			fechaAud,
			horaAud,
			venta.fecha,
			venta.id_venta,
			usuario.id_usuario || 0,
			'ANU',
			venta.f_pago1,
			0,
			venta.importe_fp1,
			0,
			venta.f_pago2,
			0,
			venta.importe_fp2,
			0
		]);

        // ANULAR VENTA
        await conn.query(`
            UPDATE ventas_cab
            SET
                anulada = 1
            WHERE id_venta = ?
        `, [idVenta]);

        // DETALLE
        const [detalle] = await conn.query(`
            SELECT *
            FROM ventas_det
            WHERE id_venta = ?
        `, [idVenta]);

        // RECUPERAR STOCK
        for (const det of detalle) {

            // PRODUCTO PRINCIPAL
            await conn.query(`
                UPDATE productos
                SET stock = stock + ?
                WHERE id_producto = ?
            `, [
                det.cantidad,
                det.id_producto
            ]);

            // VERIFICAR SUBPRODUCTOS
            const [prod] = await conn.query(`
                SELECT subproductos
                FROM productos
                WHERE id_producto = ?
            `, [det.id_producto]);

            if (
                prod.length > 0 &&
                prod[0].subproductos === 1
            ) {

                const [subs] = await conn.query(`
                    SELECT id_prod_sub
                    FROM rela_prod_sub
                    WHERE id_producto = ?
                `, [det.id_producto]);

                for (const s of subs) {

                    await conn.query(`
                        UPDATE productos
                        SET stock = stock + ?
                        WHERE id_producto = ?
                    `, [
                        det.cantidad,
                        s.id_prod_sub
                    ]);
                }
            }
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
// GET VENTA POR ID
// ======================================================
router.get('/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT *
            FROM ventas_cab
            WHERE id_venta = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {

            return res.status(404).json({
                ok: false,
                mensaje: 'Venta no encontrada'
            });
        }

        res.json(rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo venta'
        });
    }
});

module.exports = router;
