const express = require('express');
const router = express.Router();

const db = require('../db');


// ==========================================
// LISTAR CLIENTES
// ==========================================
router.get('/', async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT *
      FROM clientes
      ORDER BY nombre
    `);

    res.json(rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error obteniendo clientes'
    });
  }
});


// ==========================================
// ALTA CLIENTE
// ==========================================
router.post('/', async (req, res) => {

  try {

    const {
      nombre,
      domicilio,
      telefono,
      nota,
      deshabilitado
    } = req.body;

    const [ultimo] = await db.query(`
      SELECT MAX(id_cliente) AS ultimo
      FROM clientes
    `);

    const nuevoId = (ultimo[0].ultimo || 0) + 1;

    await db.query(`
      INSERT INTO clientes
      (
        id_cliente,
        nombre,
        domicilio,
        telefono,
        nota,
        deshabilitado
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      nuevoId,
      nombre,
      domicilio,
      telefono,
      nota,
      deshabilitado
    ]);

    res.json({
      ok: true,
      id_cliente: nuevoId
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error agregando cliente'
    });
  }
});

// ==========================================
// MODIFICAR CLIENTE
// ==========================================
router.put('/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const {
      nombre,
      domicilio,
      telefono,
      nota,
      deshabilitado
    } = req.body;

    await db.query(`
      UPDATE clientes
      SET nombre = ?,
          domicilio = ?,
          telefono = ?,
          nota = ?,
          deshabilitado = ?
      WHERE id_cliente = ?
    `, [
      nombre,
      domicilio,
      telefono,
      nota,
      deshabilitado,
      id
    ]);

    res.json({
      ok: true
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error modificando cliente'
    });
  }
});

// ==========================================
// BUSCAR CLIENTES
// ==========================================
router.get('/buscar', async (req, res) => {

    try {
        const texto = req.query.texto || '';

        const [clientes] = await db.query(`
            SELECT
                id_cliente,
                nombre,
                telefono
            FROM clientes
            WHERE nombre LIKE ?
            ORDER BY nombre ASC
            LIMIT 20
        `, [`%${texto}%`]);

        res.json({
            ok: true,
            clientes
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
// OBTENER CLIENTE POR ID
// ==========================================
router.get('/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const [rows] = await db.query(`
      SELECT *
      FROM clientes
      WHERE id_cliente = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Cliente no encontrado'
      });
    }

	res.json(rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error obteniendo cliente'
    });
  }
});

// ======================================
// ELIMINAR 
// ======================================
router.delete('/:id', async (req, res) => {

    const conn = await db.getConnection();

    try {
        const id = parseInt(req.params.id);
        await conn.beginTransaction();

        // ==========================
        // BORRAR 
        // ==========================
        const [result] = await conn.query(`
            DELETE FROM clientes
            WHERE id_cliente = ?
        `, [id]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({
                ok: false,
                mensaje: 'Cliente no encontrado'
            });
        }

        await conn.commit();

        res.json({
            ok: true,
            mensaje: 'Cliente eliminado correctamente'
        });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: '- ERROR eliminando Cliente -'
        });

    } finally {
        conn.release();
    }
});


module.exports = router;
