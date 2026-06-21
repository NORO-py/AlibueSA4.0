/* alerts.js — Generación de alertas automáticas en base a umbrales. */
(function (global) {
  /* Umbrales configurables (se podrían exponer en pantalla de configuración). */
  const TH = {
    posturaMin: 65,        // % postura considerado bajo
    mortalidadMax: 5,      // aves muertas en un sector en el día
    rotosPctMax: 3,        // % rotos sobre total del registro
    caidaPosturaPct: 8,    // caída de postura vs día anterior (%)
  };

  function nuevaAlerta(tipo, severidad, titulo, detalle, ctx) {
    return {
      id: Utils.uid(),
      tipo, severidad, titulo, detalle,
      contexto: ctx || {},
      ts: Utils.nowISO(),
      resuelta: false,
    };
  }

  const Alerts = {
    TH,
    /** Analiza un registro recién guardado y agrega alertas si corresponde. */
    analizarRegistro(reg) {
      const total = Stats.totalRegistro(reg);
      const stock = DB.getStock(reg.galponId, reg.sector);
      const gallinas = stock.gallinas || 0;
      const post = Stats.postura(total, gallinas);
      const ctx = { fecha: reg.fecha, plantelId: reg.plantelId, galponId: reg.galponId, sector: reg.sector };
      const nuevas = [];

      if (gallinas > 0 && post < TH.posturaMin) {
        nuevas.push(nuevaAlerta("postura_baja", "warning",
          "Postura baja",
          `Postura ${post.toFixed(1)}% (umbral ${TH.posturaMin}%) en ${reg.galpon} ${reg.sector}.`, ctx));
      }
      const muertos = (reg.mortHembras||0) + (reg.mortMachos||0);
      if (muertos > TH.mortalidadMax) {
        nuevas.push(nuevaAlerta("mortalidad_alta", "danger",
          "Mortalidad elevada",
          `${muertos} aves muertas en ${reg.galpon} ${reg.sector} el ${Utils.fmtDate(reg.fecha)}.`, ctx));
      }
      const pctRotos = total ? ((reg.rotos||0) / total) * 100 : 0;
      if (pctRotos > TH.rotosPctMax) {
        nuevas.push(nuevaAlerta("rotos_alto", "warning",
          "Exceso de huevos rotos",
          `${pctRotos.toFixed(1)}% rotos en ${reg.galpon} ${reg.sector}.`, ctx));
      }

      // Comparación contra día anterior en el mismo sector.
      const previos = DB.listProduccion({ galponId: reg.galponId, sector: reg.sector })
        .filter(r => r.fecha < reg.fecha)
        .sort((a,b)=> (a.fecha < b.fecha ? 1 : -1));
      if (previos[0]) {
        const prev = previos[0];
        const tPrev = Stats.totalRegistro(prev);
        if (tPrev > 0) {
          const caida = ((tPrev - total) / tPrev) * 100;
          if (caida >= TH.caidaPosturaPct) {
            nuevas.push(nuevaAlerta("caida_produccion", "warning",
              "Caída de producción",
              `Producción cayó ${caida.toFixed(1)}% vs ${Utils.fmtDate(prev.fecha)} en ${reg.galpon} ${reg.sector}.`, ctx));
          }
        }
      }
      nuevas.forEach(a => DB.saveAlerta(a));
      return nuevas;
    },
  };
  global.Alerts = Alerts;
})(window);