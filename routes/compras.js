const express = require('express');
const router = express.Router();

const db = require('../db');

// ============================================
// COMPRAS ANULADAS
// ============================================
router.get('/anuladas', async (req, res) => {

    try {

        const {
            fecha_desde,
            fecha_hasta,
            nro_compra
        } = req.query;

        let sql = `
            SELECT
                *
            FROM compras_cab
            WHERE anulada = 1
        `;

        const params = [];

        // consulta por numero
        if (nro_compra) {

            sql += `
                AND id_compra = ?
            `;

            params.push(parseInt(nro_compra));

        } else {

            // consulta por rango fechas
            if (fecha_desde) {

                sql += `
                    AND fecha >= ?
                `;

                params.push(fecha_desde);
            }

            if (fecha_hasta) {

                sql += `
                    AND fecha <= ?
                `;

                params.push(fecha_hasta);
            }
        }

        sql += `
            ORDER BY
                fecha ASC,
                hora ASC
        `;

        const [rows] = await db.query(sql, params);

        res.json({
            ok: true,
            compras: rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: "Error obteniendo compras anuladas"
        });
    }
});

// ============================================
// AUDITORIA COMPRAS
// ============================================
router.get('/auditoria', async (req, res) => {

    try {

        const {
            fechadesde,
			fechahasta,
            id_usuario,
            tipo
        } = req.query;

        let sql = `
            SELECT
                a.*,
                c.total
            FROM compras_auditoria a
            LEFT JOIN compras_cab c
                ON c.id_compra = a.id_compra
            WHERE 1=1
        `;

        const params = [];

		if (fechadesde && fechahasta) {

		  sql += ` and a.fecha BETWEEN ? AND ?`;

		  params.push(fechadesde);
		  params.push(fechahasta);
		}

        if (id_usuario) {
            sql += ` AND a.id_usuario = ? `;
            params.push(id_usuario);
        }

        if (tipo) {
            sql += ` AND a.tipo = ? `;
            params.push(tipo);
        }

        sql += `
            ORDER BY
                a.fecha DESC,
                a.hora DESC
        `;

        const [rows] = await db.query(sql, params);

        res.json({
            ok: true,
            auditoria: rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false
        });

    }

});


// ======================================
// GRABAR COMPRA
// ======================================
router.post('/', async (req, res) => {

  const conn =
    await db.getConnection();

  try {

    await conn.beginTransaction();

    const {
      fecha,
      hora,
      usuario,
      total,
      f_pago1,
      productos
    } = req.body;

    // ======================================
    // NUEVO ID
    // ======================================
    const [ult] = await conn.query(`
      SELECT MAX(id_compra) AS ultimo
      FROM compras_cab
    `);

    let id_compra = 1;

    if (ult[0].ultimo) {

      id_compra =
        Number(ult[0].ultimo) + 1;
    }

    // ======================================
    // CABECERA
    // ======================================
    await conn.query(`
      INSERT INTO compras_cab (
        id_compra,
        fecha,
        hora,
        id_usuario,
        total,
        f_pago1,
        id_cierre,
        anulada

      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `, [

      id_compra,
      fecha,
      hora,
      usuario,
      total,
      f_pago1
    ]);

    // ======================================
    // DETALLE
    // ======================================
    for (const p of productos) {

      await conn.query(`
        INSERT INTO compras_det (

          id_compra,
          id_producto,
          cantidad,
          precio,
          subtotal

        ) VALUES (?, ?, ?, ?, ?)
      `, [

        id_compra,
        p.id_producto,
        p.cantidad,
        p.precio,
        p.subtotal
      ]);

      // ======================================
      // SUMAR STOCK
      // ======================================
      await conn.query(`
        UPDATE productos
        SET stock = stock + ?
        WHERE id_producto = ?
      `, [

        p.cantidad,
        p.id_producto
      ]);

      // ======================================
      // SUBPRODUCTOS
      // ======================================
      const [prod] = await conn.query(`
        SELECT subproductos
        FROM productos
        WHERE id_producto = ?
      `, [p.id_producto]);

      if (
        prod.length > 0 &&
        prod[0].subproductos === 'S'
      ) {

        const [rels] = await conn.query(`
          SELECT id_prod_sub
          FROM rela_prod_sub
          WHERE id_producto = ?
        `, [p.id_producto]);

        for (const r of rels) {

          await conn.query(`
            UPDATE productos
            SET stock = stock + ?
            WHERE id_producto = ?
          `, [

            p.cantidad,
            r.id_prod_sub
          ]);
        }
      }
    }

    await conn.commit();

    res.json({
      ok: true,
      id_compra
    });

  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error grabando compra'
    });

  } finally {
    conn.release();
  }
});


// ============================================
// CONSULTA DE COMPRAS
// ============================================
router.get('/consultas', async (req, res) => {

    try {

        const {
            desde,
            hasta,
            id_compra,
            sin_cierre
        } = req.query;

        let sql = `
            SELECT
                c.*,
                f.descripcion AS desc_fpago,
                u.nombre as usu_nombre
            FROM compras_cab c
            LEFT JOIN f_pago f
                ON c.f_pago1 = f.id_fpago
            LEFT JOIN usuarios u
                ON c.id_usuario = u.id_usuario
            WHERE 1 = 1
        `;

        const params = [];

        // =====================================
        // FILTRO FECHAS
        // =====================================
        if (desde && hasta) {

            sql += `
                AND c.fecha BETWEEN ? AND ?
            `;

            params.push(desde);
            params.push(hasta);
        }

        // =====================================
        // FILTRO NRO COMPRA
        // =====================================
        if (id_compra) {

            sql += `
                AND c.id_compra = ?
            `;

            params.push(id_compra);
        }

        // =====================================
        // SOLO SIN CIERRE
        // =====================================
        if (sin_cierre == 1) {

            sql += `
                AND c.id_cierre = 0
            `;
        }

        sql += `
            ORDER BY
                c.fecha ASC,
                c.hora ASC,
                c.id_compra ASC
        `;

        const [rows] =
            await db.query(sql, params);

        res.json({
            ok: true,
            compras: rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo compras'
        });
    }
});


// ============================================
// DETALLE DE COMPRA
// ============================================
router.get('/detalle/:id_compra', async (req, res) => {

    try {

        const { id_compra } = req.params;

        const [rows] = await db.query(`
            SELECT
                d.id_producto,
                p.descripcion,
                d.precio,
                d.cantidad,
                d.subtotal
            FROM compras_det d
            LEFT JOIN productos p
                ON d.id_producto = p.id_producto
            WHERE d.id_compra = ?
            ORDER BY p.descripcion
        `, [id_compra]);

        res.json({
            ok: true,
            detalle: rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo detalle'
        });
    }
});

// ======================================
// TOTALES POR GRUPO
// ======================================
router.get('/totales-grupo', async (req, res) => {

    try {

        const {
            desde,
            hasta,
            sin_cierre
        } = req.query;

        let where = `
            WHERE c.fecha
            BETWEEN ? AND ?
            AND IFNULL(c.anulada,0) = 0
        `;

        const params = [desde, hasta];

        if (sin_cierre == 'true') {

            where += `
                AND c.id_cierre = 0
            `;
        }

        const [rows] = await db.query(`

            SELECT

                p.id_grupo,

                g.descripcion
                    AS desc_grupo,

                SUM(d.cantidad)
                    AS cantidad,

                SUM(d.subtotal)
                    AS total

            FROM compras_cab c

            INNER JOIN compras_det d
                ON c.id_compra = d.id_compra

            INNER JOIN productos p
                ON d.id_producto = p.id_producto

            LEFT JOIN grupos g
                ON p.id_grupo = g.id_grupo

            ${where}

            GROUP BY
                p.id_grupo,
                g.descripcion

            ORDER BY
                g.descripcion

        `, params);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje:
                'Error obteniendo totales'
        });
    }
});

// ============================================
// COMPRAS POR FECHA
// ============================================
router.get('/por-fecha/:fecha', async (req, res) => {

    try {

        const { fecha } = req.params;

        const [rows] = await db.query(`
            SELECT
                id_compra,
                fecha,
                hora,
                total,
                f_pago1,
                anulada,
                id_cierre
            FROM compras_cab
            WHERE fecha = ?
            AND anulada = 0
            AND id_cierre = 0
            ORDER BY hora
        `, [fecha]);

        res.json({
            ok: true,
            compras: rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo compras'
        });
    }
});

// ============================================
// OBTENER COMPRA POR ID
// ============================================
router.get('/:id_compra', async (req, res) => {

    try {
        const { id_compra } = req.params;

        const [rows] = await db.query(`
            SELECT *
            FROM compras_cab
            WHERE id_compra = ?
            LIMIT 1
        `, [id_compra]);

        if (rows.length === 0) {

            return res.status(404).json({
                ok: false,
                mensaje: 'Compra no encontrada'
            });
        }

        res.json({
            ok: true,
            compra: rows[0]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false
        });
    }
});


// ============================================
// MODIFICAR FORMA DE PAGO
// ============================================
router.put('/:id_compra/fpago', async (req, res) => {

    try {

        const { id_compra } = req.params;

        const {
            f_pago1
        } = req.body;

        await db.query(`
            UPDATE compras_cab
            SET
                f_pago1 = ?
            WHERE id_compra = ?
        `, [
            f_pago1,
            id_compra
        ]);

        res.json({
            ok: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error modificando forma de pago'
        });
    }
});

// ============================================
// AUDITORIA CAMBIO FORMA DE PAGO
// ============================================
router.post('/auditoria/fpago', async (req, res) => {

    try {

        const {
            fecha,
            hora,
            fecha_compra,
            id_compra,
            id_usuario,
            usuario,
            tipo,
            valor_anterior,
            valor_nuevo
        } = req.body;

        await db.query(`
            INSERT INTO compras_auditoria
            (
                fecha,
                hora,
                fecha_compra,
                id_compra,
                id_usuario,
                usuario,
                tipo,
                valor_anterior,
                valor_nuevo
            )
            VALUES
            (
                ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        `, [
            fecha,
            hora,
            fecha_compra,
            id_compra,
            id_usuario,
            usuario,
            tipo,
            valor_anterior,
            valor_nuevo
        ]);

        res.json({
            ok: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error grabando auditoría'
        });

    }

});

// ============================================
// DETALLE DE COMPRA
// ============================================
router.get('/:id/detalle', async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT
                d.id_producto,
                p.descripcion,
                d.precio,
                d.cantidad,
                d.subtotal
            FROM compras_det d
            LEFT JOIN productos p
                ON p.id_producto = d.id_producto
            WHERE d.id_compra = ?
            ORDER BY d.id_producto
        `, [id]);

        res.json({
            ok: true,
            detalle: rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo detalle'
        });

    }

});


// ============================================
// ANULAR COMPRA
// ============================================
router.put('/:id_compra/anular', async (req, res) => {

	const conn = await db.getConnection();

	try {

		await conn.beginTransaction();

		const id_compra =
			parseInt(req.params.id_compra);

		// marcar anulada
		await conn.query(`
			UPDATE compras_cab
			SET anulada = 1
			WHERE id_compra = ?
		`, [id_compra]);

		// obtener detalle
		const [detalle] = await conn.query(`
			SELECT *
			FROM compras_det
			WHERE id_compra = ?
		`, [id_compra]);

		// recorrer productos
		for (const det of detalle) {

			// restar stock producto principal
			await conn.query(`
				UPDATE productos
				SET stock = stock - ?
				WHERE id_producto = ?
			`, [
				det.cantidad,
				det.id_producto
			]);

			// verificar subproductos
			const [prod] = await conn.query(`
				SELECT subproductos
				FROM productos
				WHERE id_producto = ?
			`, [det.id_producto]);

			if (
				prod.length > 0 &&
				prod[0].subproductos === 'S'
			) {

				const [subs] = await conn.query(`
					SELECT id_prod_sub
					FROM rela_prod_sub
					WHERE id_producto = ?
				`, [det.id_producto]);

				for (const sub of subs) {

					await conn.query(`
						UPDATE productos
						SET stock = stock - ?
						WHERE id_producto = ?
					`, [
						det.cantidad,
						sub.id_prod_sub
					]);
				}
			}
		}

		await conn.commit();

		res.json({
			ok: true
		});

	} catch (error) {
		await conn.rollback();
		console.error(error);
		res.status(500).json({
			ok: false
		});

	} finally {

		conn.release();

	}
});

module.exports = router;
