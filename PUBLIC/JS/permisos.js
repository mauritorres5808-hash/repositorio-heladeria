let permisosUsuario = [];

// ============================================
// CARGAR PERMISOS DEL USUARIO
// ============================================
async function cargarPermisosUsuario() {

    try {

        // Si es ADMIN → acceso total
        const nivel = localStorage.getItem("usuarioNivel");

        if (nivel == "2") {   //supervisor
            permisosUsuario = ["ADMIN"];
            return;
        }

        const idUsuario = localStorage.getItem("usuarioId");

        if (!idUsuario) {
            console.error("No existe usuarioId");
            return;
        }

        const resp = await fetch(`/api/permisos/${idUsuario}`);
        const data = await resp.json();

		permisosUsuario = data.map(x => Number(x.id_funcion));

        // Guardar cache local
        localStorage.setItem("permisosUsuario",JSON.stringify(permisosUsuario));
console.log("permisos:", permisosUsuario);
//console.log("tipo:", typeof permisosUsuario[0]);
    } catch (error) {

        console.error("Error cargando permisos:", error);
    }
}

// ============================================
// VERIFICAR SI TIENE PERMISO
// ============================================
function tienePermiso(idFuncion) {

idFuncion = Number(idFuncion);

    // ADMIN = acceso total
    if (permisosUsuario.includes("ADMIN")) {
        return true;
    }
console.log("permisosUsuario:"+permisosUsuario);
//console.log("funcion:", idFuncion);
console.log("para la funcion:", idFuncion + " tiene permiso?:" + permisosUsuario.includes(idFuncion));

    return permisosUsuario.includes(idFuncion);
}
