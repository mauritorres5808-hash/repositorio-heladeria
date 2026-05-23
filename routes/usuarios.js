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
      FROM USUARIOS
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
// GUARDAR USUARIO
// INSERT o UPDATE
// ========================================
router.post('/', async (req, res) => {

    try {

        const {
            id_usuario,
            nombre,
            email,
            deshabilitado,
            nivel
        } = req.body;

        // Verificar si existe
        const [existe] = await db.query(`
            SELECT id_usuario
            FROM usuarios
            WHERE id_usuario = ?
        `, [id_usuario]);

        if (existe.length > 0) {

            // UPDATE
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
                id_usuario
            ]);

        } else {

            // INSERT
            await db.query(`
                INSERT INTO usuarios
                (
                    id_usuario,
                    nombre,
                    email,
					deshabilitado,
                    nivel
                )
                VALUES (?, ?, ?, ?, ?)
            `, [
                id_usuario,
                nombre,
                email,
				deshabilitado,
                nivel
            ]);
        }

        res.json({
            ok: true
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
