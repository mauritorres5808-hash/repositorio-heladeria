// === Verificar sesión y cargar Firestore ===
// Este script debe incluirse después de Firebase y antes de usar Firestore


// ==============================
//  CONFIG FIREBASE
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyAo0PavzSFhTVMJ7zbjK77gRgoLCTXYmqo",
  authDomain: "donado-2.firebaseapp.com",
  projectId: "donado-2"
};
// Inicializar Firebase (solo si no está inicializado)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();


// ==============================
//   VERIFICAR SESIÓN GLOBAL
// ==============================
// Esta función debe ser llamada en TODAS las páginas
// excepto login.html
// Carga el usuario desde Auth (GRATIS)
// Carga permisos SOLO UNA VEZ desde Firestore
// Los guarda en localStorage para no recargar cada página

function verificarSesion() {
  firebase.auth().onAuthStateChanged(async (user) => {

    if (!user) {
		// 🔹 No autenticado → redirige a login
		alert("⚠️ Debe iniciar sesión para acceder a esta página.");
		window.location.href = "login.html";
      return;
    }
    // Guardar datos básicos del usuario (NO consumen Firestore)
    localStorage.setItem("usuarioEmail", user.email);
    localStorage.setItem("usuarioUID", user.uid);
  });
}


// ==============================
//   FUNCIÓN PARA CERRAR SESIÓN
// ==============================

async function cerrarSesion() {
  await firebase.auth().signOut();

  // Limpiar datos guardados
  localStorage.removeItem("usuarioEmail");
  localStorage.removeItem("usuarioUID");
  localStorage.removeItem("userData");

  window.location.href = "login.html";
}
