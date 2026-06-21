/* utils.js — Utilidades comunes (formatos, fechas, DOM). */
(function (global) {
  const Utils = {
    /** Devuelve "YYYY-MM-DD" de la fecha local. */
    todayISO() {
      const d = new Date();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${m}-${day}`;
    },
    /** Devuelve "HH:MM" de la hora local actual. */
    nowHM() {
      const d = new Date();
      return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    },
    nowISO() { return new Date().toISOString(); },
    /** Genera un id único corto. */
    uid() {
      return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
    },
    fmtDate(iso) {
      if (!iso) return "";
      const [y, m, d] = iso.split("-");
      return `${d}/${m}/${y}`;
    },
    fmtNum(n) {
      if (n === null || n === undefined || isNaN(n)) return "0";
      return new Intl.NumberFormat("es-AR").format(n);
    },
    pct(n, dec = 1) {
      if (!isFinite(n)) return "0%";
      return n.toFixed(dec) + "%";
    },
    intVal(el) {
      const v = parseInt(el && el.value, 10);
      return isNaN(v) ? 0 : v;
    },
    el(html) {
      const t = document.createElement("template");
      t.innerHTML = html.trim();
      return t.content.firstElementChild;
    },
    clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); },
    toast(msg, kind = "") {
      const t = document.getElementById("toast");
      t.textContent = msg;
      t.className = "toast show " + (kind || "");
      clearTimeout(Utils._toastT);
      Utils._toastT = setTimeout(() => { t.className = "toast"; }, 2600);
    },
    /** Confirmación modal simple que devuelve Promise<boolean>. */
    confirm(message, opts = {}) {
      return new Promise((resolve) => {
        const backdrop = Utils.el(`
          <div class="modal-backdrop">
            <div class="modal">
              <h2>${opts.title || "Confirmar"}</h2>
              <p>${message}</p>
              <div class="row" style="margin-top:14px">
                <button class="btn secondary" data-act="no">${opts.cancel || "Cancelar"}</button>
                <button class="btn ${opts.danger ? "danger" : ""}" data-act="yes">${opts.ok || "Aceptar"}</button>
              </div>
            </div>
          </div>`);
        document.getElementById("modal-root").appendChild(backdrop);
        backdrop.addEventListener("click", (e) => {
          const act = e.target.dataset && e.target.dataset.act;
          if (act) { backdrop.remove(); resolve(act === "yes"); }
        });
      });
    },
    /** Solicita contraseña; resuelve con el string o null. */
    promptPassword(message, opts = {}) {
      return new Promise((resolve) => {
        const backdrop = Utils.el(`
          <div class="modal-backdrop">
            <div class="modal">
              <h2>${opts.title || "Contraseña requerida"}</h2>
              <p>${message}</p>
              <div class="field full">
                <label for="pwd-in">Contraseña</label>
                <input id="pwd-in" type="password" autocomplete="off" />
              </div>
              ${opts.requireReason ? `
              <div class="field full" style="margin-top:8px">
                <label for="reason-in">Motivo de la modificación</label>
                <input id="reason-in" type="text" />
              </div>` : ""}
              <div class="row" style="margin-top:14px">
                <button class="btn secondary" data-act="no">Cancelar</button>
                <button class="btn" data-act="yes">Confirmar</button>
              </div>
            </div>
          </div>`);
        document.getElementById("modal-root").appendChild(backdrop);
        const inp = backdrop.querySelector("#pwd-in");
        setTimeout(() => inp.focus(), 50);
        backdrop.addEventListener("click", (e) => {
          const act = e.target.dataset && e.target.dataset.act;
          if (!act) return;
          if (act === "no") { backdrop.remove(); resolve(null); return; }
          const reasonEl = backdrop.querySelector("#reason-in");
          const result = { pwd: inp.value, reason: reasonEl ? reasonEl.value.trim() : "" };
          backdrop.remove();
          resolve(result);
        });
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") backdrop.querySelector('[data-act="yes"]').click();
        });
      });
    },
    /** Descarga texto como archivo. */
    download(filename, content, mime = "application/json") {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 250);
    },
    /** Compara dos fechas ISO y devuelve diferencia en días. */
    daysBetween(a, b) {
      return Math.round((new Date(b) - new Date(a)) / 86400000);
    },
  };
  global.Utils = Utils;
})(window);