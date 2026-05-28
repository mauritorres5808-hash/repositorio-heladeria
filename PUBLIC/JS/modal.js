// ==========================================
// MODAL GENERICO DEL SISTEMA
// ==========================================

function crearModalBase() {

  // Evitar duplicados
  if (document.getElementById("modalSistema"))
    return;

  const modal = document.createElement("div");

  modal.id = "modalSistema";

  modal.innerHTML = `
    <div id="modalSistemaBox">
		<div id="modalSistemaContenido">
			<div id="modalSistemaIcono"></div>
			<div id="modalSistemaMensaje"></div>
		</div>
		<div id="modalSistemaBotones"></div>
    </div>
  `;

  document.body.appendChild(modal);

  // =========================
  // ESTILOS
  // =========================
  const style = document.createElement("style");

  style.innerHTML = `

    #modalSistema{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,0.45);
      display:none;
      justify-content:center;
      align-items:center;
      z-index:999999;
      font-family:Arial;
    }

#modalSistemaContenido{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  margin-bottom:20px;
}

    #modalSistemaBox{
      background:white;
      width:50%;
      max-width:320px;
      border-radius:14px;
      padding:25px;
      text-align:center;
      box-shadow:0 0 25px rgba(0,0,0,0.25);
      animation:modalShow .15s ease;
    }

    @keyframes modalShow{
      from{
        transform:scale(.9);
        opacity:0;
      }
      to{
        transform:scale(1);
        opacity:1;
      }
    }

#modalSistemaIcono{
  font-size:22px;
  margin-bottom:0;
  flex-shrink:0;
}

#modalSistemaMensaje{
  font-size:14px;
  color:#333;
  line-height:1.4;
  white-space:pre-line;
  margin-bottom:0;
  text-align:left;
}

    #modalSistemaBotones{
      display:flex;
      justify-content:center;
      gap:8px;
      flex-wrap:wrap;
    }

    .modalBtn{
      border:none;
      border-radius:8px;
      padding:5px 10px;
      cursor:pointer;
      font-size:14px;
      font-weight:bold;
      min-width:110px;
    }

    .modalAceptar{
      background:#007bff;
      color:white;
    }

    .modalCancelar{
      background:#dc3545;
      color:white;
    }

    .modalAceptar:hover{
      background:#0056b3;
    }

    .modalCancelar:hover{
      background:#b02a37;
    }
  `;

  document.head.appendChild(style);
}

crearModalBase();


// ==========================================
// ALERT MODERNO
// ==========================================
function mostrarAlerta({
  mensaje = "",
  icono = "⚠️",
  textoBoton = "Aceptar"
} = {}) {

  return new Promise(resolve => {

    const modal = document.getElementById("modalSistema");

    document.getElementById("modalSistemaIcono").innerHTML = icono;
    document.getElementById("modalSistemaMensaje").innerHTML = mensaje;
    document.getElementById("modalSistemaBotones").innerHTML = `<button class="modalBtn modalAceptar" id="modalBtnAceptar"> ${textoBoton}</button>`;

    modal.style.display = "flex";

    document.getElementById(
      "modalBtnAceptar"
    ).onclick = () => {
      modal.style.display = "none";
      resolve(true);
    };
  });
}


// ==========================================
// CONFIRM MODERNO
// ==========================================
function mostrarConfirm({
  mensaje = "",
  icono = "❓",
  textoAceptar = "Aceptar",
  textoCancelar = "Cancelar"

} = {}) {

  return new Promise(resolve => {

    const modal = document.getElementById("modalSistema");

    document.getElementById("modalSistemaIcono").innerHTML = icono;
    document.getElementById("modalSistemaMensaje").innerHTML = mensaje;
    document.getElementById("modalSistemaBotones").innerHTML = `
      <button class="modalBtn modalAceptar"
        id="modalBtnAceptar">
        ${textoAceptar}
      </button>
      <button class="modalBtn modalCancelar"
        id="modalBtnCancelar">
        ${textoCancelar}
      </button>
    `;

    modal.style.display = "flex";

    document.getElementById("modalBtnAceptar").onclick = () => {
      modal.style.display = "none";
      resolve(true);
    };

    document.getElementById("modalBtnCancelar").onclick = () => {
      modal.style.display = "none";
      resolve(false);
    };

  });
}
