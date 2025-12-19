// ICONO AZUL - ORIGEN
const iconOrigen = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// ICONO ROJO - DESTINO
const iconDestino = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});



// ===============================
// CREAR MODAL SOLO UNA VEZ
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("modalMapa")) {

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
                max-width:800px; 
                height:85%; 
                display:flex;
                flex-direction:column;
                position:relative;
            ">
            
                <!-- Encabezado con botón y distancia -->
                <div style="
                    display:flex; 
                    justify-content:space-between; 
                    align-items:center;
                    padding:5px 10px;
                    background:#f0f0f0;
                    border-radius:6px;
                    font-weight:bold;
                ">
                    <button onclick="cerrarMapa()" 
                        style="padding:6px 12px; border:none; background:#d9534f; color:white; border-radius:5px;">
                        Cerrar
                    </button> 

                    <span id="distanciaTexto">(en auto/moto)    Distancia: ...</span>
                </div>

                <!-- Contenedor del mapa -->
                <div id="mapaDistancia" style="flex:1; margin-top:10px; border:1px solid #ccc;"></div>
            </div>
        `;

        document.body.appendChild(modal);
    }
});


// ===============================
// CERRAR MODAL
// ===============================
function cerrarMapa() {
    document.getElementById("modalMapa").style.display = "none";
}



// ===================================================
// FUNCIÓN PRINCIPAL: MOSTRAR MAPA + DISTANCIA
// ===================================================
async function mostrarMapaDistancia(dir1, dir2) {

    // Mostrar modal
    document.getElementById("modalMapa").style.display = "flex";
document.getElementById("distanciaTexto").innerText = "buscando direcciones......";
    // Convertir direcciones a coordenadas
    const coord1 = await geocodificar(dir1);
    const coord2 = await geocodificar(dir2);

    if (!coord1 || !coord2) {
        document.getElementById("distanciaTexto").innerText = "No se pudieron obtener coordenadas.";
        return;
    }

    // Llamar a OSRM para calcular ruta
    const urlRoute =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${coord1.lon},${coord1.lat};${coord2.lon},${coord2.lat}?overview=full&geometries=geojson`;

    const resp = await fetch(urlRoute);
    const data = await resp.json();

    if (!data.routes || data.routes.length === 0) {
        document.getElementById("distanciaTexto").innerText = "No se encontró ruta entre direcciones.";
        return;
    }

    const distanciaKm = (data.routes[0].distance / 1000).toFixed(2);
    document.getElementById("distanciaTexto").innerText = `(en auto/moto)    Distancia: ${distanciaKm} km`;

    // Inicializar o recrear mapa
    if (window.mapaLeaflet) {
        window.mapaLeaflet.remove();
    }

    window.mapaLeaflet = L.map("mapaDistancia").setView(
        [coord1.lat, coord1.lon], 13
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(window.mapaLeaflet);

    // Dibujar ruta en el mapa
    const ruta = data.routes[0].geometry.coordinates.map(p => [p[1], p[0]]);
    L.polyline(ruta, { color: "blue", weight: 4 }).addTo(window.mapaLeaflet);

    // Agregar marcadores
    //L.marker([coord1.lat, coord1.lon]).addTo(window.mapaLeaflet).bindPopup(dir1);
	L.marker([coord1.lat, coord1.lon], { icon: iconOrigen })
		.addTo(window.mapaLeaflet).bindPopup(dir1);
	
    //L.marker([coord2.lat, coord2.lon]).addTo(window.mapaLeaflet).bindPopup(dir2);
	L.marker([coord2.lat, coord2.lon], { icon: iconDestino })
		.addTo(window.mapaLeaflet).bindPopup(dir2);
	

    // Ajustar vista
    const group = new L.featureGroup([
        L.marker([coord1.lat, coord1.lon]),
        L.marker([coord2.lat, coord2.lon])
    ]);
    window.mapaLeaflet.fitBounds(group.getBounds(), { padding: [30, 30] });
}



// ===============================================
// FUNCION GEOCODIFICAR DIRECCION (NOMINATIM)
// ===============================================
async function geocodificar(direccion) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&addressdetails=1`;

    const resp = await fetch(url, {
        headers: { "User-Agent": "MiSistemaDelivery/1.0" }
    });

    const data = await resp.json();
    if (data.length === 0) return null;

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };
}

