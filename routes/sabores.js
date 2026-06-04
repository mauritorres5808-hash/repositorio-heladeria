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
      FROM sabores s
      LEFT JOIN tipo_sabores ts
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
      FROM sabores
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
      INSERT INTO sabores
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
      UPDATE sabores
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


// ======================================
// ELIMINAR Sabor
// ======================================
router.delete('/:id', async (req, res) => {

    const conn = await db.getConnection();

    try {
        const id = parseInt(req.params.id);
		
        // ==========================
        // verifico con NO este en ningun pedido en estado (V)enta ni (N)uevo 
        // ==========================
		const [usado] = await conn.query(`
			SELECT pd.id_pedido
			FROM pedidos_det pd
			INNER JOIN pedidos_cab pc
				ON pc.id_pedido = pd.id_pedido
			WHERE pc.estado IN ('N','V')
			  AND FIND_IN_SET(?, pd.sabores) > 0
			LIMIT 1
		`, [id]);

		if (usado.length > 0) {
			return res.status(400).json({
				ok: false,
				mensaje: 'No se puede eliminar el sabor porque está utilizado en algun Pedido.'
			});
		}
		
		
        await conn.beginTransaction();

        // ==========================
        // BORRAR 
        // ==========================
        const [result] = await conn.query(`
            DELETE FROM sabores
            WHERE id_sabor = ?
        `, [id]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({
                ok: false,
                mensaje: 'Sabor no encontrado'
            });
        }

        await conn.commit();

        res.json({
            ok: true,
            mensaje: 'Sabor eliminado correctamente'
        });

    } catch (error) {
        await conn.rollback();
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: '- ERROR eliminando Sabor -'
        });

    } finally {
        conn.release();
    }
});


module.exports = router;
