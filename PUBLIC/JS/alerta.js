// === ALERTA GLOBAL REUTILIZABLE ===

// Muestra la alerta
function mostrarAlerta(tipo, icono, texto) {
  const modal = document.getElementById("alertaGlobal");
  const contenido = document.querySelector(".alerta-contenido");
  const iconoElem = document.getElementById("alertaIcono");
  const textoElem = document.getElementById("alertaTexto");

  // Limpiar estilos anteriores
  contenido.classList.remove("alerta-exito", "alerta-error", "alerta-advertencia");

  // Estilo según tipo
  switch (tipo) {
    case "exito": contenido.classList.add("alerta-exito"); break;
    case "error": contenido.classList.add("alerta-error"); break;
    case "advertencia": contenido.classList.add("alerta-advertencia"); break;
    default: contenido.classList.add("alerta-advertencia");
  }

  // Convertir icono a emoji real
  iconoElem.textContent = convertirIcono(icono);

  textoElem.textContent = texto;
  modal.style.display = "flex";
}

// Ocultar
function cerrarAlerta() {
  document.getElementById("alertaGlobal").style.display = "none";
}


// ================================
//  FUNCIÓN QUE CONVIERTE ICONOS
// ================================
function convertirIcono(icono) {
  if (!icono) return "ℹ️";

  // 1) Emoji real → lo devolvemos directamente
  if (/[\u2190-\u2BFF\u2600-\u27BF\uFE0F]/.test(icono)) {
    return icono;
  }

  // 2) Código HTML:  "&#9888;"
  if (icono.startsWith("&#")) {
    try {
      const num = parseInt(icono.replace(/[&#;]/g, ""), 10);
      return String.fromCodePoint(num);
    } catch {
      return "ℹ️";
    }
  }

  // 3) Unicode: "U+26A0"
  if (icono.startsWith("U+")) {
    try {
      const hex = icono.replace("U+", "");
      return String.fromCodePoint(parseInt(hex, 16));
    } catch {
      return "ℹ️";
    }
  }

  // 4) Alias conocidos
  const alias = {
    "warning": "⚠️",
    "error": "❌",
    "ok": "✅",
    "info": "ℹ️"
  };

  if (alias[icono.toLowerCase()]) {
    return alias[icono.toLowerCase()];
  }

  // Si nada coincide, devolvemos info
  return "ℹ️";
}


// Ocultar alerta
function cerrarAlerta() {
  document.getElementById("alertaGlobal").style.display = "none";
}
