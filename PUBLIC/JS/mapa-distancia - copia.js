/* ---------------------------------------------------------
   MAPA DISTANCIA – Reutilizable en cualquier página
   Requiere Leaflet:
   <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
   <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
-----------------------------------------------------------*/

// Crear modal cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("modalMapa")) return;

    const modal = document.createElement("div");
    modal.id = "modalMapa";
    modal.style.cssText = `
        display:none;
        position:fixed;
        top:0; left:0;
        width:100%; height:100%;
        background:rgba(0,0,0,0.6);
        justify-content:center;
        align-items:center;
        z-index:9999;
    `;

    modal.innerHTML = `
        <div style="
            background:white; 
            padding:10px; 
            border-radius:8px;
            width:95%; 
            max-width:850px; 
            height:88%; 
            display:flex;
            flex-direction:column;
        ">
        
            <!-- Barra superior -->
            <div style="
                display:flex; 
                align-items:center;
                justify-content:space-between;
                background:#f0f0f0;
                padding:6px 10px;
                border-radius:6px;
                font-size:15px;
                font-weight:bold;
            ">
                <button onclick="cerrarMapa()" 
                    style="padding:6px 12px; border:none; background:#d9534f; color:white; border-radius:5px;">
                    Cerrar
                </button>

                <!-- BOTONES MODO -->
                <div style="display:flex; gap:6px;">
                    <button id="btnModoAuto"
                        style="padding:6px 10px; border-radius:6px; border:1px solid #666; background:#007bff; color:white;">
                        🚗 Auto
                    </button>
                    <button id="btnModoCaminando"
                        style="padding:6px 10px; border-radius:6px; border:1px solid #666; background:#e0e0e0; color:#000;">
                        🚶 Caminando
                    </button>
                </div>

                <!-- BOTON RECALCULAR -->
                <button id="btnRecalcular"
                    style="padding:6px 12px; border:none; background:#5bc0de; color:white; border-radius:5px;">
                    🔄 Recalcular ruta
                </button>

                <!-- DISTANCIA -->
                <span id="distanciaTexto" style="margin-left:10px;">Distancia: ...</span>
            </div>

            <!-- MAPA -->
            <div id="mapaDistancia" style="flex:1; margin-top:10px; border:1px solid #ccc;"></div>
        </div>
    `;

    document.body.appendChild(modal);

    // Eventos de botones
    document.getElementById("btnModoAuto").addEventListener("click", () => seleccionarModo("auto"));
    document.getElementById("btnModoCaminando").addEventListener("click", () => seleccionarModo("caminando"));
    document.getElementById("btnRecalcular").addEventListener("click", () => recalcularRuta());
});


// Variables globales
let direccion1 = "";
let direccion2 = "";
let modoSeleccionado = "auto";  // auto / caminando
let UltCoord1 = null;
let UltCoord2 = null;


// ------------------------------------------------------------
// Selección de modo
// ------------------------------------------------------------
function seleccionarModo(m) {
    modoSeleccionado = m;

    const btnAuto = document.getElementById("btnModoAuto");
    const btnCam = document.getElementById("btnModoCaminando");

    if (m === "auto") {
        btnAuto.style.background = "#007bff";
        btnAuto.style.color = "white";

        btnCam.style.background = "#e0e0e0";
        btnCam.style.color = "#000";
    } else {
        btnCam.style.background = "#007bff";
        btnCam.style.color = "white";

        btnAuto.style.background = "#e0e0e0";
        btnAuto.style.color = "#000";
    }
}


// ------------------------------------------------------------
// Cerrar el modal
// ------------------------------------------------------------
function cerrarMapa() {
    document.getElementById("modalMapa").style.display = "none";
}


// ------------------------------------------------------------
// Mostrar mapa distancia
// ------------------------------------------------------------
async function mostrarMapaDistancia(dir1, dir2) {

    direccion1 = dir1;
    direccion2 = dir2;

    document.getElementById("modalMapa").style.display = "flex";

    seleccionarModo("auto");  // modo por defecto

    await calcularYMostrarRuta();
}


// ------------------------------------------------------------
// Recalcular ruta al cambiar modo
// ------------------------------------------------------------
async function recalcularRuta() {
    await calcularYMostrarRuta();
}


// ------------------------------------------------------------
// Geocodificación de dirección → coordenadas
// ------------------------------------------------------------
async function geocodificar(direccion) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&addressdetails=1`;

    const resp = await fetch(url, {
        headers: { "User-Agent": "MiSistemaDelivery/1.0" }
    });

    const data = await resp.json();
    if (!data.length) return null;

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };
}


// ------------------------------------------------------------
// Cálculo y render de la ruta
// ------------------------------------------------------------
async function calcularYMostrarRuta() {

    // Coordenadas
    UltCoord1 = await geocodificar(direccion1);
    UltCoord2 = await geocodificar(direccion2);

    if (!UltCoord1 || !UltCoord2) {
        document.getElementById("distanciaTexto").innerText = "Error obteniendo coordenadas.";
        return;
    }

    const perfil = modoSeleccionado === "auto" ? "driving" : "foot";

    const urlRoute =
        `https://router.project-osrm.org/route/v1/${perfil}/` +
        `${UltCoord1.lon},${UltCoord1.lat};${UltCoord2.lon},${UltCoord2.lat}` +
        `?overview=full&geometries=geojson`;

    const resp = await fetch(urlRoute);
    const data = await resp.json();

    if (!data.routes || !data.routes.length) {
        document.getElementById("distanciaTexto").innerText = "Ruta no encontrada";
        return;
    }

    const distanciaKm = (data.routes[0].distance / 1000).toFixed(2);
    document.getElementById("distanciaTexto").innerText = `Distancia: ${distanciaKm} km`;

    // Dibujar mapa
    if (window.mapaLeaflet) window.mapaLeaflet.remove();

    window.mapaLeaflet = L.map("mapaDistancia").setView(
        [UltCoord1.lat, UltCoord1.lon], 13
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(window.mapaLeaflet);

    // Ruta
    const ruta = data.routes[0].geometry.coordinates.map(p => [p[1], p[0]]);
    L.polyline(ruta, { color: "blue", weight: 4 }).addTo(window.mapaLeaflet);

    // Marcadores
    L.marker([UltCoord1.lat, UltCoord1.lon]).addTo(window.mapaLeaflet).bindPopup("Origen");
    L.marker([UltCoord2.lat, UltCoord2.lon]).addTo(window.mapaLeaflet).bindPopup("Destino");

    const group = new L.featureGroup([
        L.marker([UltCoord1.lat, UltCoord1.lon]),
        L.marker([UltCoord2.lat, UltCoord2.lon])
    ]);

    window.mapaLeaflet.fitBounds(group.getBounds(), { padding: [30, 30] });
}

