// ======================================================
// ===============   MEDIDOR DE USO FIRESTORE   =========
// ======================================================
// Este archivo registra automáticamente:
// - Lecturas (get, queries, snapshot)
// - Escrituras (add, set, update)
// - Eliminaciones (delete)
// Y guarda todo en una colección: USO_DIARIO
// ======================================================
// ======================================================
// MEDIDOR DE USO FIRESTORE — Versión automática
// Sin listas de colecciones. Ignora todas las rutas internas.
// ======================================================
// -----------------------------------------------
//  Función central para registrar el uso
// -----------------------------------------------

// 🔍 Detectar si una ruta es de Firestore REAL (colección/documento)
function esRutaReal(path) {
    if (!path) return false;

    // Rutas internas del SDK
    if (path.startsWith("__")) return false;

    const internas = ["firebaseLocalCache", "local", "metadata", "auth", "users"];
    if (internas.some(p => path.startsWith(p))) return false;

    // Debe tener formato coleccion/documento
    const partes = path.split("/");
    if (partes.length !== 2) return false;

    // Nombre de colección válido
    return /^[A-Za-z0-9_-]+$/.test(partes[0]);
}

// ======================================================
// REGISTRO GENERAL
// ======================================================
async function registrarUso(tipo, cantidad = 1, extra = {}) {
    try {
        //const fecha = new Date().toISOString().slice(0, 10);

const hoy = new Date();
const fecha = hoy.getFullYear() + "-" +
              String(hoy.getMonth() + 1).padStart(2, "0") + "-" +
              String(hoy.getDate()).padStart(2, "0");
console.log(fecha);

        //const uid = firebase.auth().currentUser?.uid || "SIN_USUARIO";
        //const pagina = window.location.pathname.split("/").pop();
        const docRef = firebase.firestore()
            .collection("USO_DIARIO")
            .doc(fecha);

        // Actualizar totales
        await firebase.firestore().runTransaction(async t => {
            const doc = await t.get(docRef);
            let data = doc.exists ? doc.data() : {
                lecturas: 0,
                escrituras: 0,
                eliminaciones: 0
            };

            if (tipo === "lectura") data.lecturas += cantidad;
            if (tipo === "escritura") data.escrituras += cantidad;
            if (tipo === "eliminacion") data.eliminaciones += cantidad;

            t.set(docRef, data);
        });

/*         
		// Guardar detalle
        firebase.firestore()
            .collection("USO_DIARIO")
            .doc(fecha)
            .collection("detalles")
            .add({
                tipo,
                cantidad,
                extra,
                pagina,
                uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }); 
*/

    } catch (e) {
        console.error("Error registrando uso:", e);
    }
}

// ======================================================
// ENVOLTORIOS FIRESTORE (get, set, update, add, delete)
// ======================================================

// --- LECTURAS ---
const origGet = firebase.firestore.DocumentReference.prototype.get;
firebase.firestore.DocumentReference.prototype.get = async function () {
    if (esRutaReal(this.path)) registrarUso("lectura", 1, { doc: this.path });
    return origGet.apply(this, arguments);
};

const origQGet = firebase.firestore.Query.prototype.get;
firebase.firestore.Query.prototype.get = async function () {
    const path = this._query?.path?.canonicalString || "QUERY";
    if (esRutaReal(path)) registrarUso("lectura", 1, { query: path });
    return origQGet.apply(this, arguments);
};

// --- REALTIME SNAPSHOT LECTURAS ---
const origSnap = firebase.firestore.Query.prototype.onSnapshot;
firebase.firestore.Query.prototype.onSnapshot = function () {
    const path = this._query?.path?.canonicalString || "QUERY";
    if (esRutaReal(path)) registrarUso("lectura", 1, { query: path });
    return origSnap.apply(this, arguments);
};

const origDocSnap = firebase.firestore.DocumentReference.prototype.onSnapshot;
firebase.firestore.DocumentReference.prototype.onSnapshot = function () {
    if (esRutaReal(this.path)) registrarUso("lectura", 1, { doc: this.path });
    return origDocSnap.apply(this, arguments);
};

// --- ESCRITURAS ---
const origSet = firebase.firestore.DocumentReference.prototype.set;
firebase.firestore.DocumentReference.prototype.set = async function () {
    if (esRutaReal(this.path)) registrarUso("escritura", 1, { doc: this.path });
    return origSet.apply(this, arguments);
};

const origUpdate = firebase.firestore.DocumentReference.prototype.update;
firebase.firestore.DocumentReference.prototype.update = async function () {
    if (esRutaReal(this.path)) registrarUso("escritura", 1, { doc: this.path });
    return origUpdate.apply(this, arguments);
};

const origAdd = firebase.firestore.CollectionReference.prototype.add;
firebase.firestore.CollectionReference.prototype.add = async function () {
    if (esRutaReal(this.path)) registrarUso("escritura", 1, { col: this.path });
    return origAdd.apply(this, arguments);
};

// --- ELIMINACIONES ---
const origDelete = firebase.firestore.DocumentReference.prototype.delete;
firebase.firestore.DocumentReference.prototype.delete = async function () {
    if (esRutaReal(this.path)) registrarUso("eliminacion", 1, { doc: this.path });
    return origDelete.apply(this, arguments);
};

console.log("medidor.js (auto) cargado correctamente.");
