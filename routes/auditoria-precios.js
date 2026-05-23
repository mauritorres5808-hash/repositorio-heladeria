const express = require('express');

const router = express.Router();

const db = require('../db');


// ========================================
// INSERTAR AUDITORIA
// ========================================
router.post('/', async (req, res) => {

  try {

    const {
      id_usuario,
      usuario,
      id_grupo,
      grupo,
      tipo_cambio,
      valor_cambio
    } = req.body;

    const ahora =
        new Date();

    const fecha =
        ahora.toISOString().slice(0, 10);

    const hora =
        ahora.toTimeString().slice(0, 8);

    await db.query(`
      INSERT INTO auditoria_precios
      (
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

      fecha,
      hora,
      id_usuario,
      usuario,
      id_grupo,
      grupo,
      tipo_cambio,
      valor_cambio
    ]);

    res.json({
      ok: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      mensaje: 'Error guardando auditoría'
    });
  }
});




// =====================================
// AUDITORIA PRECIOS
// =====================================
router.get('/', async (req, res) => {

    try {

        const [rows] = await db.query(`

            SELECT
                *
            FROM auditoria_precios
            ORDER BY
                fecha DESC,
                hora DESC

        `);

        res.json({
            ok: true,
            auditoria: rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo auditoría'
        });
    }
});


module.exports = router;
