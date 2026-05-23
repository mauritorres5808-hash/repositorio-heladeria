// productos-sub.js
let subProdLista = [];
let productoActual = null;

document.addEventListener("DOMContentLoaded", () => {

  // ============================================
  // ABRIR MODAL
  // ============================================
  window.abrirSubproductos = function(idProd, descripcion) {

    productoActual = idProd;

    document.getElementById("tituloProdPrincipal").textContent =
      `${idProd} - ${descripcion}`;

    cargarSubproductosExistentes(idProd);

    document.getElementById("modalSubproductos").style.display = "flex";
  };

  // ============================================
  // CARGAR SUBPRODUCTOS EXISTENTES
  // ============================================
  async function cargarSubproductosExistentes(idProd) {

    try {

      const tbodyResultados =
        document.querySelector("#tablaResultadosSub tbody");

      if (tbodyResultados) {
        tbodyResultados.innerHTML = "";
      }

      subProdLista = [];

      const resp = await fetch(`/api/productos-sub/${idProd}`);
      const data = await resp.json();

      subProdLista = data.map(x => x.id_prod_sub);

      renderSubProdTabla();

    } catch (error) {

      console.error(error);

      alert("Error cargando subproductos");
    }
  }

  // ============================================
  // RENDER TABLA
  // ============================================
  async function renderSubProdTabla() {

    const tbody = document.querySelector("#tablaSubproductos tbody");

    tbody.innerHTML = "";

    for (const id of subProdLista) {

      try {

        const resp = await fetch(`/api/productos/${id}`);
        const data = await resp.json();

        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${id}</td>
          <td>${data.descripcion || "(No encontrado)"}</td>
          <td>
            <button class="btn-chico"
              onclick="quitarSubproducto(${id})">
              - Quitar
            </button>
          </td>
        `;

        tbody.appendChild(tr);

      } catch (error) {

        console.error(error);
      }
    }
  }

  // ============================================
  // QUITAR SUBPRODUCTO
  // ============================================
  window.quitarSubproducto = function(id) {

    subProdLista = subProdLista.filter(x => x !== id);

    renderSubProdTabla();
  };

  // ============================================
  // BUSCAR SUBPRODUCTOS
  // ============================================
  document.getElementById("buscarSubBtn").onclick = async () => {

    try {

      const txt =
        document.getElementById("buscarSubTxt")
        .value
        .trim()
        .toLowerCase();

      const grupoSel =
        document.getElementById("buscarGrupoSub").value;

      let url = `/api/productos-sub/buscar?texto=${encodeURIComponent(txt)}`;

      if (grupoSel !== "") {
        url += `&grupo=${grupoSel}`;
      }

      const resp = await fetch(url);
      const data = await resp.json();

      const tbody =
        document.querySelector("#tablaResultadosSub tbody");

      tbody.innerHTML = "";

      data.forEach(d => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td>${d.id_producto}</td>
          <td>${d.descripcion}</td>
          <td>
            <button class="btn-chico"
              onclick="agregarSubproducto(${d.id_producto})">
              + Agregar
            </button>
          </td>
        `;

        tbody.appendChild(tr);
      });

    } catch (error) {

      console.error(error);

      alert("Error buscando productos");
    }
  };

  // ============================================
  // AGREGAR SUBPRODUCTO
  // ============================================
  window.agregarSubproducto = function(id) {

    if (!subProdLista.includes(id)) {

      subProdLista.push(id);
    }

    renderSubProdTabla();
  };

	// ============================================
	// GUARDAR
	// ============================================
	document.getElementById("guardarSubBtn").onclick = async () => {

	  try {

		if (!productoActual) return;

		// ======================================
		// GUARDAR RELACION RELA_PROD_SUB
		// ======================================
		const resp = await fetch(`/api/productos-sub/${productoActual}`, {

		  method: "POST",

		  headers: {
			"Content-Type": "application/json"
		  },

		  body: JSON.stringify({
			subproductos: subProdLista
		  })
		});

		const data = await resp.json();

		if (!data.ok) {

		  return alert("Error guardando subproductos");
		}

		// ======================================
		// ACTUALIZAR CAMPO productos.subproductos
		// ======================================
		const tieneSubproductos = subProdLista.length > 0 ? 1 : 0;

		const resp2 = await fetch(
		  `/api/productos/${productoActual}/subproductos`,
		  {

			method: "PUT",

			headers: {
			  "Content-Type": "application/json"
			},

			body: JSON.stringify({
			  subproductos: tieneSubproductos
			})
		  }
		);

		const data2 = await resp2.json();

		if (!data2.ok) {

		  return alert(
			"Se guardó RELA_PROD_SUB pero falló actualizar el campo subproductos"
		  );
		}

		alert("Subproductos guardados");

		document.getElementById("modalSubproductos").style.display = "none";

	  } catch (error) {

		console.error(error);

		alert("Error guardando subproductos");
	  }
	};
	  

  // ============================================
  // CERRAR MODAL
  // ============================================
  document.getElementById("cerrarSubBtn").onclick = () => {

    document.getElementById("modalSubproductos").style.display = "none";
  };

  // ============================================
  // CARGAR GRUPOS
  // ============================================
  async function cargarGruposSub() {

    try {

      const sel = document.getElementById("buscarGrupoSub");

      sel.innerHTML =
        '<option value="">(Todos los grupos)</option>';

      const resp = await fetch("/api/grupos");
      const data = await resp.json();

      data.forEach(g => {

        sel.innerHTML += `
          <option value="${g.id_grupo}">
            ${g.descripcion}
          </option>
        `;
      });

    } catch (error) {

      console.error(error);
    }
  }

  cargarGruposSub();

});
