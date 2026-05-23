async function verificarSesion() {

    try {

        const resp = await fetch('/api/session');

        if (!resp.ok) {

            window.location.href = 'login.html';
            return;
        }

    } catch (err) {

        window.location.href = 'login.html';
    }
}


async function logout() {

    await fetch('/api/logout', {

        method: 'POST'
    });

    localStorage.clear();

    window.location.href = 'login.html';
}


// ==========================================
// DATOS USUARIO
// ==========================================

function obtenerUsuario() {

    return JSON.parse(
        localStorage.getItem("usuarioData")
    );
}


function obtenerNivelUsuario() {

    return parseInt(
        localStorage.getItem("usuarioNivel") || "0"
    );
}


function esAdministrador() {

    return obtenerNivelUsuario() === 1;
}


function esVendedor() {

    return obtenerNivelUsuario() === 2;
}
