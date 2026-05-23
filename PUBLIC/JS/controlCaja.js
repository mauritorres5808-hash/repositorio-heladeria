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
//        fontSize: "1.8rem",
        fontSize: "1.2rem",
        textAlign: "center",
        maxWidth: "800px",
        boxShadow: "0 0 20px rgba(0,0,0,0.3)"
    });

    cartel.innerHTML = `
        <strong>⚠️ ${mensaje}</strong><br><br>

        <button id="btnAceptar" style="
            padding:10px 25px;
            font-size:1.2rem;
            border:none;
            border-radius:8px;
            background-color:#007bff;
            color:white;
            cursor:pointer;
        ">
            ${botonTexto}
        </button>
    `;

    overlay.appendChild(cartel);

    document.body.appendChild(overlay);

    cartel.querySelector("#btnAceptar").onclick = () => {

        if (redireccion) {
            window.location.href = redireccion;
        } else {
            overlay.remove();
        }
    };
}


// ======================================================
// VERIFICAR APERTURA ACTIVA
// ======================================================

async function verificarAperturaActiva(
    redireccion = "apertura-caja.html"
) {

    try {

        const response = await fetch("/api/aperturas/abierta");

        const data = await response.json();

        if (!data.abierta) {

            mostrarCartel(
                "NO EXISTE UNA APERTURA DE CAJA<br>Debe realizar la apertura primero",
                "Salir",
                redireccion
            );
        }

    } catch (error) {

        console.error(error);

        mostrarCartel(
            "Error verificando apertura de caja"
        );
    }
}


// ======================================================
// VERIFICAR SI YA HAY CAJA ABIERTA
// ======================================================
async function verificarCajaYaAbierta(redireccion = "menu-caja.html") 
{
    try {
        const response = await fetch("/api/aperturas/abierta");
        const data = await response.json();

        if (data.abierta) {
            mostrarCartel(
                "YA EXISTE UNA CAJA ABIERTA<br>No puede abrir otra",
                "Salir",
                redireccion
            );
            return true;
        }
        return false;

    } catch (error) {
        console.error(error);
        mostrarCartel(
            "Error verificando caja abierta"
        );

        return true;
    }
}

// ======================================================
// VERIFICAR CAJA PARA CIERRE
// ======================================================

async function verificarCajaParaCierre(
    redireccion = "menu-caja.html"
) {

    try {

        const response = await fetch("/api/aperturas/abierta");

        const data = await response.json();

        if (!data.abierta) {

            mostrarCartel(
                "NO EXISTE UNA CAJA ABIERTA<br>No puede realizar un cierre",
                "Ir al menú",
                redireccion
            );
        }

    } catch (error) {

        console.error(error);

        mostrarCartel(
            "Error verificando caja"
        );
    }
}
