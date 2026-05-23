const express = require("express");
const router = express.Router();
const db = require("../db");

// ======================================================
// PROXIMO ID_CIERRE
// ======================================================
router.get('/proximo-id', async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT IFNULL(MAX(id_cierre), 0) + 1 AS proximo
            FROM cierres_cab
        `);

        res.json({
            ok: true,
            proximo: rows[0].proximo
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo próximo id_cierre'
        });
    }
});

// ======================================================
// GENERAR CIERRE
// ======================================================
router.post("/generar", async (req, res) => {

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const {
            usuario,
            datosCierre
        } = req.body;

        const {
			idCierre,
            resumenPorTipo,
            totalIngresos,
            totalEgresos,
            totalCompras,
            totalGeneral
        } = datosCierre;

        // ======================================================
        // FECHA Y HORA
        // ======================================================
        const ahora = new Date();
        const fecha =
            ahora.getFullYear() + "-" +
            String(ahora.getMonth() + 1).padStart(2, "0") + "-" +
            String(ahora.getDate()).padStart(2, "0");
        const hora =
            String(ahora.getHours()).padStart(2, "0") + ":" +
            String(ahora.getMinutes()).padStart(2, "0") + ":" +
            String(ahora.getSeconds()).padStart(2, "0");
			
        // ======================================================
        // INSERT CABECERA
        // ======================================================
        await connection.query(`
            INSERT INTO cierres_cab
            (
                id_cierre,
                fecha,
                hora,
                total_general,
                total_ingresos,
                total_egresos,
                total_compras,
                usuario
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            idCierre,
            fecha,
            hora,
            totalGeneral,
            totalIngresos,
            totalEgresos,
            totalCompras,
            usuario
        ]);

        // ======================================================
        // INSERT DETALLE VENTAS
        // ======================================================
        for (const tipo in resumenPorTipo) {
            const t = resumenPorTipo[tipo];
            for (const idfp in t.formasPago) {
                await connection.query(`
                    INSERT INTO cierres_det
                    (
                        id_cierre,
                        tipo,
                        id_tipo_venta,
                        id_fpago,
                        total
                    )
                    VALUES
                    (?, ?, ?, ?, ?)
                `, [
                    idCierre,
                    "VENTAS",
                    parseInt(tipo),
                    parseInt(idfp),
                    parseFloat(t.formasPago[idfp] || 0)
                ]);
            }
        }

        // ======================================================
        // INGRESOS
        // ======================================================
        await connection.query(`
            INSERT INTO cierres_det
            (
                id_cierre,
                tipo,
                total
            )
            VALUES
            (?, ?, ?)
        `, [
            idCierre,
            "INGRESOS",
            totalIngresos
        ]);

        // ======================================================
        // EGRESOS
        // ======================================================
        await connection.query(`
            INSERT INTO cierres_det
            (
                id_cierre,
                tipo,
                total
            )
            VALUES
            (?, ?, ?)
        `, [
            idCierre,
            "EGRESOS",
            totalEgresos
        ]);

        // ======================================================
        // COMPRAS
        // ======================================================
        await connection.query(`
            INSERT INTO cierres_det
            (
                id_cierre,
                tipo,
                total
            )
            VALUES
            (?, ?, ?)
        `, [
            idCierre,
            "COMPRAS",
            totalCompras
        ]);


        // ======================================================
        // ACTUALIZAR VENTAS
        // ======================================================
        await connection.query(`
            UPDATE ventas_cab
            SET id_cierre = ?
            WHERE id_cierre = 0
        `, [idCierre]);

        // ======================================================
        // ACTUALIZAR MOVIMIENTOS
        // ======================================================
        await connection.query(`
            UPDATE movimientos
            SET id_cierre = ?
            WHERE id_cierre = 0
        `, [idCierre]);

        // ======================================================
        // ACTUALIZAR COMPRAS
        // ======================================================
        await connection.query(`
            UPDATE compras_cab
            SET id_cierre = ?
            WHERE id_cierre = 0
        `, [idCierre]);

        // ======================================================
        // CERRAR APERTURA
        // ======================================================
        await connection.query(`
            UPDATE aperturas
            SET estado = 'CERRADA'
            WHERE id_apertura = ?
        `, [idCierre]);

        // ======================================================
        // COMMIT
        // ======================================================
        await connection.commit();

        res.json({
            ok: true
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: "Error generando cierre"
        });

    } finally {
        connection.release();
    }
});

// ======================================================
// CIERRES POR FECHA - consulta
// ======================================================
router.get('/desde/:desde/hasta/:hasta', async (req, res) => {

    try {
        const { desde, hasta } = req.params;
        const [rows] = await db.query(`
            SELECT *
            FROM cierres_cab
            WHERE fecha >= ?
            AND fecha <= ?
            ORDER BY fecha DESC, id_cierre DESC
        `, [desde, hasta]);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo cierres'
        });
    }
});


// ======================================================
// obtener DETALLE CIERRE
// ======================================================
router.get('/:id/detalle', async (req, res) => {

    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT *
            FROM cierres_det
            WHERE id_cierre = ?
            ORDER BY tipo, id_fpago
        `, [id]);

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo detalle'
        });
    }
});


// ======================================================
// OBTENER ULTIMO CIERRE
// ======================================================
router.get('/ultimo', async (req, res) => {

    try {
        const [rows] = await db.query(`
            SELECT *
            FROM cierres_cab
            ORDER BY id_cierre DESC
            LIMIT 1
        `);

        if (rows.length === 0) {
            return res.json(null);
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo último cierre'
        });
    }
});

// ======================================================
// ANULAR CIERRE
// ======================================================
router.post('/anular/:id', async (req, res) => {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        const { id } = req.params;
        const { usuario } = req.body;

        // =========================
        // ELIMINAR DETALLE
        // =========================

        await connection.query(`
            DELETE FROM cierres_det
            WHERE id_cierre = ?
        `, [id]);

        // =========================
        // ELIMINAR CABECERA
        // =========================

        await connection.query(`
            DELETE FROM cierres_cab
            WHERE id_cierre = ?
        `, [id]);

        // =========================
        // DESMARCAR VENTAS
        // =========================

        await connection.query(`
            UPDATE ventas_cab
            SET id_cierre = 0
            WHERE id_cierre = ?
        `, [id]);

        // =========================
        // DESMARCAR MOVIMIENTOS
        // =========================

        await connection.query(`
            UPDATE movimientos
            SET id_cierre = 0
            WHERE id_cierre = ?
        `, [id]);

        // =========================
        // DESMARCAR COMPRAS
        // =========================

        await connection.query(`
            UPDATE compras_cab
            SET id_cierre = 0
            WHERE id_cierre = ?
        `, [id]);

        // =========================
        // REABRIR APERTURA
        // =========================

        await connection.query(`
            UPDATE aperturas
            SET estado = 'ABIERTA'
            WHERE id_apertura = ?
        `, [id]);

        // =========================
        // AUDITORIA
        // =========================

        await connection.query(`
            INSERT INTO cierres_anulados
            (
                id_cierre,
                usuario,
                fecha,
                hora
            )
            VALUES
            (?, ?, CURDATE(), CURTIME())
        `, [
            id,
            usuario
        ]);

        await connection.commit();

        res.json({
            ok: true
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error anulando cierre'
        });

    } finally {

        connection.release();
    }
});

// ======================================================
// obtener CABECERA CIERRE
// ======================================================
router.get('/:id', async (req, res) => {

    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT *
            FROM cierres_cab
            WHERE id_cierre = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Cierre no encontrado'
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo cierre'
        });
    }
});


module.exports = router;
