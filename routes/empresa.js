const express = require('express');
const router = express.Router();

const db = require('../db');


// ==========================================
// OBTENER DATOS EMPRESA
// ==========================================
router.get('/', async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT *
      FROM empresa
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Empresa no encontrada'
      });
    }

	res.json(rows[0]);	

  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Error obteniendo empresa'});
  }
});

// ==========================================
// MODIFICAR EMPRESA
// ==========================================
router.put('/', async (req, res) => {

    try {

        const {
            nombre,
            domicilio,
            telefono,
            fecha_vigencia,
            deshabilitada
        } = req.body;

        await db.query(`
            UPDATE empresa
            SET
                nombre = ?,
                domicilio = ?,
                telefono = ?,
                fecha_vigencia = ?,
                deshabilitada = ?
            WHERE id_empresa = 1
        `, [
            nombre,
            domicilio,
            telefono,
            fecha_vigencia,
            deshabilitada ? 1 : 0
        ]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            error: 'Error actualizando empresa'
        });
    }
});


module.exports = router;
