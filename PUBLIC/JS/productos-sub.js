// productos-sub.js
let subProdLista = [];
let productoActual = null;

document.addEventListener("DOMContentLoaded", () => {

  window.abrirSubproductos = function(idProd, descripcion) {
    productoActual = idProd;
    document.getElementById("tituloProdPrincipal").textContent = `${idProd} - ${descripcion}`;
    cargarSubproductosExistentes(idProd);
    document.getElementById("modalSubproductos").style.display = "flex";
  };
  

  async function cargarSubproductosExistentes(idProd) {
	const tbodyResultados = document.querySelector("#tablaResultadosSub tbody");
	if (tbodyResultados) tbodyResultados.innerHTML = "";

    subProdLista = [];
    const snap = await db.collection("RELA_PROD_SUB").where("id_producto", "==", idProd).get();
    snap.forEach(doc => subProdLista.push(doc.data().id_prod_sub));
    renderSubProdTabla();
  }

  async function renderSubProdTabla() {
    const tbody = document.querySelector("#tablaSubproductos tbody");
    tbody.innerHTML = "";

    for (const id of subProdLista) {
      const prodSnap = await db.collection("PRODUCTOS").doc(String(id)).get();
      const data = prodSnap.exists ? prodSnap.data() : { descripcion: "(No encontrado)" };

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${id}</td>
        <td>${data.descripcion}</td>
        <td><button class="btn-chico" onclick="quitarSubproducto(${id})">- Quitar</button></td>
      `;
      tbody.appendChild(tr);
    }
  }

  window.quitarSubproducto = function(id) {
    subProdLista = subProdLista.filter(x => x !== id);
    renderSubProdTabla();
  };

document.getElementById("buscarSubBtn").onclick = async () => {
  const txt = document.getElementById("buscarSubTxt").value.trim().toLowerCase();
  const grupoSel = document.getElementById("buscarGrupoSub").value;

  let ref = db.collection("PRODUCTOS");

  // Si filtramos por grupo
  if (grupoSel !== "") {
    ref = ref.where("id_grupo", "==", Number(grupoSel));
  }

  // Traemos los datos (sin filtros por descripción)
  const snap = await ref.get();

  const tbody = document.querySelector("#tablaResultadosSub tbody");
  tbody.innerHTML = "";

  snap.forEach(doc => {
    const d = doc.data();
    // Filtro por texto en cualquier parte de la descripción (insensible a mayúsculas)
    if (d.descripcion.toLowerCase().includes(txt)) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.id_producto}</td>
        <td>${d.descripcion}</td>
        <td><button class="btn-chico" onclick="agregarSubproducto(${d.id_producto})">+ Agregar</button></td>
      `;
      tbody.appendChild(tr);
    }
  });
};



  window.agregarSubproducto = function(id) {
    if (!subProdLista.includes(id)) subProdLista.push(id);
    renderSubProdTabla();
  };

  document.getElementById("guardarSubBtn").onclick = async () => {
    if (!productoActual) return;

    const snap = await db.collection("RELA_PROD_SUB").where("id_producto", "==", productoActual).get();
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    const batch2 = db.batch();
    subProdLista.forEach(id => {
      batch2.set(db.collection("RELA_PROD_SUB").doc(), { id_producto: productoActual, id_prod_sub: id });
    });
    await batch2.commit();
	
	// guardo marca de subproductos S/N en tabla Productos
	const tieneSub = subProdLista.length > 0 ? "S" : "N";
	await db.collection("PRODUCTOS")
        .doc(String(productoActual))
        .update({ subproductos: tieneSub });


    alert("Subproductos guardados");
    document.getElementById("modalSubproductos").style.display = "none";
  };

  document.getElementById("cerrarSubBtn").onclick = () => {
    document.getElementById("modalSubproductos").style.display = "none";
  };

async function cargarGruposSub() {
  const sel = document.getElementById("buscarGrupoSub");
  sel.innerHTML = '<option value="">(Todos los grupos)</option>';
  const snap = await db.collection("GRUPOS").orderBy("descripcion").get();
  snap.forEach(doc => {
    const g = doc.data();
    sel.innerHTML += `<option value="${g.id_grupo}">${g.descripcion}</option>`;
  });
}
cargarGruposSub();

});
