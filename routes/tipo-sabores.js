const express = require('express');
const router = express.Router();

const db = require('../db');


// ==========================================
// LISTAR TIPOS
// ==========================================
router.get('/', async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT *
      FROM TIPO_SABORES
      ORDER BY id_tipo_sabor
    `);

    res.json(rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error obteniendo tipos sabores'
    });
  }
});


// ==========================================
// OBTENER POR ID
// ==========================================
router.get('/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const [rows] = await db.query(`
      SELECT *
      FROM TIPO_SABORES
      WHERE id_tipo_sabor = ?
    `, [id]);

    if (rows.length === 0) {

      return res.json({
        error: 'No encontrado'
      });
    }

    res.json(rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error obteniendo tipo sabor'
    });
  }
});


// ==========================================
// INSERTAR
// ==========================================
router.post('/', async (req, res) => {

  try {

    const {
      descripcion,
      deshabilitado
    } = req.body;

    const [result] = await db.query(`
      INSERT INTO TIPO_SABORES
      (
        descripcion,
        deshabilitado
      )
      VALUES (?, ?)
    `, [
      descripcion,
      deshabilitado
    ]);

    res.json({
      ok: true,
      id: result.insertId
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error creando tipo sabor'
    });
  }
});


// ==========================================
// MODIFICAR
// ==========================================
router.put('/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const {
      descripcion,
      deshabilitado
    } = req.body;

    await db.query(`
      UPDATE TIPO_SABORES
      SET descripcion = ?,
          deshabilitado = ?
      WHERE id_tipo_sabor = ?
    `, [
      descripcion,
      deshabilitado,
      id
    ]);

    res.json({
      ok: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error editando tipo sabor'
    });
  }
});


module.exports = router;
