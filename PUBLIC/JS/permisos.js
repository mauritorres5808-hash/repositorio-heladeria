// permisos.js optimizado

window.usuarioActual = null;
window.permisosUsuario = [];

// Al cargar la página, verificar si ya está en localStorage
const datosGuardados = localStorage.getItem("usuarioData");

// ============================
// 1) Si ya está guardado → NO leer Firestore
// ============================
if (datosGuardados) {
    const data = JSON.parse(datosGuardados);
    window.usuarioActual = data.user;
    window.permisosUsuario = data.permisos;

    console.log("Usuario cargado desde localStorage:", data.user.email);
    console.log("Permisos cargados:", data.permisos);

	 // Ejecuta aplicarPermisos si existe
		if (typeof window.aplicarPermisos === "function") {
			setTimeout(() => aplicarPermisos(), 50);
		}
}


// ============================
// 2) Si NO está guardado → leer Firestore SOLO UNA VEZ
// ============================
firebase.auth().onAuthStateChanged(async user => {

    if (!user) {
        alert("Debe iniciar sesión para acceder al sistema.");
        window.location.href = "login.html";
        return;
    }

    // Si ya estaba cargado desde localStorage → no hacer nada
    if (window.usuarioActual) return;

    try {
console.log("lectura de datos");
        const email = user.email;

        const snapUser = await db.collection("USUARIOS")
                                 .where("email", "==", email).get();

        if (snapUser.empty) {
            alert("⚠️ No se encontró un usuario con este email en la base de datos.");
            window.location.href = "login.html";
            return;
        }

        const dataUser = snapUser.docs[0].data();
        window.usuarioActual = dataUser;

        let permisos = [];

        if (dataUser.nivel === 2) {
            // Supervisor: permiso total
            const funcionesSnap = await db.collection("FUNCIONES").get();
            permisos = funcionesSnap.docs.map(doc => doc.data().id_funcion);
        } else {
            const permisosSnap = await db.collection("USUARIOS_FUNCIONES")
                                         .where("id_usuario", "==", dataUser.id_usuario)
                                         .get();
            permisos = permisosSnap.docs.map(doc => doc.data().id_funcion);
        }

        window.permisosUsuario = permisos;

        // GUARDAR TODO EN localStorage
        localStorage.setItem("usuarioData", JSON.stringify({
            user: dataUser,
            permisos: permisos
        }));

        console.log("Datos guardados en localStorage:", dataUser.email, permisos);

        // Ejecuta la función de la página si existe
        if (typeof window.aplicarPermisos === "function") {
            aplicarPermisos();
        }

    } catch (err) {
        console.error("Error al cargar permisos:", err);
    }
});


// === Función de utilidad ===
window.tienePermiso = function(idFuncion) {
  if (!window.usuarioActual) return false;
  if (window.usuarioActual.nivel === 2) return true;
  return window.permisosUsuario.includes(idFuncion);
};
