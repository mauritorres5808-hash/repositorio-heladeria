const express = require('express');
const router = express.Router();
const db = require('../db');


// ======================================================
// GET ULTIMAS APERTURAS
// ======================================================
router.get('/', async (req, res) => {

    try {

        const [rows] = await db.query(`
			SELECT
				id_apertura,
				DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
				hora,
				usuario,
				importe_inicial,
				estado
			FROM aperturas
			ORDER BY id_apertura DESC
        `);

        res.json(rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo aperturas'
        });
    }
});


// ======================================================
// INSERTAR APERTURA
// ======================================================
router.post('/', async (req, res) => {

    try {

        const {
            hora,
            fecha,
            importe_inicial,
            observaciones,
            usuario,
            estado
        } = req.body;

        const [result] = await db.query(`
            INSERT INTO aperturas
            (
                hora,
                fecha,
                importe_inicial,
                observaciones,
                usuario,
                estado
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            hora,
            fecha,
            importe_inicial,
            observaciones,
            usuario,
            estado
        ]);

        res.json({
            ok: true,
            id_apertura: result.insertId
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error creando apertura'
        });
    }
});

// ======================================================
// VERIFICAR SI HAY CAJA ABIERTA
// ======================================================
router.get('/abierta', async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT *
            FROM aperturas
            WHERE estado = 'ABIERTA'
            LIMIT 1
        `);

        res.json({
            ok: true,
            abierta: rows.length > 0,
            apertura: rows.length > 0 ? rows[0] : null
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error verificando caja'
        });
    }
});


module.exports = router;
