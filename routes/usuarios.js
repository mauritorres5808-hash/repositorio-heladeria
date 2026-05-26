const express = require('express');
const router = express.Router();

const db = require('../db');


// ==========================================
// LOGIN
// ==========================================
router.post('/login', async (req, res) => {

  try {

    const { email, password } = req.body;

    const [rows] = await db.query(`
      SELECT *
      FROM usuarios
      WHERE email = ?
      AND password = ?
      AND deshabilitado = 0
      LIMIT 1
    `, [email, password]);

    if (rows.length === 0) {

      return res.json({
        ok: false,
        mensaje: 'Usuario o contraseña incorrectos'
      });

    }

    const usuario = rows[0];

	// VALIDAR PASSWORD
	if (usuario.password !== password) {

		return res.json({
			ok: false
		});
	}

        // ==========================
        // CREAR SESION
        // ==========================
        req.session.usuario = {
            id_usuario: usuario.id_usuario,
            email: usuario.email,
			nombre: usuario.nombre,
            nivel: usuario.nivel
        };

        res.json({
            ok: true,
            usuario
        });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      error: 'Error en login'
    });

  }

});


// ========================================
// LISTAR USUARIOS
// ========================================
router.get('/', async (req, res) => {

    try {

        const [rows] = await db.query(`
            SELECT
                id_usuario,
                nombre,
                email,
                deshabilitado,
                nivel
            FROM usuarios
            ORDER BY id_usuario
        `);

        res.json({
            ok: true,
            usuarios: rows
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo usuarios'
        });
    }
});

// ========================================
// OBTENER USUARIO POR ID
// ========================================
router.get('/:id', async (req, res) => {

    try {

        const id = parseInt(req.params.id);

        const [rows] = await db.query(`
            SELECT
                id_usuario,
                nombre,
                email,
                deshabilitado,
                nivel
            FROM usuarios
            WHERE id_usuario = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {

            return res.json({
                error: 'Usuario no encontrado'
            });
        }

        res.json(rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error obteniendo usuario'
        });
    }
});

// ========================================
// ALTA USUARIO
// ========================================
router.post('/', async (req, res) => {

    try {

        const {
            nombre,
            email,
            deshabilitado,
            nivel
        } = req.body;

        const [result] = await db.query(`
            INSERT INTO usuarios
            (
                nombre,
                email,
                deshabilitado,
                nivel
            )
            VALUES (?, ?, ?, ?)
        `, [
            nombre,
            email,
            deshabilitado,
            nivel
        ]);

        res.json({
            ok: true,
            id: result.insertId
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error guardando usuario'
        });
    }
});


// ========================================
// MODIFICAR USUARIO
// ========================================
router.put('/:id', async (req, res) => {

    try {

        const id = parseInt(req.params.id);

        const {
            nombre,
            email,
            deshabilitado,
            nivel
        } = req.body;

        await db.query(`
            UPDATE usuarios
            SET
                nombre = ?,
                email = ?,
                deshabilitado = ?,
                nivel = ?
            WHERE id_usuario = ?
        `, [
            nombre,
            email,
            deshabilitado,
            nivel,
            id
        ]);

        res.json({
            ok: true
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: 'Error actualizando usuario'
        });
    }
});


// ========================================
// CAMBIAR PASSWORD
// ========================================
router.post('/cambiar-password', async (req, res) => {

    try {

        const {
            email,
            passActual,
            passNueva
        } = req.body;

        // Buscar usuario
        const [rows] = await db.query(`
            SELECT
                id_usuario,
                password
            FROM usuarios
            WHERE email = ?
            LIMIT 1
        `, [email]);

        if (rows.length === 0) {

            return res.json({
                ok: false,
                mensaje: 'Usuario no encontrado'
            });
        }

        const usuario = rows[0];

        // Validar password actual
        if (usuario.password !== passActual) {

            return res.json({
                ok: false,
                mensaje: 'La contraseña actual es incorrecta'
            });
        }

        // Actualizar password
        await db.query(`
            UPDATE usuarios
            SET password = ?
            WHERE id_usuario = ?
        `, [
            passNueva,
            usuario.id_usuario
        ]);

        res.json({
            ok: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error cambiando contraseña'
        });
    }
});

module.exports = router;
