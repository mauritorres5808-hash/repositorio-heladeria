const db = require('./db');

async function probarConexion() {

    try {

        const [rows] = await db.query('SELECT NOW() AS fecha');

        console.log('✅ Conexion MySQL OK');
        console.log(rows);

        process.exit();

    } catch (error) {

        console.error('❌ Error de conexion MySQL');
        console.error(error);
    }
}

probarConexion();
