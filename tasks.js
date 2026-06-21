/* tasks.js — Vista de gestión de tareas. */
(function (global) {
  const Tasks = {
    render(container) {
      Utils.clear(container);
      const wrap = Utils.el(`
        <section>
          <button class="back-link" data-go="op-dashboard">Volver</button>
          <div class="section-title"><h2>Gestión de tareas</h2></div>
          <div class="card">
            <div class="form-grid">
              <div class="field full">
                <label>Nueva tarea</label>
                <input id="t-text" placeholder="Ej.: Viernes — tirar viruta en Galpón 4" />
              </div>
              <div class="field">
                <label>Fecha objetivo</label>
                <input id="t-fecha" type="date" />
              </div>
              <div class="field">
                <label>Asignada a</label>
                <input id="t-asignado" placeholder="Opcional" />
              </div>
            </div>
            <div class="row" style="margin-top:10px">
              <button class="btn" id="t-add">Agregar tarea</button>
            </div>
          </div>
          <div class="card">
            <h3>Pendientes y realizadas</h3>
            <div id="t-list"></div>
          </div>
        </section>`);
      container.appendChild(wrap);
      wrap.querySelector("#t-fecha").value = Utils.todayISO();
      wrap.querySelector("#t-add").addEventListener("click", () => {
        const text = wrap.querySelector("#t-text").value.trim();
        if (!text) { Utils.toast("Escribe la tarea", "error"); return; }
        DB.saveTarea({
          texto: text,
          fecha: wrap.querySelector("#t-fecha").value || Utils.todayISO(),
          asignado: wrap.querySelector("#t-asignado").value.trim(),
          completada: false,
          creadaEn: Utils.nowISO(),
        });
        wrap.querySelector("#t-text").value = "";
        Tasks.renderList(wrap.querySelector("#t-list"));
        Utils.toast("Tarea agregada", "ok");
      });
      Tasks.renderList(wrap.querySelector("#t-list"));
    },
    renderList(node) {
      Utils.clear(node);
      const list = DB.listTareas();
      if (!list.length) {
        node.appendChild(Utils.el(`<div class="empty">No hay tareas registradas.</div>`));
        return;
      }
      list.forEach(t => {
        const item = Utils.el(`
          <div class="task-item ${t.completada ? "done" : ""}">
            <input type="checkbox" ${t.completada ? "checked" : ""} />
            <div style="flex:1;min-width:0">
              <div class="task-text">${t.texto}</div>
              <div class="task-meta">${Utils.fmtDate(t.fecha)} ${t.asignado ? "· " + t.asignado : ""}</div>
            </div>
            <button class="btn sm secondary" data-edit>Editar</button>
            <button class="btn sm danger" data-del>Eliminar</button>
          </div>`);
        item.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
          t.completada = e.target.checked;
          DB.saveTarea(t);
          Tasks.renderList(node);
        });
        item.querySelector("[data-del]").addEventListener("click", async () => {
          if (await Utils.confirm("¿Eliminar esta tarea?", { danger: true, ok: "Eliminar" })) {
            DB.removeTarea(t.id);
            Tasks.renderList(node);
          }
        });
        item.querySelector("[data-edit]").addEventListener("click", () => {
          const nuevo = prompt("Editar tarea:", t.texto);
          if (nuevo && nuevo.trim()) {
            t.texto = nuevo.trim();
            DB.saveTarea(t);
            Tasks.renderList(node);
          }
        });
        node.appendChild(item);
      });
    },
  };
  global.Tasks = Tasks;
})(window);