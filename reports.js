/* reports.js — Generación de reportes (datos tabulares + export PDF/Excel). */
(function (global) {
  function rangoFechas(periodo) {
    const hoy = new Date();
    const isoHoy = Utils.todayISO();
    if (periodo === "diario") return { desde: isoHoy, hasta: isoHoy };
    if (periodo === "semanal") {
      const d = new Date(hoy); d.setDate(d.getDate() - 6);
      return { desde: d.toISOString().slice(0,10), hasta: isoHoy };
    }
    if (periodo === "mensual") {
      const d = new Date(hoy); d.setDate(d.getDate() - 29);
      return { desde: d.toISOString().slice(0,10), hasta: isoHoy };
    }
    return { desde: null, hasta: null };
  }

  function pct(n, t) { return t ? ((n/t)*100).toFixed(1) + "%" : "0,0%"; }

  function tabularRegistros(regs) {
    return regs.map(r => {
      const total = Stats.totalRegistro(r);
      const aptos = Stats.aptos(r);
      return {
        Fecha: Utils.fmtDate(r.fecha),
        Hora: r.hora || "",
        Plantel: r.plantelNombre,
        Galpon: r.galpon,
        Sector: r.sector,
        "Total producción": total,
        "Aptos": aptos,
        "% Aptos": pct(aptos, total),
        "Doble yema": r.dobleYema || 0,
        "% Doble yema": pct(r.dobleYema||0, total),
        "Lavado": r.lavado || 0,
        "% Lavado": pct(r.lavado||0, total),
        "Deforme": r.deforme || 0,
        "% Deforme": pct(r.deforme||0, total),
        "Piso": r.piso || 0,
        "% Piso": pct(r.piso||0, total),
        "Rotos": r.rotos || 0,
        "% Rotos": pct(r.rotos||0, total),
        "Mort. hembras": r.mortHembras || 0,
        "Mort. machos": r.mortMachos || 0,
      };
    });
  }

  const Reports = {
    rangoFechas,
    tabularRegistros,
    generar(filter) {
      const regs = DB.listProduccion(filter);
      return {
        generadoEn: Utils.nowISO(),
        filtro: filter,
        registros: regs,
        filas: tabularRegistros(regs),
        resumen: {
          totalRegistros: regs.length,
          totalHuevos: regs.reduce((a,r)=>a+Stats.totalRegistro(r),0),
          totalAptos:  regs.reduce((a,r)=>a+Stats.aptos(r),0),
          mortalidad:  regs.reduce((a,r)=>a+(r.mortHembras||0)+(r.mortMachos||0),0),
          rotosPct: Stats.pctRotos(regs),
          defectuososPct: Stats.pctDefectuosos(regs),
        },
      };
    },
    exportXLSX(filas, filename = "reporte.xlsx") {
      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
      XLSX.writeFile(wb, filename);
    },
    exportPDF(titulo, filas, filename = "reporte.pdf") {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("ALIBUE — " + titulo, 14, 14);
      doc.setFontSize(9);
      doc.text("Generado: " + new Date().toLocaleString("es-AR"), 14, 20);
      if (!filas.length) {
        doc.text("Sin datos para los filtros seleccionados.", 14, 32);
      } else {
        const headers = Object.keys(filas[0]);
        doc.autoTable({
          startY: 26,
          head: [headers],
          body: filas.map(r => headers.map(h => r[h])),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [31, 58, 46] },
        });
      }
      doc.save(filename);
    },
    imprimir(titulo, filas) {
      const w = window.open("", "_blank");
      const head = filas[0] ? Object.keys(filas[0]) : [];
      const rows = filas.map(r => `<tr>${head.map(h => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("");
      w.document.write(`<!doctype html><html><head><title>${titulo}</title>
        <style>body{font-family:Arial,sans-serif;padding:16px;color:#1d2420}
        h1{font-size:16px;margin:0 0 6px} .meta{font-size:11px;color:#666;margin-bottom:14px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}
        th{background:#f0ece0}</style></head><body>
        <h1>ALIBUE — ${titulo}</h1>
        <div class="meta">Generado: ${new Date().toLocaleString("es-AR")}</div>
        <table><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
        <script>window.onload=()=>setTimeout(()=>window.print(),200)</`+`script>
        </body></html>`);
      w.document.close();
    },
  };
  global.Reports = Reports;
})(window);
