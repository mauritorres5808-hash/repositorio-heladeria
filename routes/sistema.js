const express = require('express');
const router = express.Router();

const db = require('../db');


// ==========================================
// OBTENER DATOS sistema
// ==========================================
router.get('/', async (req, res) => {
 
  try {

    const [rows] = await db.query(`
      SELECT *
      FROM sistema
    `);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Sistema no encontrada'
      });
    }

	res.json(rows[0]);	

  } catch (error) {
    console.error(error);
    res.status(500).json({error: 'Error obteniendo sistema'});
  }
});

// ==========================================
// MODIFICAR sistema
// ==========================================
router.put('/', async (req, res) => {

    try {

        const {
            fecha_vigencia,
            deshabilitada
        } = req.body;

        await db.query(`
            UPDATE sistema
            SET
                fecha_vigencia = ?,
                deshabilitada = ?
        `, [
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
            error: 'Error actualizando sistema'
        });
    }
});


module.exports = router;
