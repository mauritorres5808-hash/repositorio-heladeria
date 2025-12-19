// controlCaja.js

/**
 * Muestra un cartel modal con mensaje de advertencia y opcional redirección
 */
function mostrarCartel(mensaje, botonTexto = "Aceptar", redireccion = null) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  });

  const cartel = document.createElement("div");
  Object.assign(cartel.style, {
    backgroundColor: "#fff",
    color: "#c00",
    padding: "40px",
    borderRadius: "12px",
    fontSize: "1.8rem",
    textAlign: "center",
    maxWidth: "800px",
    boxShadow: "0 0 20px rgba(0,0,0,0.3)"
  });

  cartel.innerHTML = `
    <strong>⚠️ ${mensaje}</strong><br><br>
    <button id="btnAceptar" style="
      padding:10px 25px; font-size:1.2rem;
      border:none; border-radius:8px;
      background-color:#007bff; color:white; cursor:pointer;">
      ${botonTexto}
    </button>
  `;

  overlay.appendChild(cartel);
  document.body.appendChild(overlay);

  cartel.querySelector("#btnAceptar").onclick = () => {
    if (redireccion) window.location.href = redireccion;
    else overlay.remove();
  };
}

/**
 * Verifica si existe una apertura activa.
 * Si no existe, bloquea la página y muestra mensaje.
 */
async  function verificarAperturaActiva(redireccion = "apertura-caja.html") {

    const ref = firebase.firestore().collection("APERTURAS");
    const snapshot = await ref.where("estado", "==", "ABIERTA").get();

    if (snapshot.empty) {
      mostrarCartel("NO EXISTE UNA APERTURA DE CAJA<br>Debe realizar la apertura primero", "Ir a Apertura", redireccion);
    }
  };


/**
 * Verifica si ya hay una apertura abierta (para evitar abrir otra).
 */
 async function verificarCajaYaAbierta(redireccion = "menu-caja.html") {

    const ref = firebase.firestore().collection("APERTURAS");
    const snapshot = await ref.where("estado", "==", "ABIERTA").get();

    if (!snapshot.empty) {
      mostrarCartel("YA EXISTE UNA CAJA ABIERTA<br>No puede abrir otra", "Ir al menú", redireccion);
    }
  };


/**
 * Verifica si hay apertura abierta (para permitir cierre).
 */
async  function verificarCajaParaCierre(redireccion = "menu-caja.html") {

    const ref = firebase.firestore().collection("APERTURAS");
    const snapshot = await ref.where("estado", "==", "ABIERTA").get();

    if (snapshot.empty) {
      mostrarCartel("NO EXISTE UNA CAJA ABIERTA<br>No puede realizar un cierre", "Ir al menú", redireccion);
    }
  };

