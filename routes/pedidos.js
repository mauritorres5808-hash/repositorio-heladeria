const express = require('express');
const router = express.Router();

const db = require('../db');


// ======================================================
// LISTAR PEDIDOS
// ======================================================
router.get('/', async (req, res) => {

    try {

        const { estado, q } = req.query;

		let sql = `
			SELECT
				p.*,
				u.nombre AS usuario_canc_nombre,
				u2.nombre AS usuario_elim_nombre
			FROM pedidos_cab p
			LEFT JOIN usuarios u
				ON p.id_usuario_canc = u.id_usuario
			LEFT JOIN usuarios u2
				ON p.id_usuario_elim = u2.id_usuario
			WHERE 1=1
		`;

        const params = [];

        // estado
        if (estado === 'nuevo') {sql += ` AND estado = 'P' `;}
        if (estado === 'confirmado') {sql += ` AND estado = 'V' `;}
		if (estado === 'cancelado') {sql += ` AND estado = 'C' `; }
		if (estado === 'eliminado') {sql += ` AND estado = 'E' `; }

        // búsqueda
        if (q) {
            sql += `
                AND (
                    p.nombre LIKE ?
                    OR p.telefono LIKE ?
                )
            `;

            params.push(`%${q}%`);
            params.push(`%${q}%`);
        }

		if (estado === 'nuevo') {sql += ` ORDER BY id_pedido `;}
		if (estado === 'confirmado') {sql += ` ORDER BY id_venta desc `;}
		if (estado === 'cancelado') {sql += ` ORDER BY fecha_canc desc, hora_canc desc `;}
		if (estado === 'eliminado') {sql += ` ORDER BY fecha_elim desc, hora_elim desc `;}

        const [rows] = await db.query(sql, params);

        // traer detalle
        for (const p of rows) {

            const [det] = await db.query(`
                SELECT
                    id_producto,
                    prod_desc AS descripcion,
                    cantidad,
                    prod_precio AS precio,
					sabores
                FROM pedidos_det
                WHERE id_pedido = ?
            `, [p.id_pedido]);

            p.pedido_detalle = det;
		
			// traer promociones
			const [promos] = await db.query(`
				SELECT
					id_promocion,
					descripcion,
					descuento
				FROM pedidos_promociones
				WHERE id_pedido = ?
			`, [p.id_pedido]);
			
			p.promociones = promos;
        }

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo pedidos'
        });
    }
});


// ======================================================
// OBTENER PEDIDO
// ======================================================
router.get('/:id', async (req, res) => {

    try {
        const id = req.params.id;

        const [cab] = await db.query(`
            SELECT *
            FROM pedidos_cab
            WHERE id_pedido = ?
        `, [id]);

        if (cab.length === 0) {

            return res.status(404).json({
                ok: false,
                mensaje: 'Pedido no encontrado'
            });
        }

        const [det] = await db.query(`
            SELECT
                id_producto,
                prod_desc AS descripcion,
                cantidad,
                prod_precio AS precio,
				sabores
            FROM pedidos_det
            WHERE id_pedido = ?
        `, [id]);

        cab[0].pedido_detalle = det;
		
        res.json(cab[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo pedido'
        });
    }
});


// ======================================================
// INSERTAR PEDIDO
// ======================================================
router.post('/', async (req, res) => {

    const conn = await db.getConnection();

    try {

        await conn.beginTransaction();

        const {
            domicilio,
            nombre,
            nota,
            telefono,
            paga_con,
            detalle,
			descuento_promociones, 
			promociones_aplicadas, 
			costo_envio, 
			total_final
        } = req.body;

			// ======================================
			// FECHA / HORA / TOTAL
			// ======================================
			const ahora = new Date();
			const fecha =
			  ahora.getFullYear() + "-" +
			  String(ahora.getMonth() + 1).padStart(2, "0") + "-" +
			  String(ahora.getDate()).padStart(2, "0");

			const hora =
			  String(ahora.getHours()).padStart(2, "0") + ":" +
			  String(ahora.getMinutes()).padStart(2, "0");

			// calcular total
			let subtotal = 0;
			for (const item of detalle) {
			  subtotal += Number(item.precio || 0);
			}
			const descuentoPromos = Number(descuento_promociones || 0);
			
			const total = Number(total_final || subtotal);
			const costo_env = Number(costo_envio || 0);

        // insertar cabecera
        const [result] = await conn.query(`
            INSERT INTO pedidos_cab
            (
                fecha,
                hora,
                domicilio,
                nombre,
                nota,
                estado,
                telefono,
                paga_con,
                total,
                id_cliente,
                id_venta,
				descuento_promociones,
				costo_envio
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            fecha,
            hora,
            domicilio,
            nombre,
            nota,
            'P',
            telefono,
            paga_con,
            total,
            0,
            0,
			descuentoPromos,
			costo_env
        ]);

        const idPedido = result.insertId;

        // insertar detalle
        for (const item of detalle) {

            await conn.query(`
                INSERT INTO pedidos_det
                (
                    id_pedido,
                    id_producto,
                    prod_desc,
                    cantidad,
                    prod_precio,
					sabores
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                idPedido,
                item.id_producto,
                item.descripcion,
                1,
                item.precio,
				(item.sabores || []).join(',')
            ]);
        }
		
		// ======================================
		// GUARDAR PROMOCIONES
		// ======================================
		if (
			Array.isArray(promociones_aplicadas)
			&& promociones_aplicadas.length > 0
		){

			for (const promo of promociones_aplicadas){
				await conn.query(`
					INSERT INTO pedidos_promociones
					(
						id_pedido,
						id_promocion,
						descripcion,
						descuento
					)
					VALUES (?, ?, ?, ?)
				`, [
					idPedido,
					promo.id_promocion,
					promo.descripcion,
					promo.descuento
				]);
			}
		}

        await conn.commit();

        res.json({
            ok: true,
            id_pedido: idPedido
        });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error guardando pedido'
        });

    } finally {

        conn.release();
    }
});


// ======================================
// CONVERTIR PEDIDO EN VENTA
// ======================================
router.post('/:id/convertir', async (req, res) => {

    const conn = await db.getConnection();

    try {

        await conn.beginTransaction();

        const idPedido = req.params.id;

        const {
            f_pago1,
            f_pago2,
            importe_fp1,
            importe_fp2
        } = req.body;

        // ======================================
        // OBTENER PEDIDO CABECERA
        // ======================================
        const [pedCabRows] = await conn.query(`
            SELECT *
            FROM pedidos_cab
            WHERE id_pedido = ?
        `, [idPedido]);

        if (pedCabRows.length === 0) {

            await conn.rollback();

            return res.status(404).json({
                ok: false,
                error: 'Pedido no encontrado'
            });
        }

        const pedido = pedCabRows[0];

        // ======================================
        // VALIDAR ESTADO
        // ======================================
        if (pedido.estado === 'V') {

            await conn.rollback();

            return res.status(400).json({
                ok: false,
                error: 'El pedido ya fue confirmado'
            });
        }

        if (pedido.estado === 'C') {

            await conn.rollback();

            return res.status(400).json({
                ok: false,
                error: 'El pedido está cancelado'
            });
        }

		// ======================================
		// BUSCAR CLIENTE POR TELEFONO
		// ======================================
		let idCliente = 0;

		const [cliRows] = await conn.query(`
			SELECT id_cliente
			FROM clientes
			WHERE telefono = ?
			LIMIT 1
		`, [pedido.telefono]);

		// ======================================
		// CLIENTE EXISTE
		// ======================================
		if (cliRows.length > 0) {
			idCliente = cliRows[0].id_cliente;
		} else {
			// ======================================
			// CREAR CLIENTE
			// ======================================
			const [cliResult] = await conn.query(`
				INSERT INTO clientes (
					nombre,
					domicilio,
					telefono,
					nota,
					deshabilitado
				)
				VALUES (?, ?, ?, ?, 0)
			`, [
				pedido.nombre,
				pedido.domicilio,
				pedido.telefono,
				pedido.nota || ''
			]);

			idCliente = cliResult.insertId;
		}

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
            String(ahora.getSeconds()).padStart(2, '0')
			
		const descuentoPromociones = Number(pedido.descuento_promociones || 0);

		const SubtotalVenta = Number(pedido.total || 0) + Number(descuentoPromociones || 0);

		// ======================================
        // INSERTAR VENTA CABECERA
        // ======================================
		const [ventaResult] = await conn.query(`
			INSERT INTO ventas_cab (
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
			VALUES (
				?, ?,
				?, ?, ?, ?,
				?, ?,
				?, ?,
				?, ?, ?, ?, ?
			)
		`, [
			fechaHoy,
			horaHoy,

			Number(pedido.total || 0), 
			SubtotalVenta,
			0,
			0,
			descuentoPromociones,

			f_pago1 || 0,
			f_pago2 || 0,

			importe_fp1 || 0,
			importe_fp2 || 0,

			0,
			0,
			5,
			idCliente
		]);

		const idVenta = ventaResult.insertId;


        // ======================================
        // OBTENER DETALLE PEDIDO
        // ======================================
        const [detRows] = await conn.query(`
            SELECT *
            FROM pedidos_det
            WHERE id_pedido = ?
        `, [idPedido]);

        // ======================================
        // INSERTAR DETALLE VENTA
        // ======================================
        for (const item of detRows) {

            // --------------------------------------
            // INSERTAR DETALLE
            // --------------------------------------
            await conn.query(`
                INSERT INTO ventas_det (
                    id_venta,
                    id_producto,
                    cantidad,
                    precio,
                    subtotal
                )
                VALUES (?, ?, ?, ?, ?)
            `, [
                idVenta,
                item.id_producto,
                item.cantidad,
                item.prod_precio,
                item.cantidad * item.prod_precio
            ]);

            // --------------------------------------
            // DESCONTAR STOCK PRODUCTO PRINCIPAL
            // --------------------------------------
            await conn.query(`
                UPDATE productos
                SET stock = stock - ?
                WHERE id_producto = ?
            `, [
                item.cantidad,
                item.id_producto
            ]);

            // --------------------------------------
            // OBTENER SUBPRODUCTOS
            // --------------------------------------
            const [subRows] = await conn.query(`
                SELECT id_prod_sub
                FROM rela_prod_sub
                WHERE id_producto = ?
            `, [item.id_producto]);

            // --------------------------------------
            // DESCONTAR STOCK SUBPRODUCTOS
            // --------------------------------------
            for (const sub of subRows) {

                await conn.query(`
                    UPDATE productos
                    SET stock = stock - ?
                    WHERE id_producto = ?
                `, [
                    item.cantidad,
                    sub.id_prod_sub
                ]);
            }
        }

        // ======================================
        // ACTUALIZAR PEDIDO
        // ======================================
        await conn.query(`
            UPDATE pedidos_cab
            SET
                estado = 'V',
                id_cliente = ?,
                id_venta = ?
            WHERE id_pedido = ?
        `, [
            idCliente,
            idVenta,
            idPedido
        ]);

        // ======================================
        // COMMIT
        // ======================================
        await conn.commit();

        res.json({
            ok: true,
            id_venta: idVenta,
            id_cliente: idCliente
        });

    } catch (error) {

        await conn.rollback();

        console.error(error);

        res.status(500).json({
            ok: false,
            error: 'Error convirtiendo pedido'
        });

    } finally {

        conn.release();
    }
});


// ======================================
// CANCELAR PEDIDO
// ======================================
router.put('/:id/cancelar', async (req, res) => {

    try {
        const id = req.params.id;
		const usuario = req.headers["usuario-id"] || 0;

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
            String(ahora.getSeconds()).padStart(2, '0')

        await db.query(`
            UPDATE pedidos_cab
            SET estado = 'C'
			,fecha_canc = ?
			,hora_canc = ?
			,id_usuario_canc = ?
            WHERE id_pedido = ?
        `, [fechaHoy, horaHoy, usuario, id]);

        res.json({
            ok: true
        });

    } catch(error) {

        console.error(error);

        res.status(500).json({
            ok:false,
            mensaje:'Error cancelando pedido'
        });
    }
});

// ======================================
// OBTENER PEDIDO POR VENTA
// ======================================
router.get('/venta/:idVenta', async (req, res) => {

    try {

        const idVenta = req.params.idVenta;

        // ======================================
        // CABECERA
        // ======================================
        const [cabRows] = await db.query(`
            SELECT *
            FROM pedidos_cab
            WHERE id_venta = ?
            LIMIT 1
        `, [idVenta]);

        if (cabRows.length === 0) {
            return res.status(404).json({
                ok: false,
                error: 'Pedido no encontrado'
            });
        }

        const pedido = cabRows[0];

		// PROMOCIONES
		const [detPromociones] = await db.query(`
			SELECT
				id_promocion,
				descripcion,
				descuento
			FROM pedidos_promociones
            WHERE id_pedido = ?
        `, [pedido.id_pedido]);

        // ======================================
        // DETALLE
        // ======================================
        const [detRows] = await db.query(`
            SELECT *
            FROM pedidos_det
            WHERE id_pedido = ?
        `, [pedido.id_pedido]);

        // ======================================
        // SABORES
        // ======================================
        for (const item of detRows) {

            item.sabores_desc = '';

            if (
                item.sabores &&
                item.sabores.trim() !== ''
            ) {

                const ids =
                    item.sabores
                        .split(',')
                        .map(x => parseInt(x));

                if (ids.length > 0) {

                    const [sabRows] = await db.query(`
                        SELECT descripcion
                        FROM sabores
                        WHERE id_sabor IN (?)
                    `, [ids]);

                    item.sabores_desc =
                        sabRows
                            .map(s => s.descripcion)
                            .join(', ');
                }
            }
        }

        res.json({
            ok: true,
            cabecera: pedido,
            detalle: detRows,
            promociones: detPromociones
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            error: 'Error obteniendo pedido'
        });
    }
});


// ======================================
// ELIMINAR PEDIDO (marca estado = E)
// ======================================
router.delete('/:id', async (req, res) => {

    try {

        const id = parseInt(req.params.id);
		const usuario = req.headers["usuario-id"] || 0;

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
            String(ahora.getSeconds()).padStart(2, '0')

        const [result] = await db.query(`
            UPDATE pedidos_cab
            SET estado = 'E'
			,fecha_elim = ?
			,hora_elim = ?
			,id_usuario_elim = ?
            WHERE id_pedido = ?
        `, [fechaHoy, horaHoy, usuario, id]);


        if (result.affectedRows === 0) {

            return res.status(404).json({
                ok: false,
                mensaje: 'Pedido no encontrado'
            });
        }

        res.json({
            ok: true,
            mensaje: 'Pedido eliminado correctamente'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error eliminando pedido'
        });
    }
});


module.exports = router;
