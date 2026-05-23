const express = require('express');
const router = express.Router();
const db = require('../db');


// ======================================================
// CLIENTES CON MÁS COMPRAS
// ======================================================
router.get('/clientes', async (req, res) => {

    try {

        const { desde, hasta } = req.query;

        const [rows] = await db.query(`
            SELECT
                c.id_cliente,
                c.nombre,
                COUNT(v.id_venta) AS cantidad_ventas,
                SUM(v.total) AS total_vendido,
				AVG(total) AS ticket_promedio,
                SUM(
                    CASE
                        WHEN tipo_venta = 1
                        THEN 1
                        ELSE 0
                    END
                ) AS cant_delivery,
                SUM(
                    CASE
                        WHEN tipo_venta = 5
                        THEN 1
                        ELSE 0
                    END
                ) AS cant_online
            FROM ventas_cab v
            INNER JOIN clientes c
                ON v.id_cliente = c.id_cliente
            WHERE
                v.fecha BETWEEN ? AND ?
                AND v.tipo_venta IN (1,5)
                AND v.id_cliente > 0
                AND IFNULL(v.anulada,0) = 0
            GROUP BY
                c.id_cliente,
                c.nombre
            ORDER BY cantidad_ventas DESC
            LIMIT 10
        `, [desde, hasta]);

        res.json({
            ok: true,
            datos: rows
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            ok: false,
            error: err.message
        });
    }
});

// =====================================================
// PRODUCTOS MAS VENDIDOS
// =====================================================
router.get('/productos-mas-vendidos', async (req, res) => {

    try {

        const { desde, hasta } = req.query;

        const [rows] = await db.query(`
            SELECT
                vd.id_producto,
                p.descripcion,
                SUM(vd.cantidad) AS cantidad,
                SUM(vd.subtotal) AS total,
                SUM(
                    CASE
                        WHEN tipo_venta = 1
                        THEN vd.cantidad
                        ELSE 0
                    END
                ) AS cant_delivery,
                SUM(
                    CASE
                        WHEN tipo_venta = 2
                        THEN vd.cantidad
                        ELSE 0
                    END
                ) AS cant_rappi,
                SUM(
                    CASE
                        WHEN tipo_venta = 3
                        THEN vd.cantidad
                        ELSE 0
                    END
                ) AS cant_pedidosya,
                SUM(
                    CASE
                        WHEN tipo_venta = 4
                        THEN vd.cantidad
                        ELSE 0
                    END
                ) AS cant_mostrador,
                SUM(
                    CASE
                        WHEN tipo_venta = 5
                        THEN vd.cantidad
                        ELSE 0
                    END
                ) AS cant_online
            FROM ventas_det vd

            INNER JOIN ventas_cab vc
                ON vc.id_venta = vd.id_venta

            INNER JOIN productos p
                ON p.id_producto = vd.id_producto

            WHERE
                vc.fecha BETWEEN ? AND ?
                AND (vc.anulada = 0 OR vc.anulada IS NULL)

            GROUP BY
                vd.id_producto,
                p.descripcion

            ORDER BY cantidad DESC
            LIMIT 10
        `, [desde, hasta]);

        res.json({
            ok: true,
            datos: rows
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
// DIAS DE LA SEMANA CON MAS VENTAS
// ======================================================
router.get('/dias-mas-ventas', async (req, res) => {

    try {
        const { desde, hasta } = req.query;
        const [rows] = await db.query(`
            SELECT
                DAYOFWEEK(fecha) AS dia_semana,
                COUNT(*) AS cantidad_ventas,
                SUM(total) AS total_vendido,
				AVG(total) AS ticket_promedio,
                SUM(
                    CASE
                        WHEN tipo_venta = 1
                        THEN 1
                        ELSE 0
                    END
                ) AS cant_delivery,
                SUM(
                    CASE
                        WHEN tipo_venta = 2
                        THEN 1
                        ELSE 0
                    END
                ) AS cant_rappi,
                SUM(
                    CASE
                        WHEN tipo_venta = 3
                        THEN 1
                        ELSE 0
                    END
                ) AS cant_pedidosya,
                SUM(
                    CASE
                        WHEN tipo_venta = 4
                        THEN 1
                        ELSE 0
                    END
                ) AS cant_mostrador,
                SUM(
                    CASE
                        WHEN tipo_venta = 5
                        THEN 1
                        ELSE 0
                    END
                ) AS cant_online

            FROM ventas_cab
            WHERE
                fecha BETWEEN ? AND ?
                AND anulada = 0
            GROUP BY DAYOFWEEK(fecha)
        `, [desde, hasta]);

        // =========================================
        // ARMAR TODOS LOS DIAS
        // =========================================
        const dias = [
            { nombre: 'Domingo', cantidad: 0, total: 0 , cant_delivery:0, cant_rappi:0, cant_pedidosya:0, cant_mostrador:0, cant_online:0, ticket_promedio:0 },
            { nombre: 'Lunes', cantidad: 0, total: 0 , cant_delivery:0, cant_rappi:0, cant_pedidosya:0, cant_mostrador:0, cant_online:0 , ticket_promedio:0},
            { nombre: 'Martes', cantidad: 0, total: 0, cant_delivery:0, cant_rappi:0, cant_pedidosya:0, cant_mostrador:0, cant_online:0 , ticket_promedio:0},
			{ nombre: 'Miércoles', cantidad: 0, total: 0 , cant_delivery:0, cant_rappi:0, cant_pedidosya:0, cant_mostrador:0, cant_online:0 , ticket_promedio:0},
            { nombre: 'Jueves', cantidad: 0, total: 0 , cant_delivery:0, cant_rappi:0, cant_pedidosya:0, cant_mostrador:0, cant_online:0 , ticket_promedio:0},
            { nombre: 'Viernes', cantidad: 0, total: 0 , cant_delivery:0, cant_rappi:0, cant_pedidosya:0, cant_mostrador:0, cant_online:0 , ticket_promedio:0},
            { nombre: 'Sábado', cantidad: 0, total: 0 , cant_delivery:0, cant_rappi:0, cant_pedidosya:0, cant_mostrador:0, cant_online:0 , ticket_promedio:0},
        ];

        rows.forEach(r => {
            dias[r.dia_semana - 1].cantidad = parseInt(r.cantidad_ventas || 0);
            dias[r.dia_semana - 1].total = parseFloat(r.total_vendido || 0);
            dias[r.dia_semana - 1].cant_delivery = parseFloat(r.cant_delivery || 0);
            dias[r.dia_semana - 1].cant_rappi = parseFloat(r.cant_rappi || 0);
            dias[r.dia_semana - 1].cant_pedidosya = parseFloat(r.cant_pedidosya || 0);
            dias[r.dia_semana - 1].cant_mostrador = parseFloat(r.cant_mostrador || 0);
            dias[r.dia_semana - 1].cant_online = parseFloat(r.cant_online || 0);
            dias[r.dia_semana - 1].ticket_promedio = parseFloat(r.ticket_promedio || 0);
        });

        // =========================================
        // ORDEN LUNES → DOMINGO
        // =========================================
        const ordenado = [
            dias[1],
            dias[2],
            dias[3],
            dias[4],
            dias[5],
            dias[6],
            dias[0]
        ];

        res.json({
            ok: true,
            datos: ordenado
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
// VENTAS POR HORA
// ==========================================
router.get('/ventas-por-hora', async (req, res) => {

    try {

        const {
            desde,
            hasta
        } = req.query;

        const [rows] = await db.query(`
            SELECT
                LEFT(hora,2) AS hora,
                COUNT(*) AS cant_ventas,
                SUM(total) AS total_general,
                AVG(total) AS ticket_promedio,
                SUM(
                    CASE
                        WHEN tipo_venta = 1
                        THEN 1
                        ELSE 0
                    END
                ) AS total_delivery,
                SUM(
                    CASE
                        WHEN tipo_venta = 2
                        THEN 1
                        ELSE 0
                    END
                ) AS total_rappi,
                SUM(
                    CASE
                        WHEN tipo_venta = 3
                        THEN 1
                        ELSE 0
                    END
                ) AS total_pedidosya,
                SUM(
                    CASE
                        WHEN tipo_venta = 4
                        THEN 1
                        ELSE 0
                    END
                ) AS total_mostrador,
                SUM(
                    CASE
                        WHEN tipo_venta = 5
                        THEN 1
                        ELSE 0
                    END
                ) AS total_online,
                
				
				COUNT(
                    CASE
                        WHEN tipo_venta = 1
                        THEN 1
                    END
                ) AS cant_delivery,
                COUNT(
                    CASE
                        WHEN tipo_venta = 2
                        THEN 1
                    END
                ) AS cant_rappi,
				COUNT(
                    CASE
                        WHEN tipo_venta = 3
                        THEN 1
                    END
                ) AS cant_pedidosya,
				COUNT(
                    CASE
                        WHEN tipo_venta = 4
                        THEN 1
                    END
                ) AS cant_mostrador,
				COUNT(
                    CASE
                        WHEN tipo_venta = 5
                        THEN 1
                    END
                ) AS cant_online
            FROM ventas_cab
            WHERE
                anulada = 0
                AND fecha BETWEEN ? AND ?
            GROUP BY LEFT(hora,2)
            ORDER BY hora
        `, [
            desde,
            hasta
        ]);

        res.json({
            ok: true,
            datos: rows
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
// ESTADISTICAS DE SABORES
// ==========================================
router.get('/estadisticas-sabores', async (req, res) => {

    try {

        const {
            desde,
            hasta
        } = req.query;

        // =====================================
        // OBTENER PEDIDOS
        // =====================================

        const [rows] = await db.query(`
            SELECT
                pd.sabores
            FROM ventas_cab vc
            INNER JOIN pedidos_cab pc
                ON pc.id_venta = vc.id_venta
            INNER JOIN pedidos_det pd
                ON pd.id_pedido = pc.id_pedido
            WHERE
                vc.fecha BETWEEN ? AND ?
                AND pc.estado = 'V'
                AND vc.anulada = 0
				LIMIT 10
        `, [
            desde,
            hasta
        ]);

        // =====================================
        // OBTENER SABORES
        // =====================================

        const [saboresDB] = await db.query(`
            SELECT
                id_sabor,
                descripcion
            FROM sabores
        `);

        // =====================================
        // MAPA SABORES
        // =====================================

        const mapaSabores = {};

        for (const s of saboresDB) {

            mapaSabores[s.id_sabor] =
                s.descripcion;
        }

        // =====================================
        // CONTADOR
        // =====================================

        const contador = {};

        let totalSabores = 0;

        for (const r of rows) {

            if (!r.sabores) {
                continue;
            }

            const lista =
                r.sabores.split(',');

            for (const id of lista) {

                const idNum =
                    parseInt(id);

                if (!idNum) {
                    continue;
                }

                totalSabores++;

                if (!contador[idNum]) {
                    contador[idNum] = 0;
                }

                contador[idNum]++;
            }
        }

        // =====================================
        // RESULTADO FINAL
        // =====================================

        const resultado = [];

        for (const id in contador) {

            const cantidad =
                contador[id];

            const porcentaje =
                totalSabores > 0
                ? ((cantidad / totalSabores) * 100)
                    .toFixed(2)
                : 0;

            resultado.push({

                id_sabor: parseInt(id),

                sabor:
                    mapaSabores[id] || 'Desconocido',

                cantidad,

                porcentaje
            });
        }

        // =====================================
        // ORDENAR
        // =====================================

        resultado.sort(
            (a, b) =>
                b.cantidad - a.cantidad
        );

        res.json({
            ok: true,
            totalSabores,
            datos: resultado
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
