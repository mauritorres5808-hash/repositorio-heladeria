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
