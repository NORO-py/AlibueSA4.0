/* statistics.js — Cálculos derivados sobre los registros de producción. */
(function (global) {
  function sumar(arr, fn) { return arr.reduce((a, x) => a + (fn(x) || 0), 0); }

  const Stats = {
    totalRegistro(r) {
      return (r.prod1||0)+(r.prod2||0)+(r.prod3||0)+(r.prod4||0)+(r.prod5||0);
    },
    aptos(r) {
      const t = Stats.totalRegistro(r);
      return Math.max(0, t - (r.dobleYema||0) - (r.lavado||0) - (r.deforme||0) - (r.piso||0) - (r.rotos||0));
    },
    cajones(total, porCajon = 180) {
      const c = Math.floor(total / porCajon);
      const sobrante = total - c * porCajon;
      return { cajones: c, sobrantes: sobrante };
    },
    /** Postura: (huevos producidos / gallinas vivas) * 100. */
    postura(huevos, gallinas) {
      if (!gallinas) return 0;
      return (huevos / gallinas) * 100;
    },
    /** Resumen por fecha sobre una lista de registros. */
    resumirPorFecha(regs) {
      const map = new Map();
      regs.forEach(r => {
        const cur = map.get(r.fecha) || { fecha: r.fecha, total: 0, aptos: 0, rotos: 0, defectuosos: 0, mortalidad: 0 };
        cur.total       += Stats.totalRegistro(r);
        cur.aptos       += Stats.aptos(r);
        cur.rotos       += (r.rotos || 0);
        cur.defectuosos += (r.dobleYema||0)+(r.lavado||0)+(r.deforme||0)+(r.piso||0);
        cur.mortalidad  += (r.mortHembras||0)+(r.mortMachos||0);
        map.set(r.fecha, cur);
      });
      return [...map.values()].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    },
    /** Resumen por plantel/galpón/sector. */
    resumirPor(regs, key) {
      const map = new Map();
      regs.forEach(r => {
        const k = r[key];
        const cur = map.get(k) || { key: k, total: 0, aptos: 0, mortalidad: 0, registros: 0 };
        cur.total      += Stats.totalRegistro(r);
        cur.aptos      += Stats.aptos(r);
        cur.mortalidad += (r.mortHembras||0)+(r.mortMachos||0);
        cur.registros++;
        map.set(k, cur);
      });
      return [...map.values()];
    },
    comparacionDiaAnterior(regs) {
      const porFecha = Stats.resumirPorFecha(regs);
      if (porFecha.length < 2) return { delta: 0, dir: "—", actual: porFecha[0]?.total||0, anterior: 0 };
      const a = porFecha[porFecha.length-1];
      const p = porFecha[porFecha.length-2];
      const delta = a.total - p.total;
      const dir = delta > 0 ? "Subió" : delta < 0 ? "Bajó" : "Se mantuvo";
      return { delta, dir, actual: a.total, anterior: p.total };
    },
    pctRotos(regs) {
      const t = sumar(regs, Stats.totalRegistro);
      const r = sumar(regs, x => x.rotos || 0);
      return t ? (r / t) * 100 : 0;
    },
    pctDefectuosos(regs) {
      const t = sumar(regs, Stats.totalRegistro);
      const d = sumar(regs, x => (x.dobleYema||0)+(x.lavado||0)+(x.deforme||0)+(x.piso||0));
      return t ? (d / t) * 100 : 0;
    },
  };
  global.Stats = Stats;
})(window);