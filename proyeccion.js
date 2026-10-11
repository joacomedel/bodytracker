/* BodyTracker — proyección: promedios semanales (lun-dom), ritmo y serie a futuro.
 * Módulo puro sin DOM: se usa desde app.js (window.BTProy) y desde tests node. */
(function () {
  "use strict";

  var DAY = 86400000;

  function mondayOf(t) {
    var d = new Date(t);
    var dow = (d.getDay() + 6) % 7; // 0 = lunes
    var m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
    m.setHours(0, 0, 0, 0);
    return m.getTime();
  }

  function weekLabel(mondayT) {
    var d = new Date(mondayT);
    var dd = String(d.getDate()); if (dd.length < 2) dd = "0" + dd;
    var mm = String(d.getMonth() + 1); if (mm.length < 2) mm = "0" + mm;
    return dd + "/" + mm;
  }

  /** Agrupa por semana calendario lun-dom. Devuelve [{monday, label, n, avg}] ordenado. */
  function groupWeekly(entries) {
    var map = {};
    (entries || []).forEach(function (e) {
      if (!e || e.t == null || !isFinite(e.peso)) return;
      var k = mondayOf(e.t);
      if (!map[k]) map[k] = { monday: k, label: weekLabel(k), n: 0, sum: 0 };
      map[k].n += 1;
      map[k].sum += e.peso;
    });
    return Object.keys(map).map(Number).sort(function (a, b) { return a - b; }).map(function (k) {
      var w = map[k];
      return { monday: w.monday, label: w.label, n: w.n, avg: w.sum / w.n };
    });
  }

  /** Ritmo semanal = promedio de diferencias entre promedios semanales consecutivos. null si <2 semanas. */
  function computeRitmo(weeks) {
    if (!weeks || weeks.length < 2) return null;
    var s = 0;
    for (var i = 1; i < weeks.length; i++) s += weeks[i].avg - weeks[i - 1].avg;
    return s / (weeks.length - 1);
  }

  /** Serie proyectada semana 0..n desde la base. [{t, peso, week}] */
  function projectSeries(base, ritmo, nWeeks) {
    var n = nWeeks == null ? 16 : nWeeks;
    var out = [];
    for (var w = 0; w <= n; w++) {
      out.push({ t: base.t + w * 7 * DAY, peso: base.peso + ritmo * w, week: w });
    }
    return out;
  }

  var api = { groupWeekly: groupWeekly, computeRitmo: computeRitmo, projectSeries: projectSeries, mondayOf: mondayOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.BTProy = api;
})();
