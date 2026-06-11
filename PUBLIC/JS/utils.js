// ======================================
// ESTILOS GLOBALES DE HORARIOS
// ======================================
(function(){

    if (document.getElementById("css-horarios-utils")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "css-horarios-utils";

    style.textContent = `

        .horarios-grid{
            display:flex;
            flex-wrap:wrap;
            gap:12px;
            justify-content:center;
        }

        .dia-horario{
            width:180px;
            min-height:120px;
            background:green;
            border:1px solid #ddd;
            border-radius:10px;
            padding:10px;
            box-shadow:0 2px 5px rgba(0,0,0,.10);
        }

        .dia-horario-titulo{
            font-weight:bold;
            font-size:16px;
            margin-bottom:8px;
            text-align:center;
            color:#2c3e50;
        }

        .dia-horario-linea{
            font-size:14px;
            margin-bottom:4px;
        }

    `;

    document.head.appendChild(style);

})();



function FechaHoy_MySQL() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

	function HoraHoy(){
	  const ahora = new Date();
	  const hora = String(ahora.getHours()).padStart(2, '0');
	  const minutos = String(ahora.getMinutes()).padStart(2, '0');
	  const segundos = String(ahora.getSeconds()).padStart(2, '0');
	  return `${hora}:${minutos}:${segundos}`;
	}
	
	function FechaHoy(){
		//formato dd/mm/yyyy
		const hoy = new Date();
		return hoy.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});
	}

	function convertirFechaOK(f) {
		// Convertir yyyy-mm-dd → dd/mm/yyyy
		if (!f) return "";
		// Si viene como objeto Date
		if (typeof f === "object") { f = f.toISOString().split("T")[0]; }
		// Si viene como string ISO
		if (String(f).includes("T")) { f = String(f).split("T")[0]; }
		const [yyyy, mm, dd] = String(f).split("-");
		return `${dd}/${mm}/${yyyy}`;
	}


	function Formatea_Moneda(f) {
		return '$ ' + Number(f).toLocaleString('es-AR');
	}



// control de HORARIOS
async function validarHorario_AHORA(tipo){

    const resp = await fetch(`/api/horarios/${tipo}`);
    const data = await resp.json();

    if (!data.ok) {
        return false;
    }

    const fechaActual = new Date();
    const dia = fechaActual.getDay() === 0
            ? 7
            : fechaActual.getDay();

    const hora = fechaActual.toTimeString().substring(0,8);

//console.log(data);
//console.log(dia);
    return data.horarios.some(h =>
        Number(h.dia) === dia &&
        hora >= h.desde &&
        hora <= h.hasta
    );
}

// =====================================
// MODAL DE HORARIOS
// =====================================
async function verHorarios(tipo = '*') {

    // Crear modal una sola vez
    if (!document.getElementById("modalHorariosPublico")) {

        document.body.insertAdjacentHTML("beforeend", `
            <div id="modalHorariosPublico"
                 style="
                    display:none;
                    position:fixed;
                    inset:0;
                    background:rgba(0,0,0,.6);
                    z-index:99999;
                    justify-content:center;
                    align-items:center;
                 ">

                <div style="
                    background:white;
                    width:65%;
                    max-width:500px;
                    max-height:85vh;
                    overflow:auto;
                    border-radius:12px;
                    padding:20px;
                    position:relative;
                ">

                    <button
                        onclick="cerrarHorarios()"
                        style="
                            position:absolute;
                            top:10px;
                            right:10px;
                            border:none;
                            background:#dc3545;
                            color:white;
                            padding:8px 12px;
                            border-radius:6px;
                            cursor:pointer;
                        ">
                        ✖ Cerrar
                    </button>

                    <div id="contenidoHorarios"></div>

                </div>

            </div>
        `);
    }

    document.getElementById("modalHorariosPublico").style.display = "flex";

    await cargarHorariosPublicos(tipo);
}

function cerrarHorarios() {

    document.getElementById(
        "modalHorariosPublico"
    ).style.display = "none";
}

async function cargarHorariosPublicos(tipo='*') {

    const resp = await fetch('/api/horarios');
    const data = await resp.json();

    if (!data.ok) {
        document.getElementById("contenidoHorarios").innerHTML =
            "No se pudieron cargar los horarios";
        return;
    }

    const nombresDias = {
        1:"Lunes",
        2:"Martes",
        3:"Miércoles",
        4:"Jueves",
        5:"Viernes",
        6:"Sábado",
        7:"Domingo"
    };

    const nombresTipos = {
        L:"🏪 Horarios del Local",
        P:"🔔 Horarios para Pedidos Online",
        D:"🚀 Horarios de Delivery"
    };

    let html = `
        <h2 style="text-align:center">
            🕒 Horarios de Atención
        </h2>
    `;

    const tipos =
        tipo === '*'
            ? ["L","P","D"]
            : [tipo];

    tipos.forEach(t => {

        const lista =
            data.horarios.filter(
                h => h.tipo === t
            );

        if (lista.length === 0) {
            return;
        }

        html += `
            <div style="
                margin-top:20px;
                padding:15px;
                border:1px solid #ddd;
                border-radius:10px;
                background:#f8f9fa;
            ">
                <h3 style="color:#1F49E0">${nombresTipos[t]}</h3>
        `;

        const agrupados = {};

        lista.forEach(h => {

            if (!agrupados[h.dia]) {
                agrupados[h.dia] = [];
            }

            agrupados[h.dia].push(
                `${h.desde.substring(0,5)} - ${h.hasta.substring(0,5)}`
            );
        });

html += `<div class="horarios-grid">`;

        Object.keys(agrupados)
            .sort((a,b)=>a-b)
            .forEach(dia => {

                html += `
                    <div style="margin-bottom:8px;">
                        <b>${nombresDias[dia]}</b>
                        <br>
                        ${agrupados[dia]
                            .map(h => `⏰ ${h}`)
                            .join("<br>")}
                    </div>
                `;
            });

        html += `</div>`;
		html += `</div>`;
    });

    document.getElementById("contenidoHorarios").innerHTML = html;
}
