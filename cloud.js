/* cloud.js — Sincronización con Firebase Firestore.
   Estrategia: localStorage sigue siendo la "fuente rápida" (toda la app lee/escribe
   ahí de forma sincrónica). Esta capa:
     - Al arrancar, baja el documento "alibue/datos" y lo vuelca en localStorage.
     - Hookea localStorage.setItem/removeItem: cualquier escritura con prefijo
       "alibue:v1:" dispara un upload con debounce (800ms) al mismo documento.
     - Escucha cambios en tiempo real (onSnapshot) y refresca la vista actual.
   Así el código existente NO necesita cambiar y los datos se sincronizan entre
   PC, celular, etc. en cuestión de segundos. */
(function (global) {
  const NS = "alibue:v1:";
  const COL = "alibue";
  const DOC = "datos";
  let fdb = null;
  let suppress = false;       // evita reenviar cuando aplicamos cambios remotos
  let pendingTimer = null;
  let initialized = false;
  let clientId = Math.random().toString(36).slice(2, 10);

  function snapshotLocal() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(NS) === 0) {
        try { out[k.slice(NS.length)] = JSON.parse(localStorage.getItem(k)); } catch (_) {}
      }
    }
    return out;
  }

  function applyRemote(data) {
    if (!data || typeof data !== "object") return;
    suppress = true;
    try {
      // limpiar claves locales actuales del NS
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(NS) === 0) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
      Object.keys(data).forEach(k => {
        try { localStorage.setItem(NS + k, JSON.stringify(data[k])); } catch (_) {}
      });
    } finally { suppress = false; }
  }

  function scheduleUpload() {
    if (!fdb) return;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(async () => {
      try {
        const data = snapshotLocal();
        await fdb.collection(COL).doc(DOC).set({
          data,
          updatedAt: Date.now(),
          updatedBy: clientId,
        });
      } catch (e) {
        console.error("[Cloud] Error subiendo datos:", e);
        if (global.Utils) Utils.toast("Error al sincronizar con la nube", "error");
      }
    }, 800);
  }

  // Hook a localStorage para capturar TODAS las escrituras del namespace.
  const _set = localStorage.setItem.bind(localStorage);
  const _rem = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    _set(k, v);
    if (!suppress && initialized && typeof k === "string" && k.indexOf(NS) === 0) scheduleUpload();
  };
  localStorage.removeItem = function (k) {
    _rem(k);
    if (!suppress && initialized && typeof k === "string" && k.indexOf(NS) === 0) scheduleUpload();
  };

  const Cloud = {
    enabled: false,
    async init() {
      const cfg = global.FIREBASE_CONFIG;
      if (!cfg || !cfg.apiKey || String(cfg.apiKey).indexOf("TU_") === 0) {
        console.warn("[Cloud] Firebase no configurado. Modo local únicamente.");
        initialized = true;
        return;
      }
      if (!global.firebase || !firebase.initializeApp) {
        console.warn("[Cloud] SDK de Firebase no disponible.");
        initialized = true;
        return;
      }
      try {
        if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(cfg);
        fdb = firebase.firestore();
        Cloud.enabled = true;

        // 1) Carga inicial: el remoto manda. Si no existe, subimos lo local.
        const ref = fdb.collection(COL).doc(DOC);
        const snap = await ref.get();
        if (snap.exists) {
          applyRemote(snap.data().data || {});
        } else {
          await ref.set({ data: snapshotLocal(), updatedAt: Date.now(), updatedBy: clientId });
        }

        // 2) Realtime: aplica cambios de otros dispositivos y refresca la vista.
        ref.onSnapshot((s) => {
          if (!s.exists) return;
          const d = s.data() || {};
          if (d.updatedBy === clientId) return; // ignorar eco propio
          applyRemote(d.data || {});
          if (typeof global.AlibueRefresh === "function") global.AlibueRefresh();
          if (global.Utils) Utils.toast("Datos sincronizados", "ok");
        }, (err) => console.error("[Cloud] onSnapshot:", err));

        if (global.Utils) Utils.toast("Conectado a la nube", "ok");
      } catch (e) {
        console.error("[Cloud] Init falló:", e);
        if (global.Utils) Utils.toast("Sin conexión a la nube, modo local", "error");
      } finally {
        initialized = true;
      }
    },
  };
  global.Cloud = Cloud;
})(window);