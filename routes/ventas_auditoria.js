const express = require('express');
const router = express.Router();
const db = require('../db');

// ======================================================
// INSERTAR AUDITORIA
// ======================================================

router.post('/', async (req, res) => {

    try {

        const {
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

        } = req.body;

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
                ?, ?, ?, ?,
                ?, ?, ?, ?
            )
        `, [

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

module.exports = router;
