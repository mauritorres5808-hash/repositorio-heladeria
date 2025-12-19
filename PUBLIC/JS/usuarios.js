document.addEventListener('DOMContentLoaded', () => {
  const idInput = document.getElementById('id_usuario');
  const nombreInput = document.getElementById('nombre');
  const emailInput = document.getElementById('email');
  const nivelSelect = document.getElementById('nivel');
  const tbody = document.getElementById('tablaUsuarios');

  const btnGuardar = document.getElementById('btnGuardar');
  const btnLimpiar = document.getElementById('btnLimpiar');

/*
  // ✅ Esperar autenticación antes de cargar datos
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Usuario autenticado → se pueden leer los datos
      cargarUsuarios();
    } else {
      // No autenticado → redirigir o mostrar mensaje
      alert("Debe iniciar sesión para acceder a esta página.");
      window.location.href = "login.html"; // o la ruta que uses
    }
  });
*/


  cargarUsuarios(); // ✅ se ejecuta solo si hay sesión


  // === Cargar usuarios ===
  async function cargarUsuarios() {
    try {
      tbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;
      const snap = await db.collection('USUARIOS').orderBy('nombre').get();
      tbody.innerHTML = "";

      snap.forEach(doc => {
        const d = doc.data();
        const nivelTxt = d.nivel == 2 ? "2 - Supervisor" : "1 - Vendedor";
if (d.id_usuario != 1) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${d.id_usuario}</td>
          <td>${d.nombre}</td>
          <td>${d.email}</td>
          <td>${nivelTxt}</td>
          <td class="actions">
            <button onclick="editarUsuario(${d.id_usuario}, '${d.nombre}', '${d.email}', ${d.nivel})">✏️ Editar</button>
            <button onclick="eliminarUsuario(${d.id_usuario})">🗑️ Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
}
      });
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      alert("Error al cargar los usuarios. Ver consola.");
    }
  }

  // === Guardar ===
  btnGuardar.onclick = async () => {
    const id = parseInt(idInput.value);
    const nombre = nombreInput.value.trim();
    const email = emailInput.value.trim();
    const nivel = parseInt(nivelSelect.value);

    if (!id || !nombre || !email) {
      alert("Por favor complete todos los campos.");
      return;
    }

    try {
      await db.collection('USUARIOS').doc(String(id)).set({
        id_usuario: id,
        nombre,
        email,
        nivel
      });
      alert("✅ Usuario guardado correctamente.");
      limpiarCampos();
      cargarUsuarios();
    } catch (err) {
      console.error(err);
      alert("Error al guardar el usuario.");
    }
  };

  btnLimpiar.onclick = limpiarCampos;
  function limpiarCampos() {
    idInput.value = '';
    nombreInput.value = '';
    emailInput.value = '';
    nivelSelect.value = '1';
    idInput.focus();
  }

  window.editarUsuario = (id, nombre, email, nivel) => {
    idInput.value = id;
    nombreInput.value = nombre;
    emailInput.value = email;
    nivelSelect.value = nivel;
  };

  window.eliminarUsuario = async (id) => {
    if (!confirm("¿Desea eliminar este usuario?")) return;
    await db.collection('USUARIOS').doc(String(id)).delete();
    alert("🗑️ Usuario eliminado.");
    cargarUsuarios();
  };
});
