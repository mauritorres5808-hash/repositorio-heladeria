document.addEventListener('DOMContentLoaded', () => {

  const idInput = document.getElementById('id_usuario');
  const nombreInput = document.getElementById('nombre');
  const emailInput = document.getElementById('email');
  const nivelSelect = document.getElementById('nivel');
  const tbody = document.getElementById('tablaUsuarios');
  const btnGuardar = document.getElementById('btnGuardar');
  const btnLimpiar = document.getElementById('btnLimpiar');

  cargarUsuarios();


  // ==========================================
  // CARGAR USUARIOS
  // ==========================================
  async function cargarUsuarios() {

    try {

      tbody.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;

      const resp = await fetch('/api/usuarios');
      const data = await resp.json();

      if (!data.ok) {
        tbody.innerHTML =
            `<tr><td colspan="6">Error cargando usuarios</td></tr>`;
        return;
      }

      tbody.innerHTML = "";

      data.usuarios.forEach(d => {

        const nivelTxt =
            d.nivel == 2
                ? "2 - Supervisor"
                : "1 - Vendedor";

        if (d.id_usuario != 1) {

          const tr =
              document.createElement('tr');

          tr.innerHTML = `
            <td>${d.id_usuario}</td>
            <td>${d.nombre}</td>
            <td>${d.email}</td>
            <td>${nivelTxt}</td>
	<td style="${d.deshabilitado == 1 ? 'background-color:#FF6467;color:white;' : ''}">
		${d.deshabilitado == 1 ? 'S' : 'N'}
	</td>
            <td class="actions">
              <button onclick="editarUsuario(
                  ${d.id_usuario},
                  '${d.nombre}',
                  '${d.email}',
				  ${d.deshabilitado},
                  ${d.nivel}
              )">
                  ✏️ Editar
              </button>

            </td>
          `;

          tbody.appendChild(tr);
        }
      });

    } catch (err) {

      console.error("Error al cargar usuarios:", err);

      alert("Error al cargar usuarios");
    }
  }


  // ==========================================
  // GUARDAR
  // ==========================================
  btnGuardar.onclick = async () => {

    const id = parseInt(idInput.value);
    const nombre = nombreInput.value.trim();
    const email = emailInput.value.trim();
    const nivel = parseInt(nivelSelect.value);
	const deshabilitado = document.getElementById("deshabili").checked ? 1 : 0;

    if (!id || !nombre || !email) {
      alert("Por favor complete todos los campos.");
      return;
    }

    try {
      const resp = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          id_usuario: id,
          nombre,
          email,
          deshabilitado,
          nivel
        })
      });

      const data =
          await resp.json();

      if (!data.ok) {
        alert(data.mensaje || "Error guardando");
        return;
      }

      alert("✅ Usuario guardado correctamente.");

      limpiarCampos();

      cargarUsuarios();

    } catch (err) {
      console.error(err);
      alert("Error al guardar el usuario.");
    }
  };


  // ==========================================
  // LIMPIAR
  // ==========================================
  btnLimpiar.onclick = limpiarCampos;

  function limpiarCampos() {

    idInput.value = '';
    nombreInput.value = '';
    emailInput.value = '';
    nivelSelect.value = '1';
	document.getElementById("deshabili").checked = false;
    idInput.focus();
  }


  // ==========================================
  // EDITAR
  // ==========================================
  window.editarUsuario = (
      id,
      nombre,
      email,
      deshabilitado,
      nivel
  ) => {

    idInput.value = id;
    nombreInput.value = nombre;
    emailInput.value = email;
	document.getElementById("deshabili").checked = deshabilitado == 1;
    nivelSelect.value = nivel;
  };



});
