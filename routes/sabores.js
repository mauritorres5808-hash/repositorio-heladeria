const express = require('express');
const router = express.Router();
const db = require('../db');


// ==========================================
// LISTAR SABORES
// ==========================================
router.get('/', async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT s.*, ts.descripcion AS desc_tipo_sabor
      FROM SABORES s
      LEFT JOIN TIPO_SABORES ts
        ON s.id_tipo_sabor = ts.id_tipo_sabor
      ORDER BY s.id_sabor
    `);

    res.json(rows);

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: 'Error listando sabores' });

  }
});

router.get('/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const [rows] = await db.query(`
      SELECT *
      FROM SABORES
      WHERE id_sabor = ?
    `, [id]);

    if (rows.length === 0) {
      return res.json({ error: 'No encontrado' });
    }

    res.json(rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error obteniendo sabor'
    });
  }
});

// ==========================================
// INSERTAR SABOR
// ==========================================
router.post('/', async (req, res) => {

  try {

    const {
		  id_tipo_sabor,
		  descripcion,
		  contenido,
		  deshabilitado
		} = req.body;

    const [result] = await db.query(`
      INSERT INTO SABORES
      (id_tipo_sabor, descripcion, contenido, deshabilitado)
      VALUES (?, ?, ?, 0)
    `, [id_tipo_sabor, descripcion, contenido]);

    res.json({ ok: true, id: result.insertId });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: 'Error creando sabor' });

  }
});


// ==========================================
// EDITAR SABOR
// ==========================================
router.put('/:id', async (req, res) => {

  try {

    const id = req.params.id;
    const { id_tipo_sabor, descripcion, contenido, deshabilitado } = req.body;

    await db.query(`
      UPDATE SABORES
      SET id_tipo_sabor = ?,
          descripcion = ?,
          contenido = ?,
		  deshabilitado = ?
      WHERE id_sabor = ?
    `, [id_tipo_sabor, descripcion, contenido, deshabilitado, id]);

    res.json({ ok: true });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: 'Error editando sabor' });

  }
});


// ==========================================
// ELIMINAR LÓGICO
// ==========================================
router.delete('/:id', async (req, res) => {

  try {

    const id = req.params.id;

    await db.query(`
      UPDATE SABORES
      SET deshabilitado = 1
      WHERE id_sabor = ?
    `, [id]);

    res.json({ ok: true });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: 'Error eliminando sabor' });

  }
});


module.exports = router;
