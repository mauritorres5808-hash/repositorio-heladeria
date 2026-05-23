const express = require('express');
const router = express.Router();

const db = require('../db');


// =========================================
// USUARIOS
// =========================================
router.get('/usuarios', async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT
        id_usuario,
        nombre
      FROM usuarios
      WHERE nivel = 1
      AND deshabilitado = 0
      ORDER BY nombre
    `);

    res.json({
      ok: true,
      usuarios: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false
    });
  }
});


// =========================================
// MODULOS
// =========================================
router.get('/modulos', async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT
        id_modulo,
        descripcion
      FROM modulos
      ORDER BY descripcion
    `);

    res.json({
      ok: true,
      modulos: rows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false
    });
  }
});


// =========================================
// FUNCIONES + PERMISOS
// =========================================
router.get('/funciones', async (req, res) => {

  try {

    const id_usuario =
        parseInt(req.query.id_usuario);

    const id_modulo =
        parseInt(req.query.id_modulo);

    const [funciones] =
        await db.query(`
          SELECT
            id_funcion,
            descripcion
          FROM funciones
          WHERE id_modulo = ?
          ORDER BY id_funcion
        `, [id_modulo]);

    const [permisos] =
        await db.query(`
          SELECT
            id_funcion
          FROM usuarios_funciones
          WHERE id_usuario = ?
        `, [id_usuario]);

    res.json({

      ok: true,

      funciones,

      permisos:
          permisos.map(p => p.id_funcion)
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false
    });
  }
});


// =========================================
// GUARDAR PERMISOS
// =========================================
router.post('/guardar', async (req, res) => {

  const conn =
      await db.getConnection();

  try {

    const {
      id_usuario,
      id_modulo,
      funciones
    } = req.body;

    await conn.beginTransaction();

    // borrar permisos anteriores
    await conn.query(`
      DELETE uf
      FROM usuarios_funciones uf
      INNER JOIN funciones f
        ON f.id_funcion = uf.id_funcion
      WHERE uf.id_usuario = ?
      AND f.id_modulo = ?
    `, [
      id_usuario,
      id_modulo
    ]);

    // insertar nuevos
    for (const idf of funciones) {

      await conn.query(`
        INSERT INTO usuarios_funciones
        (
          id_usuario,
          id_funcion
        )
        VALUES (?, ?)
      `, [
        id_usuario,
        idf
      ]);
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
