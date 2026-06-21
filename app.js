/* app.js — Router muy simple + vistas principales. */
(function () {
  const root = document.getElementById("app-root");
  const userBadge = document.getElementById("header-user");
  const logoutBtn = document.getElementById("logout-btn");

  /* ===== Router ===== */
  const Views = {};
  let currentRoute = null;
  function go(route, params) {
    currentRoute = { route, params };
    refreshHeader();
    Utils.clear(root);
    (Views[route] || Views.login)(root, params || {});
  }
  // Delegación: botones con data-go navegan a otra vista.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-go]");
    if (btn) { e.preventDefault(); go(btn.dataset.go, btn.dataset); }
  });
  logoutBtn.addEventListener("click", () => { Auth.logout(); go("login"); });

  function refreshHeader() {
    const s = Auth.session;
    if (!s) { userBadge.textContent = ""; logoutBtn.hidden = true; return; }
    userBadge.textContent = s.role === "operario" ? "Operario" : "Galponero";
    logoutBtn.hidden = false;
  }

  /* ===== Vista: Login ===== */
  Views.login = function (container) {
    const v = Utils.el(`
      <section class="login-screen">
        <div class="card">
          <h2>Acceso al sistema</h2>
          <p>Seleccione el perfil con el que va a trabajar.</p>
          <div class="role-grid">
            <button class="role-card" data-role="galponero">Galponero<small>Acceso libre</small></button>
            <button class="role-card" data-role="operario">Operario<small>Acceso protegido</small></button>
          </div>
        </div>
      </section>`);
    container.appendChild(v);
    v.querySelectorAll(".role-card").forEach(b => b.addEventListener("click", async () => {
      if (b.dataset.role === "galponero") {
        Auth.loginGalponero(); go("galp-select");
      } else {
        const r = await Utils.promptPassword("Ingrese la contraseña de operario.");
        if (!r) return;
        if (Auth.loginOperario(r.pwd)) { Utils.toast("Bienvenido", "ok"); go("op-dashboard"); }
        else Utils.toast("Contraseña incorrecta", "error");
      }
    }));
  };

  /* ===== Vista: Galponero — selección de galpón/sector ===== */
  Views["galp-select"] = function (container) {
    const v = Utils.el(`
      <section>
        <div class="section-title"><h2>Seleccione galpón y sector</h2></div>
        <div id="plant-list"></div>
      </section>`);
    container.appendChild(v);
    const list = v.querySelector("#plant-list");
    DB.PLANTELES.forEach(p => {
      const card = Utils.el(`<div class="card"><h3>${p.nombre}</h3><div class="sector-list"></div></div>`);
      const sl = card.querySelector(".sector-list");
      p.galpones.forEach(g => g.sectores.forEach(s => {
        const b = Utils.el(`<button class="sector-btn"><small>${p.nombre}</small>${g.nombre} · Sector ${s}</button>`);
        b.addEventListener("click", () => go("galp-form", { plantelId: p.id, galponId: g.id, sector: s }));
        sl.appendChild(b);
      }));
      list.appendChild(card);
    });
  };

  /* ===== Vista: Galponero — formulario de carga ===== */
  Views["galp-form"] = function (container, p) {
    const plantel = DB.PLANTELES.find(x => x.id === p.plantelId);
    const galpon  = plantel.galpones.find(g => g.id === p.galponId);
    const editId  = p.editId || null;
    const existing = editId ? DB.get(DB.STORES.produccion, editId) : null;

    const v = Utils.el(`
      <section>
        <button class="back-link" data-go="galp-select">Volver</button>
        <div class="context-bar">
          <span><strong>${plantel.nombre}</strong> · ${galpon.nombre} · Sector ${p.sector}</span>
          <span class="tag">${editId ? "Editar registro" : "Nuevo registro"}</span>
        </div>
        <div class="card">
          <h3>Fecha y hora</h3>
          <div class="form-grid">
            <div class="field">
              <label>Fecha del registro</label>
              <input id="f-fecha" type="date" />
              <span class="help">Editable para cargar días anteriores.</span>
            </div>
            <div class="field">
              <label>Hora</label>
              <input id="f-hora" type="time" />
              <span class="help">Se guarda automáticamente.</span>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>Mortalidad</h3>
          <div class="form-grid">
            <div class="field"><label>Hembras muertas</label><input id="f-mh" type="number" min="0" value="0" inputmode="numeric" /></div>
            <div class="field"><label>Machos muertos</label> <input id="f-mm" type="number" min="0" value="0" inputmode="numeric" /></div>
          </div>
          <span class="help">Se descuenta automáticamente del stock de aves del sector.</span>
        </div>
        <div class="card">
          <h3>Producción</h3>
          <div class="form-grid">
            <div class="field"><label>Producción 1</label><input class="prod" id="f-p1" type="number" min="0" value="0" inputmode="numeric" /></div>
            <div class="field"><label>Producción 2</label><input class="prod" id="f-p2" type="number" min="0" value="0" inputmode="numeric" /></div>
            <div class="field"><label>Producción 3</label><input class="prod" id="f-p3" type="number" min="0" value="0" inputmode="numeric" /></div>
            <div class="field"><label>Producción 4</label><input class="prod" id="f-p4" type="number" min="0" value="0" inputmode="numeric" /></div>
            <div class="field"><label>Producción 5</label><input class="prod" id="f-p5" type="number" min="0" value="0" inputmode="numeric" /></div>
          </div>
          <div class="totals-strip">
            <div><div class="lbl">Total producido</div><div class="val" id="t-total">0</div></div>
            <div><div class="lbl">Huevos aptos</div><div class="val" id="t-aptos">0</div></div>
            <div><div class="lbl">Cajones (180)</div><div class="val" id="t-cajones">0 + 0</div></div>
          </div>
        </div>
        <div class="card">
          <h3>Clasificación</h3>
          <div class="form-grid">
            <div class="field"><label>Doble yema</label><input class="cls" id="f-dy" type="number" min="0" value="0" inputmode="numeric" /></div>
            <div class="field"><label>Lavado</label>    <input class="cls" id="f-lv" type="number" min="0" value="0" inputmode="numeric" /></div>
            <div class="field"><label>Deforme</label>   <input class="cls" id="f-df" type="number" min="0" value="0" inputmode="numeric" /></div>
            <div class="field"><label>Piso</label>      <input class="cls" id="f-ps" type="number" min="0" value="0" inputmode="numeric" /></div>
            <div class="field"><label>Rotos</label>     <input class="cls" id="f-rt" type="number" min="0" value="0" inputmode="numeric" /></div>
          </div>
        </div>
        <div class="row">
          <button class="btn secondary" id="btn-preview">Ver resumen</button>
          <button class="btn accent" id="btn-save">Guardar registro</button>
        </div>
      </section>`);
    container.appendChild(v);

    const $ = (s) => v.querySelector(s);
    $("#f-fecha").value = existing ? existing.fecha : Utils.todayISO();
    $("#f-hora").value  = existing ? (existing.hora || Utils.nowHM()) : Utils.nowHM();

    if (existing) {
      $("#f-mh").value = existing.mortHembras || 0;
      $("#f-mm").value = existing.mortMachos  || 0;
      $("#f-p1").value = existing.prod1 || 0;
      $("#f-p2").value = existing.prod2 || 0;
      $("#f-p3").value = existing.prod3 || 0;
      $("#f-p4").value = existing.prod4 || 0;
      $("#f-p5").value = existing.prod5 || 0;
      $("#f-dy").value = existing.dobleYema || 0;
      $("#f-lv").value = existing.lavado || 0;
      $("#f-df").value = existing.deforme || 0;
      $("#f-ps").value = existing.piso || 0;
      $("#f-rt").value = existing.rotos || 0;
    }

    function build() {
      return {
        id: editId || undefined,
        fecha: $("#f-fecha").value,
        hora: $("#f-hora").value || Utils.nowHM(),
        plantelId: plantel.id, plantelNombre: plantel.nombre,
        galponId: galpon.id, galpon: galpon.nombre, sector: p.sector,
        mortHembras: Utils.intVal($("#f-mh")),
        mortMachos:  Utils.intVal($("#f-mm")),
        prod1: Utils.intVal($("#f-p1")), prod2: Utils.intVal($("#f-p2")),
        prod3: Utils.intVal($("#f-p3")), prod4: Utils.intVal($("#f-p4")),
        prod5: Utils.intVal($("#f-p5")),
        dobleYema: Utils.intVal($("#f-dy")),
        lavado: Utils.intVal($("#f-lv")),
        deforme: Utils.intVal($("#f-df")),
        piso: Utils.intVal($("#f-ps")),
        rotos: Utils.intVal($("#f-rt")),
      };
    }
    function recalc() {
      const r = build();
      const total = Stats.totalRegistro(r);
      const aptos = Stats.aptos(r);
      const c = Stats.cajones(total, 180);
      $("#t-total").textContent   = Utils.fmtNum(total);
      $("#t-aptos").textContent   = Utils.fmtNum(aptos);
      $("#t-cajones").textContent = `${c.cajones} + ${c.sobrantes}`;
    }
    v.querySelectorAll("input[type=number]").forEach(i => i.addEventListener("input", recalc));
    recalc();

    $("#btn-preview").addEventListener("click", () => mostrarResumen(build(), false));
    $("#btn-save").addEventListener("click", () => mostrarResumen(build(), true));

    async function mostrarResumen(reg, doSave) {
      const total = Stats.totalRegistro(reg);
      const aptos = Stats.aptos(reg);
      const c = Stats.cajones(total, 180);
      const html = `
        <ul class="summary-list">
          <li><span class="k">Fecha</span><span class="v">${Utils.fmtDate(reg.fecha)}</span></li>
          <li><span class="k">Hora</span><span class="v">${reg.hora}</span></li>
          <li><span class="k">Plantel</span><span class="v">${reg.plantelNombre}</span></li>
          <li><span class="k">Galpón</span><span class="v">${reg.galpon}</span></li>
          <li><span class="k">Sector</span><span class="v">${reg.sector}</span></li>
          <li><span class="k">Producción total</span><span class="v">${Utils.fmtNum(total)}</span></li>
          <li><span class="k">Mortalidad (H/M)</span><span class="v">${reg.mortHembras} / ${reg.mortMachos}</span></li>
          <li><span class="k">Doble yema</span><span class="v">${reg.dobleYema}</span></li>
          <li><span class="k">Lavado</span><span class="v">${reg.lavado}</span></li>
          <li><span class="k">Deforme</span><span class="v">${reg.deforme}</span></li>
          <li><span class="k">Piso</span><span class="v">${reg.piso}</span></li>
          <li><span class="k">Rotos</span><span class="v">${reg.rotos}</span></li>
          <li><span class="k">Huevos aptos</span><span class="v">${Utils.fmtNum(aptos)}</span></li>
          <li><span class="k">Cajones (180)</span><span class="v">${c.cajones} cajones + ${c.sobrantes} de nido</span></li>
        </ul>`;
      const ok = await Utils.confirm(html, { title: "Resumen del registro", ok: doSave ? "Guardar registro" : "Cerrar", cancel: doSave ? "Cancelar" : "Volver" });
      if (!ok) return;
      if (!doSave) return;

      // Duplicado: misma fecha + galpón + sector.
      const dup = DB.findProduccion(reg.fecha, reg.galponId, reg.sector);
      if (dup && (!editId || dup.id !== editId)) {
        const pr = await Utils.promptPassword(
          "Ya existe un registro para esta fecha, galpón y sector. Ingrese la contraseña para modificarlo.",
          { requireReason: true, title: "Modificar registro existente" });
        if (!pr) return;
        if (pr.pwd !== Auth.EDIT_PASS) { Utils.toast("Contraseña incorrecta", "error"); return; }
        if (!pr.reason) { Utils.toast("Debe ingresar un motivo", "error"); return; }
        actualizarConHistorial(dup, reg, pr.reason);
        return;
      }
      if (editId) {
        // Edición explícita desde lista del operario.
        const pr = await Utils.promptPassword("Confirme la modificación.", { requireReason: true });
        if (!pr) return;
        if (pr.pwd !== Auth.EDIT_PASS) { Utils.toast("Contraseña incorrecta", "error"); return; }
        if (!pr.reason) { Utils.toast("Debe ingresar un motivo", "error"); return; }
        actualizarConHistorial(existing, reg, pr.reason);
        return;
      }
      guardarNuevo(reg);
    }

    function guardarNuevo(reg) {
      reg.usuario = Auth.session.role;
      DB.saveProduccion(reg);
      DB.aplicarMortalidad(reg.galponId, reg.sector, reg.mortHembras, reg.mortMachos);
      DB.pushHistorial({ entidad: "produccion", refId: reg.id, accion: "alta", usuario: reg.usuario, snapshot: reg });
      const nuevas = Alerts.analizarRegistro(reg);
      Utils.toast(`Registro guardado. ${nuevas.length ? nuevas.length + " alerta(s) generada(s)." : ""}`, "ok");
      go("galp-select");
    }
    function actualizarConHistorial(prev, reg, motivo) {
      reg.id = prev.id;
      reg.usuario = Auth.session.role;
      reg.modificadoEn = Utils.nowISO();
      reg.motivoModificacion = motivo;
      // Revertir mortalidad anterior y aplicar la nueva.
      DB.aplicarMortalidad(prev.galponId, prev.sector, -(prev.mortHembras||0), -(prev.mortMachos||0));
      DB.aplicarMortalidad(reg.galponId, reg.sector, reg.mortHembras, reg.mortMachos);
      DB.saveProduccion(reg);
      DB.pushHistorial({ entidad: "produccion", refId: reg.id, accion: "modificacion", usuario: reg.usuario, motivo, antes: prev, despues: reg });
      Utils.toast("Registro modificado", "ok");
      go(Auth.isOperario() ? "op-registros" : "galp-select");
    }
  };

  /* ===== Vista: Operario — dashboard ===== */
  Views["op-dashboard"] = function (container) {
    const totalHoy = totalProduccionFecha(Utils.todayISO());
    const alertas = DB.listAlertas(true).length;
    const v = Utils.el(`
      <section>
        <div class="section-title">
          <h2>Panel Operario</h2>
          <span class="tag">${Utils.fmtDate(Utils.todayISO())}</span>
        </div>
        <div class="kpi-grid" style="margin-bottom:14px">
          <div class="kpi"><div class="label">Producción hoy</div><div class="value">${Utils.fmtNum(totalHoy)}</div></div>
          <div class="kpi"><div class="label">Alertas activas</div><div class="value">${alertas}</div></div>
        </div>
        <div class="dashboard-grid">
          ${dashBtn(1,"op-principal","Plantel principal","Detalle por galpón y sector en vivo")}
          ${dashBtn(2,"op-aves","Gestión de aves","Gallinas y gallos por sector")}
          ${dashBtn(3,"op-cajones","Cajones por plantel","1 cajón = 360 huevos")}
          ${dashBtn(4,"op-calculos","Cálculos automáticos","Postura y porcentajes")}
          ${dashBtn(5,"op-reportes","Reportes","Diario, semanal, mensual")}
          ${dashBtn(6,"op-graficos","Gráficos y estadísticas","Evolución y rankings")}
          ${dashBtn(7,"op-alertas","Alertas automáticas","Activas e historial")}
          ${dashBtn(8,"op-tareas","Gestión de tareas","Crear, editar, completar")}
          ${dashBtn(9,"op-export","Exportación","PDF, Excel, imprimir")}
        </div>
        <div class="card" style="margin-top:14px">
          <div class="card-title"><h2>Registros recientes</h2><button class="btn sm secondary" data-go="op-registros">Ver todos</button></div>
          <div id="recent-table"></div>
        </div>
      </section>`);
    container.appendChild(v);
    renderRecientes(v.querySelector("#recent-table"), 5);
  };

  function dashBtn(n, route, title, desc) {
    return `<button class="dash-btn" data-go="${route}">
      <span class="num">${String(n).padStart(2,"0")}</span>
      <span><span class="title">${title}</span><span class="desc">${desc}</span></span>
    </button>`;
  }

  function totalProduccionFecha(fecha) {
    return DB.listProduccion({ desde: fecha, hasta: fecha }).reduce((a, r) => a + Stats.totalRegistro(r), 0);
  }

  function renderRecientes(node, limit) {
    const rows = DB.listProduccion().slice(0, limit || 50);
    if (!rows.length) { node.innerHTML = `<div class="empty">Sin registros aún.</div>`; return; }
    const tbl = Utils.el(`<div class="table-wrap"><table class="data">
      <thead><tr><th>Fecha</th><th>Hora</th><th>Plantel</th><th>Galpón</th><th>Sector</th><th>Total</th><th>Aptos</th><th></th></tr></thead>
      <tbody></tbody></table></div>`);
    const tbody = tbl.querySelector("tbody");
    rows.forEach(r => {
      const tr = Utils.el(`<tr>
        <td>${Utils.fmtDate(r.fecha)}</td><td>${r.hora||""}</td>
        <td>${r.plantelNombre}</td><td>${r.galpon}</td><td>${r.sector}</td>
        <td>${Utils.fmtNum(Stats.totalRegistro(r))}</td>
        <td>${Utils.fmtNum(Stats.aptos(r))}</td>
        <td><button class="btn sm secondary" data-edit="${r.id}">Editar</button></td>
      </tr>`);
      tr.querySelector("[data-edit]").addEventListener("click", () =>
        go("galp-form", { plantelId: r.plantelId, galponId: r.galponId, sector: r.sector, editId: r.id }));
      tbody.appendChild(tr);
    });
    Utils.clear(node); node.appendChild(tbl);
  }

  /* ===== Vista: Operario — Registros (listado completo) ===== */
  Views["op-registros"] = function (container) {
    const v = Utils.el(`<section>
      <button class="back-link" data-go="op-dashboard">Volver</button>
      <div class="section-title"><h2>Todos los registros</h2></div>
      <div class="card"><div id="all-table"></div></div>
    </section>`);
    container.appendChild(v);
    renderRecientes(v.querySelector("#all-table"));
  };

  /* ===== Vista: Gestión de aves ===== */
  Views["op-aves"] = function (container) {
    const v = Utils.el(`<section>
      <button class="back-link" data-go="op-dashboard">Volver</button>
      <div class="section-title"><h2>Gestión de aves</h2></div>
      <p>Edite la cantidad de gallinas y gallos por sector. La mortalidad cargada se descuenta automáticamente.</p>
      <div id="aves-list"></div>
    </section>`);
    container.appendChild(v);
    const list = v.querySelector("#aves-list");
    DB.PLANTELES.forEach(p => {
      const card = Utils.el(`<div class="card"><h3>${p.nombre}</h3></div>`);
      p.galpones.forEach(g => g.sectores.forEach(s => {
        const st = DB.getStock(g.id, s);
        const row = Utils.el(`
          <div class="form-grid" style="align-items:end;margin-bottom:8px">
            <div class="field"><label>${g.nombre} · Sector ${s}</label><input type="text" disabled value="—" style="visibility:hidden;height:0;padding:0;border:0"/><span class="tag">${g.nombre} · ${s}</span></div>
            <div class="field"><label>Gallinas</label><input type="number" min="0" value="${st.gallinas||0}" data-k="gallinas"/></div>
            <div class="field"><label>Gallos</label>  <input type="number" min="0" value="${st.gallos||0}"   data-k="gallos"/></div>
            <div class="field"><button class="btn sm" data-save>Guardar</button></div>
          </div>`);
        row.querySelector("[data-save]").addEventListener("click", () => {
          const gal = Utils.intVal(row.querySelector('[data-k="gallinas"]'));
          const mac = Utils.intVal(row.querySelector('[data-k="gallos"]'));
          DB.setStock(g.id, s, gal, mac);
          DB.pushHistorial({ entidad: "aves", refId: g.id+"-"+s, accion: "stock", usuario: Auth.session.role, valor: { gallinas: gal, gallos: mac } });
          Utils.toast(`Stock actualizado: ${g.nombre} ${s}`, "ok");
        });
        card.appendChild(row);
      }));
      list.appendChild(card);
    });
  };

  /* ===== Vista: Cajones por plantel (1 cajón = 360) ===== */
  Views["op-cajones"] = function (container) {
    const v = Utils.el(`<section>
      <button class="back-link" data-go="op-dashboard">Volver</button>
      <div class="section-title"><h2>Cajones por plantel</h2></div>
      <p>Para el operario, 1 cajón = 360 huevos.</p>
      <div id="cj-list"></div>
    </section>`);
    container.appendChild(v);
    const list = v.querySelector("#cj-list");
    DB.PLANTELES.forEach(p => {
      const regs = DB.listProduccion({ plantelId: p.id });
      const total = regs.reduce((a,r)=>a+Stats.totalRegistro(r),0);
      const c360 = Stats.cajones(total, 360);
      const dy = regs.reduce((a,r)=>a+(r.dobleYema||0),0);
      const lv = regs.reduce((a,r)=>a+(r.lavado||0),0);
      const df = regs.reduce((a,r)=>a+(r.deforme||0),0);
      const ps = regs.reduce((a,r)=>a+(r.piso||0),0);
      const rt = regs.reduce((a,r)=>a+(r.rotos||0),0);
      const card = Utils.el(`<div class="card">
        <div class="card-title"><h2>${p.nombre}</h2></div>
        <div class="kpi-grid">
          <div class="kpi"><div class="label">Total huevos</div><div class="value">${Utils.fmtNum(total)}</div></div>
          <div class="kpi"><div class="label">Cajones (360)</div><div class="value">${c360.cajones}</div></div>
          <div class="kpi"><div class="label">Sobrantes</div><div class="value">${c360.sobrantes}</div></div>
          <div class="kpi"><div class="label">Registros</div><div class="value">${regs.length}</div></div>
        </div>
        <div class="divider"></div>
        <h3>Clasificación acumulada</h3>
        <ul class="summary-list">
          <li><span class="k">Doble yema</span><span class="v">${Utils.fmtNum(dy)}</span></li>
          <li><span class="k">Lavado</span><span class="v">${Utils.fmtNum(lv)}</span></li>
          <li><span class="k">Deforme</span><span class="v">${Utils.fmtNum(df)}</span></li>
          <li><span class="k">Piso</span><span class="v">${Utils.fmtNum(ps)}</span></li>
          <li><span class="k">Rotos</span><span class="v">${Utils.fmtNum(rt)}</span></li>
        </ul>
        <div class="divider"></div>
        <h3>Historial diario</h3>
        <div class="hist-tbl"></div>
      </div>`);
      const hist = card.querySelector(".hist-tbl");
      const porFecha = Stats.resumirPorFecha(regs);
      if (!porFecha.length) hist.innerHTML = `<div class="empty">Sin registros.</div>`;
      else {
        const t = Utils.el(`<div class="table-wrap"><table class="data">
          <thead><tr><th>Fecha</th><th>Total</th><th>Cajones (360)</th><th>Aptos</th><th>Rotos</th><th>Mortalidad</th></tr></thead>
          <tbody></tbody></table></div>`);
        const tb = t.querySelector("tbody");
        porFecha.slice().reverse().forEach(d => {
          const cj = Stats.cajones(d.total, 360);
          tb.appendChild(Utils.el(`<tr>
            <td>${Utils.fmtDate(d.fecha)}</td>
            <td>${Utils.fmtNum(d.total)}</td>
            <td>${cj.cajones} + ${cj.sobrantes}</td>
            <td>${Utils.fmtNum(d.aptos)}</td>
            <td>${Utils.fmtNum(d.rotos)}</td>
            <td>${Utils.fmtNum(d.mortalidad)}</td>
          </tr>`));
        });
        hist.appendChild(t);
      }
      list.appendChild(card);
    });
  };

  /* ===== Vista: Cálculos automáticos ===== */
  Views["op-calculos"] = function (container) {
    const all = DB.listProduccion();
    const stocks = DB.listStock();
    const totalGallinas = stocks.reduce((a, s) => a + (s.gallinas||0), 0);
    const totalHoy = totalProduccionFecha(Utils.todayISO());
    const postGen = Stats.postura(totalHoy, totalGallinas);
    const cmp = Stats.comparacionDiaAnterior(all);

    const v = Utils.el(`<section>
      <button class="back-link" data-go="op-dashboard">Volver</button>
      <div class="section-title"><h2>Cálculos automáticos</h2></div>
      <div class="kpi-grid">
        <div class="kpi"><div class="label">Postura general (hoy)</div><div class="value">${Utils.pct(postGen)}</div><div class="delta">${Utils.fmtNum(totalHoy)} huevos / ${Utils.fmtNum(totalGallinas)} gallinas</div></div>
        <div class="kpi ${cmp.dir==="Subió"?"up":cmp.dir==="Bajó"?"down":""}"><div class="label">Vs día anterior</div><div class="value">${cmp.dir}</div><div class="delta">${cmp.delta>=0?"+":""}${Utils.fmtNum(cmp.delta)} huevos</div></div>
        <div class="kpi"><div class="label">Mortalidad diaria</div><div class="value">${Utils.fmtNum(mortHoy(all))}</div></div>
        <div class="kpi"><div class="label">% Rotos (acum.)</div><div class="value">${Utils.pct(Stats.pctRotos(all))}</div></div>
        <div class="kpi"><div class="label">% Defectuosos</div><div class="value">${Utils.pct(Stats.pctDefectuosos(all))}</div></div>
      </div>
      <div class="card" style="margin-top:14px">
        <h3>Producción por plantel</h3>
        <div id="bk-plantel"></div>
      </div>
      <div class="card">
        <h3>Producción por galpón</h3>
        <div id="bk-galpon"></div>
      </div>
      <div class="card">
        <h3>Producción por sector</h3>
        <div id="bk-sector"></div>
      </div>
    </section>`);
    container.appendChild(v);
    renderBreakdown(v.querySelector("#bk-plantel"), Stats.resumirPor(all, "plantelNombre"));
    renderBreakdown(v.querySelector("#bk-galpon"),  Stats.resumirPor(all, "galpon"));
    renderBreakdown(v.querySelector("#bk-sector"),  Stats.resumirPor(all, "sector"));
  };

  function mortHoy(all) {
    const hoy = Utils.todayISO();
    return all.filter(r => r.fecha === hoy).reduce((a, r) => a + (r.mortHembras||0)+(r.mortMachos||0), 0);
  }

  function renderBreakdown(node, rows) {
    if (!rows.length) { node.innerHTML = `<div class="empty">Sin datos.</div>`; return; }
    const t = Utils.el(`<div class="table-wrap"><table class="data"><thead><tr><th>Categoría</th><th>Total</th><th>Aptos</th><th>Mortalidad</th><th>Registros</th></tr></thead><tbody></tbody></table></div>`);
    const tb = t.querySelector("tbody");
    rows.sort((a,b) => b.total - a.total).forEach(r => {
      tb.appendChild(Utils.el(`<tr><td>${r.key}</td><td>${Utils.fmtNum(r.total)}</td><td>${Utils.fmtNum(r.aptos)}</td><td>${Utils.fmtNum(r.mortalidad)}</td><td>${r.registros}</td></tr>`));
    });
    Utils.clear(node); node.appendChild(t);
  }

  /* ===== Vista: Reportes ===== */
  Views["op-reportes"] = function (container) {
    const v = Utils.el(`<section>
      <button class="back-link" data-go="op-dashboard">Volver</button>
      <div class="section-title"><h2>Reportes</h2></div>
      <div class="card">
        <div class="form-grid">
          <div class="field">
            <label>Período</label>
            <select id="r-periodo">
              <option value="diario">Diario</option>
              <option value="semanal" selected>Semanal (7 días)</option>
              <option value="mensual">Mensual (30 días)</option>
              <option value="todo">Histórico completo</option>
            </select>
          </div>
          <div class="field">
            <label>Plantel</label>
            <select id="r-plantel"><option value="">Todos</option>${DB.PLANTELES.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Galpón</label>
            <select id="r-galpon"><option value="">Todos</option>${DB.PLANTELES.flatMap(p=>p.galpones).map(g=>`<option value="${g.id}">${g.nombre}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Sector</label>
            <select id="r-sector"><option value="">Todos</option><option value="A">A</option><option value="B">B</option></select>
          </div>
        </div>
        <div class="row" style="margin-top:10px">
          <button class="btn" id="r-gen">Generar</button>
          <button class="btn secondary" id="r-pdf">Exportar PDF</button>
          <button class="btn secondary" id="r-xls">Exportar Excel</button>
          <button class="btn secondary" id="r-print">Imprimir</button>
        </div>
      </div>
      <div class="card" id="r-out"><div class="empty">Genere un reporte para visualizarlo.</div></div>
      <div class="card">
        <h3>Comparaciones</h3>
        <div id="r-comp"></div>
      </div>
    </section>`);
    container.appendChild(v);
    let ultimo = null;

    function filtros() {
      const per = v.querySelector("#r-periodo").value;
      const rango = Reports.rangoFechas(per);
      return {
        plantelId: v.querySelector("#r-plantel").value || undefined,
        galponId:  v.querySelector("#r-galpon").value  || undefined,
        sector:    v.querySelector("#r-sector").value  || undefined,
        desde: rango.desde || undefined, hasta: rango.hasta || undefined,
      };
    }
    function generar() {
      ultimo = Reports.generar(filtros());
      const out = v.querySelector("#r-out");
      const f = ultimo.filas;
      if (!f.length) { out.innerHTML = `<div class="empty">Sin registros para los filtros seleccionados.</div>`; return; }
      const head = Object.keys(f[0]);
      const rows = f.map(r => `<tr>${head.map(h=>`<td>${r[h] ?? ""}</td>`).join("")}</tr>`).join("");
      out.innerHTML = `
        <div class="card-title"><h2>Resultado</h2><span class="tag">Generado: ${new Date().toLocaleString("es-AR")}</span></div>
        <div class="kpi-grid">
          <div class="kpi"><div class="label">Registros</div><div class="value">${ultimo.resumen.totalRegistros}</div></div>
          <div class="kpi"><div class="label">Total huevos</div><div class="value">${Utils.fmtNum(ultimo.resumen.totalHuevos)}</div></div>
          <div class="kpi"><div class="label">Aptos</div><div class="value">${Utils.fmtNum(ultimo.resumen.totalAptos)}</div></div>
          <div class="kpi"><div class="label">Mortalidad</div><div class="value">${Utils.fmtNum(ultimo.resumen.mortalidad)}</div></div>
        </div>
        <div class="divider"></div>
        <div class="table-wrap"><table class="data">
          <thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${rows}</tbody></table></div>`;
      // Comparaciones extra: A vs B y galpón vs galpón.
      const comp = v.querySelector("#r-comp");
      const porSector = Stats.resumirPor(ultimo.registros, "sector");
      const porGalpon = Stats.resumirPor(ultimo.registros, "galpon");
      comp.innerHTML = `
        <div class="row"><div style="flex:1"><h3>Sector A vs Sector B</h3>${tablaComp(porSector)}</div>
        <div style="flex:1"><h3>Comparación entre galpones</h3>${tablaComp(porGalpon)}</div></div>`;
    }
    function tablaComp(rows) {
      if (!rows.length) return `<div class="empty">Sin datos.</div>`;
      return `<div class="table-wrap"><table class="data"><thead><tr><th>Cat.</th><th>Total</th><th>Aptos</th></tr></thead><tbody>${
        rows.map(r=>`<tr><td>${r.key}</td><td>${Utils.fmtNum(r.total)}</td><td>${Utils.fmtNum(r.aptos)}</td></tr>`).join("")
      }</tbody></table></div>`;
    }
    v.querySelector("#r-gen").addEventListener("click", generar);
    v.querySelector("#r-pdf").addEventListener("click", () => { if (!ultimo) generar(); Reports.exportPDF("Reporte de producción", ultimo.filas, "alibue-reporte.pdf"); });
    v.querySelector("#r-xls").addEventListener("click", () => { if (!ultimo) generar(); Reports.exportXLSX(ultimo.filas, "alibue-reporte.xlsx"); });
    v.querySelector("#r-print").addEventListener("click", () => { if (!ultimo) generar(); Reports.imprimir("Reporte de producción", ultimo.filas); });
  };

  /* ===== Vista: Gráficos ===== */
  Views["op-graficos"] = function (container) {
    const v = Utils.el(`<section>
      <button class="back-link" data-go="op-dashboard">Volver</button>
      <div class="section-title"><h2>Gráficos y estadísticas</h2></div>
      <div class="card"><h3>Producción total (últimos 14 días)</h3><canvas id="g1" class="chart"></canvas></div>
      <div class="card"><h3>Mortalidad diaria</h3><canvas id="g2" class="chart"></canvas></div>
      <div class="card"><h3>Huevos rotos vs defectuosos</h3><canvas id="g3" class="chart"></canvas></div>
      <div class="card"><h3>Ranking por sector — Mejor rendimiento</h3><div id="rk-mejor"></div></div>
      <div class="card"><h3>Ranking por sector — Peor rendimiento</h3><div id="rk-peor"></div></div>
    </section>`);
    container.appendChild(v);
    setTimeout(renderGraficos, 50, v);
  };

  function renderGraficos(v) {
    const all = DB.listProduccion();
    const porFecha = Stats.resumirPorFecha(all).slice(-14);
    const labels = porFecha.map(x => Utils.fmtDate(x.fecha));
    new Chart(v.querySelector("#g1"), {
      type: "line",
      data: { labels, datasets: [{ label: "Total huevos", data: porFecha.map(x=>x.total), borderColor: "#1f3a2e", backgroundColor: "rgba(31,58,46,.15)", tension: .25, fill: true }] },
      options: chartOpts(),
    });
    new Chart(v.querySelector("#g2"), {
      type: "bar",
      data: { labels, datasets: [{ label: "Mortalidad", data: porFecha.map(x=>x.mortalidad), backgroundColor: "#9a2b1f" }] },
      options: chartOpts(),
    });
    new Chart(v.querySelector("#g3"), {
      type: "bar",
      data: { labels, datasets: [
        { label: "Rotos", data: porFecha.map(x=>x.rotos), backgroundColor: "#b46a16" },
        { label: "Defectuosos", data: porFecha.map(x=>x.defectuosos), backgroundColor: "#b8862b" },
      ]},
      options: chartOpts(),
    });
    // Rankings por sector
    const porSec = Stats.resumirPor(all, "galpon").map(r => ({ ...r, prom: r.registros ? r.total/r.registros : 0 }));
    const mejor = [...porSec].sort((a,b)=>b.prom-a.prom).slice(0,5);
    const peor  = [...porSec].sort((a,b)=>a.prom-b.prom).slice(0,5);
    v.querySelector("#rk-mejor").innerHTML = rankingTbl(mejor);
    v.querySelector("#rk-peor").innerHTML  = rankingTbl(peor);
  }
  function chartOpts() {
    return { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } };
  }
  function rankingTbl(rows) {
    if (!rows.length) return `<div class="empty">Sin datos.</div>`;
    return `<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Galpón</th><th>Promedio/registro</th><th>Total</th></tr></thead><tbody>${
      rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.key}</td><td>${Utils.fmtNum(Math.round(r.prom))}</td><td>${Utils.fmtNum(r.total)}</td></tr>`).join("")
    }</tbody></table></div>`;
  }

  /* ===== Vista: Alertas ===== */
  Views["op-alertas"] = function (container) {
    const v = Utils.el(`<section>
      <button class="back-link" data-go="op-dashboard">Volver</button>
      <div class="section-title"><h2>Alertas automáticas</h2></div>
      <div class="card"><h3>Activas</h3><div id="al-act"></div></div>
      <div class="card"><h3>Historial</h3><div id="al-hist"></div></div>
    </section>`);
    container.appendChild(v);
    renderAlertas(v);
  };
  function renderAlertas(v) {
    const act = DB.listAlertas(true);
    const hist = DB.listAlertas(false).filter(a => a.resuelta);
    const na = v.querySelector("#al-act"); Utils.clear(na);
    if (!act.length) na.appendChild(Utils.el(`<div class="empty">No hay alertas activas.</div>`));
    act.forEach(a => {
      const el = Utils.el(`<div class="alert-item ${a.severidad}">
        <div class="title">${a.titulo}</div>
        <div class="meta">${a.detalle}</div>
        <div class="meta">${new Date(a.ts).toLocaleString("es-AR")}</div>
        <div style="margin-top:6px"><button class="btn sm secondary" data-res>Marcar resuelta</button></div>
      </div>`);
      el.querySelector("[data-res]").addEventListener("click", () => { DB.resolverAlerta(a.id); renderAlertas(v); });
      na.appendChild(el);
    });
    const nh = v.querySelector("#al-hist"); Utils.clear(nh);
    if (!hist.length) nh.appendChild(Utils.el(`<div class="empty">Sin historial.</div>`));
    hist.forEach(a => nh.appendChild(Utils.el(`<div class="alert-item info">
      <div class="title">${a.titulo}</div><div class="meta">${a.detalle}</div>
      <div class="meta">Resuelta: ${new Date(a.resueltaEn).toLocaleString("es-AR")}</div></div>`)));
  }

  /* ===== Vista: Tareas ===== */
  Views["op-tareas"] = function (container) { Tasks.render(container); };

  /* ===== Vista: Exportación ===== */
  Views["op-export"] = function (container) {
    const v = Utils.el(`<section>
      <button class="back-link" data-go="op-dashboard">Volver</button>
      <div class="section-title"><h2>Exportación y respaldos</h2></div>
      <div class="card">
        <h3>Reportes</h3>
        <p>Exporte el histórico completo de producción.</p>
        <div class="row">
          <button class="btn" id="ex-pdf">Exportar PDF</button>
          <button class="btn" id="ex-xls">Exportar Excel</button>
          <button class="btn secondary" id="ex-print">Imprimir</button>
        </div>
      </div>
      <div class="card">
        <h3>Respaldo de datos</h3>
        <p>Descargue un archivo JSON con todos los datos del sistema o restaure desde un respaldo anterior.</p>
        <div class="row">
          <button class="btn" id="bk-down">Descargar respaldo</button>
          <label class="btn secondary" style="text-align:center">Importar respaldo
            <input type="file" id="bk-up" accept="application/json" hidden />
          </label>
        </div>
      </div>
    </section>`);
    container.appendChild(v);
    v.querySelector("#ex-pdf").addEventListener("click", () => {
      const filas = Reports.tabularRegistros(DB.listProduccion());
      Reports.exportPDF("Histórico de producción", filas, "alibue-historico.pdf");
    });
    v.querySelector("#ex-xls").addEventListener("click", () => {
      const filas = Reports.tabularRegistros(DB.listProduccion());
      Reports.exportXLSX(filas, "alibue-historico.xlsx");
    });
    v.querySelector("#ex-print").addEventListener("click", () => {
      Reports.imprimir("Histórico de producción", Reports.tabularRegistros(DB.listProduccion()));
    });
    v.querySelector("#bk-down").addEventListener("click", () => {
      Utils.download(`alibue-backup-${Utils.todayISO()}.json`, JSON.stringify(DB.exportAll(), null, 2));
    });
    v.querySelector("#bk-up").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!await Utils.confirm("Esto reemplazará los datos actuales. ¿Continuar?", { danger: true, ok: "Importar" })) return;
      const txt = await f.text();
      try { DB.importAll(JSON.parse(txt)); Utils.toast("Respaldo importado", "ok"); go("op-dashboard"); }
      catch (err) { Utils.toast("Archivo inválido: " + err.message, "error"); }
    });
  };

  /* ===== Vista: Plantel principal (detalle por galpón y sector) ===== */
  Views["op-principal"] = function (container, params) {
    const fechaSel = (params && params.fecha) || Utils.todayISO();
    const regsDia = DB.listProduccion({ desde: fechaSel, hasta: fechaSel });
    const stocks  = DB.listStock();
    const totalGall = stocks.reduce((a,s)=>a+(s.gallinas||0),0);
    const totalDia  = regsDia.reduce((a,r)=>a+Stats.totalRegistro(r),0);
    const postGen   = Stats.postura(totalDia, totalGall);
    const mort      = regsDia.reduce((a,r)=>a+(r.mortHembras||0)+(r.mortMachos||0),0);
    const alertas   = DB.listAlertas(true);

    const v = Utils.el(`<section>
      <button class="back-link" data-go="op-dashboard">Volver</button>
      <div class="section-title">
        <h2>Plantel principal</h2>
        <span class="tag">${Utils.fmtDate(fechaSel)}</span>
      </div>
      <div class="card date-picker-card">
        <div class="form-grid">
          <div class="field">
            <label>Fecha a visualizar</label>
            <input id="pp-fecha" type="date" value="${fechaSel}" />
            <span class="help">Cambie la fecha para actualizar todos los datos del plantel principal.</span>
          </div>
        </div>
      </div>
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi"><div class="label">Producción del día</div><div class="value">${Utils.fmtNum(totalDia)}</div></div>
        <div class="kpi"><div class="label">Postura general</div><div class="value">${Utils.pct(postGen)}</div></div>
        <div class="kpi"><div class="label">Mortalidad</div><div class="value">${Utils.fmtNum(mort)}</div></div>
        <div class="kpi"><div class="label">Alertas activas</div><div class="value">${alertas.length}</div></div>
      </div>
      <div id="dp-detalle"></div>
      <div class="card">
        <div class="card-title"><h2>Alertas activas</h2><button class="btn sm secondary" data-go="op-alertas">Ver todas</button></div>
        <div id="dp-alerts"></div>
      </div>
    </section>`);
    container.appendChild(v);

    v.querySelector("#pp-fecha").addEventListener("change", (e) => {
      go("op-principal", { fecha: e.target.value });
    });

    const detalle = v.querySelector("#dp-detalle");
    DB.PLANTELES.forEach(p => {
      // Reúno registros e stock del plantel
      const regsP = regsDia.filter(r => r.plantelId === p.id);
      const card = Utils.el(`<div class="card"><div class="card-title"><h2>${p.nombre}</h2></div></div>`);
      p.galpones.forEach(g => g.sectores.forEach(s => {
        const reg = regsDia.find(r => r.galponId === g.id && r.sector === s);
        const st  = DB.getStock(g.id, s);
        card.appendChild(renderDetalleSector(g, s, reg, st));
      }));
      // Totales del plantel (suma de todos los galpones y sectores)
      card.appendChild(renderTotalesPlantel(p, regsP));
      detalle.appendChild(card);
    });

    const al = v.querySelector("#dp-alerts");
    if (!alertas.length) al.innerHTML = `<div class="empty">Sin alertas activas.</div>`;
    else alertas.slice(0,5).forEach(a => al.appendChild(Utils.el(`<div class="alert-item ${a.severidad}">
      <div class="title">${a.titulo}</div><div class="meta">${a.detalle}</div></div>`)));
  };

  function renderDetalleSector(g, s, reg, st) {
    const r = reg || {};
    const prods = [r.prod1||0, r.prod2||0, r.prod3||0, r.prod4||0, r.prod5||0];
    const total = prods.reduce((a,b)=>a+b,0);
    const aptos = Math.max(0, total - (r.dobleYema||0) - (r.lavado||0) - (r.deforme||0) - (r.piso||0) - (r.rotos||0));
    const gallinasIni = (st.gallinas||0) + (r.mortHembras||0);
    const mortH = r.mortHembras||0;
    const restoG = Math.max(0, gallinasIni - mortH);
    // % se calcula sobre las gallinas que quedan en ese galpón y sector
    const pct = (n) => restoG ? ((n/restoG)*100).toFixed(2) + "%" : "—";
    const cell = (n) => `<td class="cell-num">${n ? Utils.fmtNum(n) : "<span class='dim'>—</span>"}</td>`;

    const wrap = Utils.el(`<div class="sector-detalle">
      <div class="sector-detalle-head">
        <span class="sector-title">${g.nombre} · Sector ${s}</span>
        <span class="sector-sub">${reg ? "Registro cargado" : "Sin registro"}</span>
      </div>
      <table class="detalle-tbl">
        <tbody>
          <tr class="row-prod">
            <th>Producción</th>
            ${prods.map(cell).join("")}
            <td class="cell-total">${Utils.fmtNum(total)}</td>
            <td class="cell-pct strong">${pct(total)}</td>
          </tr>
          <tr><th>Huevos aptos</th><td colspan="5" class="cell-num">${Utils.fmtNum(aptos)}</td><td class="cell-total">${Utils.fmtNum(aptos)}</td><td class="cell-pct">${pct(aptos)}</td></tr>
          <tr><th>Rotos</th><td colspan="5" class="cell-num">${Utils.fmtNum(r.rotos||0)}</td><td class="cell-total">${Utils.fmtNum(r.rotos||0)}</td><td class="cell-pct">${pct(r.rotos||0)}</td></tr>
          <tr><th>Deformes</th><td colspan="5" class="cell-num">${Utils.fmtNum(r.deforme||0)}</td><td class="cell-total">${Utils.fmtNum(r.deforme||0)}</td><td class="cell-pct">${pct(r.deforme||0)}</td></tr>
          <tr><th>Lavados</th><td colspan="5" class="cell-num">${Utils.fmtNum(r.lavado||0)}</td><td class="cell-total">${Utils.fmtNum(r.lavado||0)}</td><td class="cell-pct">${pct(r.lavado||0)}</td></tr>
          <tr><th>Piso</th><td colspan="5" class="cell-num">${Utils.fmtNum(r.piso||0)}</td><td class="cell-total">${Utils.fmtNum(r.piso||0)}</td><td class="cell-pct">${pct(r.piso||0)}</td></tr>
          <tr><th>Doble yema</th><td colspan="5" class="cell-num">${Utils.fmtNum(r.dobleYema||0)}</td><td class="cell-total">${Utils.fmtNum(r.dobleYema||0)}</td><td class="cell-pct">${pct(r.dobleYema||0)}</td></tr>
        </tbody>
      </table>
      <div class="aves-strip">
        <div><span class="lbl">Gallinas totales</span><span class="val">${Utils.fmtNum(gallinasIni)}</span></div>
        <div><span class="lbl">Muertas hoy</span><span class="val neg">${Utils.fmtNum(mortH)}</span></div>
        <div><span class="lbl">Quedan</span><span class="val pos">${Utils.fmtNum(restoG)}</span></div>
      </div>
    </div>`);
    return wrap;
  }

  function renderTotalesPlantel(p, regs) {
    const sum = (fn) => regs.reduce((a,r)=>a+(fn(r)||0),0);
    const total = sum(Stats.totalRegistro);
    const aptos = sum(Stats.aptos);
    const rotos = sum(r=>r.rotos);
    const lavados = sum(r=>r.lavado);
    const piso = sum(r=>r.piso);
    const deforme = sum(r=>r.deforme);
    const dobleYema = sum(r=>r.dobleYema);
    // % se calcula sobre el total de gallinas que quedan en todo el plantel
    let gallinasPlantel = 0;
    p.galpones.forEach(g => g.sectores.forEach(s => {
      const st = DB.getStock(g.id, s);
      gallinasPlantel += (st.gallinas||0);
    }));
    const pct = (n) => gallinasPlantel ? ((n/gallinasPlantel)*100).toFixed(2) + "%" : "—";
    const cajones = Math.floor(aptos / 360);
    const sobrantes = aptos % 360;
    return Utils.el(`<div class="sector-detalle plantel-total">
      <div class="sector-detalle-head">
        <span class="sector-title">Total ${p.nombre}</span>
        <span class="sector-sub">% sobre ${Utils.fmtNum(gallinasPlantel)} gallinas del plantel</span>
      </div>
      <table class="detalle-tbl">
        <tbody>
          <tr class="row-prod"><th>Producción total</th><td class="cell-num">${Utils.fmtNum(total)}</td><td class="cell-pct strong">${pct(total)}</td></tr>
          <tr><th>Huevos aptos</th><td class="cell-num">${Utils.fmtNum(aptos)}</td><td class="cell-pct">${pct(aptos)}</td></tr>
          <tr><th>Rotos</th><td class="cell-num">${Utils.fmtNum(rotos)}</td><td class="cell-pct">${pct(rotos)}</td></tr>
          <tr><th>Deformes</th><td class="cell-num">${Utils.fmtNum(deforme)}</td><td class="cell-pct">${pct(deforme)}</td></tr>
          <tr><th>Lavados</th><td class="cell-num">${Utils.fmtNum(lavados)}</td><td class="cell-pct">${pct(lavados)}</td></tr>
          <tr><th>Piso</th><td class="cell-num">${Utils.fmtNum(piso)}</td><td class="cell-pct">${pct(piso)}</td></tr>
          <tr><th>Doble yema</th><td class="cell-num">${Utils.fmtNum(dobleYema)}</td><td class="cell-pct">${pct(dobleYema)}</td></tr>
          <tr class="row-cajones"><th>Cajones sacados (÷360)</th><td class="cell-num">${Utils.fmtNum(cajones)}</td><td class="cell-pct">${sobrantes>0 ? `+ ${Utils.fmtNum(sobrantes)} huevos aptos` : "exacto"}</td></tr>
        </tbody>
      </table>
    </div>`);
  }

  /* ===== Boot ===== */
  function boot() {
    if (Auth.session) {
      go(Auth.session.role === "operario" ? "op-dashboard" : "galp-select");
    } else {
      go("login");
    }
  }
  // Permite que cloud.js re-renderice la vista actual cuando llegan cambios remotos.
  window.AlibueRefresh = function () {
    if (currentRoute) go(currentRoute.route, currentRoute.params);
  };
  // Esperamos a que la nube cargue datos (si está configurada) antes de mostrar la UI.
  if (window.Cloud && typeof Cloud.init === "function") {
    Cloud.init().then(boot, boot);
  } else {
    boot();
  }
})();
