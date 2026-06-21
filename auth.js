/* auth.js — Manejo de sesión simple (perfiles Galponero/Operario). */
(function (global) {
  const KEY = "alibue:session";
  const OPERARIO_PASS = "Alibue";          // contraseña operario
  const EDIT_PASS = "4708";                // contraseña edición de registros

  const Auth = {
    EDIT_PASS,
    get session() {
      try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); }
      catch (_) { return null; }
    },
    set session(v) {
      if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
      else sessionStorage.removeItem(KEY);
    },
    loginGalponero() {
      Auth.session = { role: "galponero", since: Utils.nowISO() };
    },
    loginOperario(pwd) {
      if (pwd !== OPERARIO_PASS) return false;
      Auth.session = { role: "operario", since: Utils.nowISO() };
      return true;
    },
    logout() { Auth.session = null; },
    isOperario() { return Auth.session && Auth.session.role === "operario"; },
    isGalponero() { return Auth.session && Auth.session.role === "galponero"; },
  };
  global.Auth = Auth;
})(window);