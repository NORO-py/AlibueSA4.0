/* database.js — Capa de persistencia.
   Abstrae el almacenamiento. Implementación actual: localStorage (JSON).
   La estructura está pensada para sustituirla más adelante por una API
   REST contra MySQL / PostgreSQL / Firebase sin modificar el resto del código. */
(function (global) {
  const NS = "alibue:v1:";
  const STORES = {
    produccion: "produccion",
    mortalidad: "mortalidad",
    aves: "aves",
    tareas: "tareas",
    alertas: "alertas",
    historial: "historial",
    config: "configuracion",
  };

  function read(store) {
    try {
      const raw = localStorage.getItem(NS + store);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }
  function write(store, data) {
    localStorage.setItem(NS + store, JSON.stringify(data));
  }

  /* Catálogo fijo de planteles, galpones y sectores. */
  const PLANTELES = [
    { id: "P149", nombre: "Plantel 149", galpones: [
      { id: "G1", nombre: "Galpón 1", sectores: ["A", "B"] },
      { id: "G2", nombre: "Galpón 2", sectores: ["A", "B"] },
    ]},
    { id: "P150", nombre: "Plantel 150", galpones: [
      { id: "G3", nombre: "Galpón 3", sectores: ["A", "B"] },
      { id: "G4", nombre: "Galpón 4", sectores: ["A", "B"] },
      { id: "G5", nombre: "Galpón 5", sectores: ["A", "B"] },
    ]},
  ];

  function findPlantelByGalpon(galponId) {
    return PLANTELES.find(p => p.galpones.some(g => g.id === galponId));
  }

  const DB = {
    PLANTELES,
    findPlantelByGalpon,
    /* CRUD genérico */
    all(store) { return read(store); },
    save(store, item) {
      const list = read(store);
      if (!item.id) item.id = Utils.uid();
      const idx = list.findIndex(x => x.id === item.id);
      if (idx >= 0) list[idx] = item; else list.push(item);
      write(store, list);
      return item;
    },
    remove(store, id) {
      const list = read(store).filter(x => x.id !== id);
      write(store, list);
    },
    get(store, id) { return read(store).find(x => x.id === id); },

    /* ---- Producción ---- */
    findProduccion(fecha, galponId, sector) {
      return read(STORES.produccion).find(r =>
        r.fecha === fecha && r.galponId === galponId && r.sector === sector);
    },
    saveProduccion(reg) {
      reg.actualizadoEn = Utils.nowISO();
      if (!reg.creadoEn) reg.creadoEn = Utils.nowISO();
      DB.save(STORES.produccion, reg);
      return reg;
    },
    listProduccion(filter = {}) {
      let rows = read(STORES.produccion);
      if (filter.galponId) rows = rows.filter(r => r.galponId === filter.galponId);
      if (filter.sector)   rows = rows.filter(r => r.sector === filter.sector);
      if (filter.plantelId) rows = rows.filter(r => r.plantelId === filter.plantelId);
      if (filter.desde)    rows = rows.filter(r => r.fecha >= filter.desde);
      if (filter.hasta)    rows = rows.filter(r => r.fecha <= filter.hasta);
      return rows.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    },

    /* ---- Stock de aves ---- */
    getStock(galponId, sector) {
      const list = read(STORES.aves);
      return list.find(s => s.galponId === galponId && s.sector === sector) || {
        galponId, sector, gallinas: 0, gallos: 0,
      };
    },
    setStock(galponId, sector, gallinas, gallos) {
      const list = read(STORES.aves);
      const idx = list.findIndex(s => s.galponId === galponId && s.sector === sector);
      const item = { galponId, sector, gallinas: +gallinas || 0, gallos: +gallos || 0, actualizadoEn: Utils.nowISO() };
      if (idx >= 0) list[idx] = item; else list.push(item);
      write(STORES.aves, list);
      return item;
    },
    /** Aplica mortalidad descontando del stock. */
    aplicarMortalidad(galponId, sector, hembras, gallos) {
      const st = DB.getStock(galponId, sector);
      const nuevasGall = Math.max(0, (st.gallinas || 0) - (hembras || 0));
      const nuevosMach = Math.max(0, (st.gallos || 0) - (gallos || 0));
      return DB.setStock(galponId, sector, nuevasGall, nuevosMach);
    },
    listStock() { return read(STORES.aves); },

    /* ---- Historial / auditoría ---- */
    pushHistorial(entry) {
      const list = read(STORES.historial);
      entry.id = Utils.uid();
      entry.ts = Utils.nowISO();
      list.push(entry);
      write(STORES.historial, list);
    },
    listHistorial(filter = {}) {
      let rows = read(STORES.historial);
      if (filter.entidad) rows = rows.filter(r => r.entidad === filter.entidad);
      if (filter.refId)   rows = rows.filter(r => r.refId === filter.refId);
      return rows.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    },

    /* ---- Tareas ---- */
    listTareas() { return read(STORES.tareas).sort((a,b)=> (a.completada===b.completada?0:a.completada?1:-1)); },
    saveTarea(t) { return DB.save(STORES.tareas, t); },
    removeTarea(id) { DB.remove(STORES.tareas, id); },

    /* ---- Alertas ---- */
    listAlertas(soloActivas = false) {
      const rows = read(STORES.alertas);
      return (soloActivas ? rows.filter(a => !a.resuelta) : rows)
        .sort((a, b) => (a.ts < b.ts ? 1 : -1));
    },
    saveAlerta(a) { return DB.save(STORES.alertas, a); },
    resolverAlerta(id) {
      const a = DB.get(STORES.alertas, id);
      if (a) { a.resuelta = true; a.resueltaEn = Utils.nowISO(); DB.save(STORES.alertas, a); }
    },

    /* ---- Configuración ---- */
    config(key, value) {
      const list = read(STORES.config);
      const idx = list.findIndex(c => c.key === key);
      if (value === undefined) {
        return idx >= 0 ? list[idx].value : null;
      }
      if (idx >= 0) list[idx].value = value; else list.push({ key, value });
      write(STORES.config, list);
      return value;
    },

    /* ---- Export / Import (backups) ---- */
    exportAll() {
      const dump = { exportedAt: Utils.nowISO(), version: 1 };
      Object.values(STORES).forEach(s => { dump[s] = read(s); });
      return dump;
    },
    importAll(json) {
      if (!json || typeof json !== "object") throw new Error("Backup inválido");
      Object.values(STORES).forEach(s => {
        if (Array.isArray(json[s])) write(s, json[s]);
      });
    },
    STORES,
  };

  global.DB = DB;
})(window);