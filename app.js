/* BodyTracker — lógica de la app. El ACCESO y las llamadas las maneja bt-core.js
 * (dominio "pesos" del backend bds). Acá queda la vista: formulario, gráfico, etc. */
(function () {
  "use strict";

  var DOMINIO = "pesos";
  var state = { entries: [], range: "all" };

  var C = { grid: "#eceee9", muted: "#8b9199", ink: "#14161b", accent: "#2b49e0", panel: "#ffffff", tint: "#e9ecfb" };
  var HISTORY_N = 15;

  function $(id) { return document.getElementById(id); }

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    $("logForm").addEventListener("submit", onSubmit);
    $("logoutBtn").addEventListener("click", onLogout);
    var rangeButtons = document.querySelectorAll("#range button");
    rangeButtons.forEach(function (b) {
      b.addEventListener("click", function () {
        state.range = b.getAttribute("data-range");
        rangeButtons.forEach(function (x) { x.classList.toggle("is-active", x === b); });
        renderChart();
      });
    });
    window.addEventListener("resize", debounce(renderChart, 150));

    // bt-core muestra el gate si hace falta y llama a onReady cuando hay acceso.
    bt.init({
      brand: "BodyTracker",
      onReady: function () { $("appRoot").hidden = false; refresh(); },
      onLocked: function () { $("appRoot").hidden = true; }
    });
  }

  function onLogout() {
    $("appRoot").hidden = true;
    bt.logout();
  }

  /* ───────────────── Datos (vía bt-core) ───────────────── */

  function refresh() {
    return bt.query(DOMINIO, { limite: 500 }).then(function (res) {
      if (res && res.ok) applyData(res.filas || []);
      return res;
    }).catch(function (err) { console.error(err); });
  }

  function applyData(filas) {
    state.entries = filas.map(normalize).filter(Boolean);
    renderAll(new Date().toISOString());
  }

  function normalize(e) {
    var peso = toNum(e.peso);
    if (peso == null) return null;
    var fecha = fmtFecha(e.fecha);
    var hora = e.hora == null ? "" : String(e.hora);
    var parts = fecha.split("/");
    var t = null;
    if (parts.length === 3) {
      var hm = hora.split(":");
      var hh = hm[0] === "" || hm[0] === undefined ? 12 : (+hm[0] || 0);
      var d = new Date(+parts[2], +parts[1] - 1, +parts[0], hh, +hm[1] || 0);
      t = isNaN(d.getTime()) ? null : d.getTime();
    }
    return { t: t, fecha: fecha, hora: hora, peso: peso, nota: e.comentario || "" };
  }

  /** El motor devuelve la fecha como dd/MM/yyyy; si viniera como Date/ISO, la normaliza. */
  function fmtFecha(v) {
    if (v == null) return "";
    if (Object.prototype.toString.call(v) === "[object Date]") {
      var d = v, dd = String(d.getDate()), mm = String(d.getMonth() + 1);
      return (dd.length < 2 ? "0" + dd : dd) + "/" + (mm.length < 2 ? "0" + mm : mm) + "/" + d.getFullYear();
    }
    var s = String(v).trim();
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[3] + "/" + iso[2] + "/" + iso[1];
    return s;
  }

  function sorted() {
    return state.entries.filter(function (e) { return e.t != null; })
      .sort(function (a, b) { return a.t - b.t; });
  }

  function renderAll(updated) {
    renderUpdated(updated);
    renderReadout();
    renderStats();
    renderHistory();
    renderChart();
  }

  /* ───────────────── Formulario ───────────────── */

  function onSubmit(ev) {
    ev.preventDefault();
    var input = $("weight");
    var btn = $("saveBtn");
    var w = toNum(input.value);
    if (w == null || w < 20 || w > 400) {
      setStatus("Poné un peso en kg, entre 20 y 400.", "error");
      input.focus();
      return;
    }
    var comment = $("comment").value.trim();
    btn.disabled = true;
    setStatus("Guardando…", "");
    bt.append(DOMINIO, { peso: w, comentario: comment })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || "no se pudo guardar");
        input.value = "";
        $("comment").value = "";
        var fila = data.fila || {};
        return refresh().then(function () {
          setStatus("Listo — " + fmtNum(toNum(fila.peso) || w) + " kg, " + (fila.fecha || "") + " " +
            String(fila.hora || "").slice(0, 5) + " ✓", "ok");
        });
      })
      .catch(function (err) {
        console.error(err);
        setStatus("No se pudo guardar. Probá de nuevo en unos segundos.", "error");
      })
      .then(function () { btn.disabled = false; });
  }

  /* ───────────────── Render: readout ───────────────── */

  function renderUpdated(updated) {
    var el = $("updated");
    if (!updated) { el.textContent = ""; return; }
    var d = new Date(updated);
    el.textContent = isNaN(d.getTime()) ? "" : "Actualizado " + d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function renderReadout() {
    var list = sorted();
    var wEl = $("currentWeight");
    var dEl = $("currentDelta");
    if (!list.length) {
      wEl.textContent = "—";
      dEl.textContent = "Sin datos todavía. Cargá tu primer peso.";
      return;
    }
    var last = list[list.length - 1];
    wEl.textContent = fmtNum(last.peso);
    if (list.length < 2) {
      dEl.textContent = "Primer registro · " + last.fecha;
      return;
    }
    var prev = list[list.length - 2];
    var diff = last.peso - prev.peso;
    var cls = diff > 0 ? "up" : diff < 0 ? "down" : "";
    var arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "＝";
    var days = Math.round((last.t - prev.t) / 86400000);
    var when = days <= 0 ? "mismo día" : days === 1 ? "hace 1 día" : "hace " + days + " días";
    dEl.innerHTML = '<span class="' + cls + '">' + arrow + " " + fmtNum(Math.abs(diff)) + " kg</span> vs el registro anterior (" + when + ")";
  }

  /* ───────────────── Render: stats ───────────────── */

  function renderStats() {
    var list = sorted();
    var el = $("stats");
    if (!list.length) { el.innerHTML = ""; return; }
    var pesos = list.map(function (e) { return e.peso; });
    var min = Math.min.apply(null, pesos);
    var max = Math.max.apply(null, pesos);
    var change = list[list.length - 1].peso - list[0].peso;
    var sign = change > 0 ? "+" : change < 0 ? "−" : "";
    var items = [
      { label: "Mínimo", value: fmtNum(min), u: "kg" },
      { label: "Máximo", value: fmtNum(max), u: "kg" },
      { label: "Cambio total", value: sign + fmtNum(Math.abs(change)), u: "kg" },
      { label: "Registros", value: String(list.length), u: "" }
    ];
    el.innerHTML = items.map(function (s) {
      return '<div class="stat"><div class="stat-label">' + s.label + '</div><div class="stat-value">' +
        s.value + (s.u ? '<span class="u">' + s.u + '</span>' : "") + "</div></div>";
    }).join("");
  }

  /* ───────────────── Render: historial ───────────────── */

  function renderHistory() {
    var list = sorted();
    var tbody = document.querySelector("#historyTable tbody");
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="nota"><span class="dash">Sin registros.</span></td></tr>';
      return;
    }
    var rows = [];
    for (var i = list.length - 1; i >= Math.max(0, list.length - HISTORY_N); i--) {
      var prev = i > 0 ? list[i - 1] : null;
      rows.push({ e: list[i], d: prev ? list[i].peso - prev.peso : null });
    }
    tbody.innerHTML = rows.map(function (r) {
      var d = r.d;
      var dHtml = d == null ? '<span class="dash">—</span>'
        : '<span class="' + (d > 0 ? "up" : d < 0 ? "down" : "") + '">' + (d > 0 ? "+" : d < 0 ? "−" : "") + fmtNum(Math.abs(d)) + "</span>";
      return "<tr><td>" + esc(r.e.fecha) + (r.e.hora ? ' <span class="dash">' + esc(r.e.hora.slice(0, 5)) + "</span>" : "") +
        '</td><td class="num w">' + fmtNum(r.e.peso) +
        '</td><td class="num">' + dHtml +
        '</td><td class="nota">' + esc(r.e.nota || "—") + "</td></tr>";
    }).join("");
  }

  /* ───────────────── Render: gráfico ───────────────── */

  function chartSeries() {
    var list = sorted().map(function (e, i, arr) {
      var from = Math.max(0, i - 6), s = 0;
      for (var j = from; j <= i; j++) s += arr[j].peso;
      return { t: e.t, peso: e.peso, avg: s / (i - from + 1), fecha: e.fecha, hora: e.hora, nota: e.nota };
    });
    if (state.range === "all" || !list.length) return list;
    var days = parseInt(state.range, 10);
    var cutoff = list[list.length - 1].t - days * 86400000;
    return list.filter(function (d) { return d.t >= cutoff; });
  }

  function renderChart() {
    var svg = $("chart");
    var wrap = $("chartWrap");
    var tip = $("tooltip");
    if (!svg || !wrap) return;
    var data = chartSeries();

    var W = Math.max(300, Math.round(wrap.clientWidth));
    var H = Math.round(clamp(W * 0.4, 220, 360));
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);

    if (data.length < 2) {
      svg.innerHTML = '<text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle" class="chart-empty">' +
        (state.entries.length ? "Aún no hay suficientes datos en este rango." : "Cargá tu primer peso para ver el gráfico.") + "</text>";
      if (tip) tip.hidden = true;
      return;
    }

    var pad = { t: 16, r: 16, b: 34, l: 46 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    var xs = data.map(function (d) { return d.t; });
    var ys = data.map(function (d) { return d.peso; });
    var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    var yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    var span = Math.max(0.6, yMax - yMin);
    var yLo = Math.floor((yMin - span * 0.18) * 2) / 2;
    var yHi = Math.ceil((yMax + span * 0.18) * 2) / 2;
    if (yHi === yLo) yHi = yLo + 1;

    var X = function (t) { return xMax === xMin ? pad.l + iw / 2 : pad.l + (t - xMin) / (xMax - xMin) * iw; };
    var Y = function (v) { return pad.t + ih - (v - yLo) / (yHi - yLo) * ih; };

    var yTicks = niceTicks(yLo, yHi, 5);
    var tickIdx = [];
    var n = Math.min(5, data.length);
    for (var k = 0; k < n; k++) tickIdx.push(Math.round(k * (data.length - 1) / (n - 1)));

    var g = "";
    yTicks.forEach(function (v) {
      var y = Y(v).toFixed(1);
      g += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (pad.l + iw) + '" y2="' + y + '" stroke="' + C.grid + '" stroke-width="1"/>';
      g += '<text x="' + (pad.l - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end" fill="' + C.muted + '" font-size="11">' + fmtNum(v) + "</text>";
    });
    tickIdx.forEach(function (i) {
      var x = X(data[i].t).toFixed(1);
      g += '<line x1="' + x + '" y1="' + pad.t + '" x2="' + x + '" y2="' + (pad.t + ih) + '" stroke="' + C.grid + '" stroke-width="1" stroke-dasharray="2 3"/>';
      g += '<text x="' + x + '" y="' + (pad.t + ih + 20) + '" text-anchor="middle" fill="' + C.muted + '" font-size="11">' + esc(shortDate(data[i].fecha)) + "</text>";
    });

    var linePts = data.map(function (d) { return X(d.t).toFixed(1) + " " + Y(d.peso).toFixed(1); });
    var linePath = "M" + linePts.join(" L");
    var areaPath = linePath + " L" + X(data[data.length - 1].t).toFixed(1) + " " + (pad.t + ih) + " L" + X(data[0].t).toFixed(1) + " " + (pad.t + ih) + " Z";
    var avgPath = "M" + data.map(function (d) { return X(d.t).toFixed(1) + " " + Y(d.avg).toFixed(1); }).join(" L");
    var pts = data.map(function (d) {
      return '<circle cx="' + X(d.t).toFixed(1) + '" cy="' + Y(d.peso).toFixed(1) + '" r="2.6" fill="' + C.accent + '" stroke="' + C.panel + '" stroke-width="1.4"/>';
    }).join("");
    var last = data[data.length - 1];
    var lastX = X(last.t).toFixed(1), lastY = Y(last.peso).toFixed(1);

    svg.innerHTML =
      '<defs><linearGradient id="af" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + C.accent + '" stop-opacity="0.15"/>' +
      '<stop offset="100%" stop-color="' + C.accent + '" stop-opacity="0"/></linearGradient></defs>' + g +
      '<path d="' + areaPath + '" fill="url(#af)"/>' +
      '<path d="' + avgPath + '" fill="none" stroke="' + C.ink + '" stroke-width="1.6" stroke-dasharray="5 4" stroke-linecap="round"/>' +
      '<path d="' + linePath + '" fill="none" stroke="' + C.accent + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      pts +
      '<circle cx="' + lastX + '" cy="' + lastY + '" r="5.5" fill="' + C.accent + '" stroke="' + C.panel + '" stroke-width="2"/>' +
      '<line class="h-line" x1="0" y1="' + pad.t + '" x2="0" y2="' + (pad.t + ih) + '" stroke="' + C.ink + '" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>' +
      '<circle class="h-dot" cx="0" cy="0" r="4" fill="' + C.ink + '" opacity="0"/>' +
      '<rect class="overlay" x="' + pad.l + '" y="' + pad.t + '" width="' + iw + '" height="' + ih + '" fill="transparent"/>';

    var overlay = svg.querySelector(".overlay");
    var hLine = svg.querySelector(".h-line");
    var hDot = svg.querySelector(".h-dot");
    var geom = { X: X, Y: Y, data: data, W: W };
    overlay.addEventListener("mousemove", function (ev) { onHover(ev, svg, tip, geom, hLine, hDot); });
    overlay.addEventListener("mouseleave", function () {
      if (tip) tip.hidden = true;
      hLine.setAttribute("opacity", "0");
      hDot.setAttribute("opacity", "0");
    });
  }

  function onHover(ev, svg, tip, geom, hLine, hDot) {
    var rect = svg.getBoundingClientRect();
    var x = ev.clientX - rect.left;
    var best = geom.data[0], bestD = Infinity;
    geom.data.forEach(function (d) {
      var dd = Math.abs(geom.X(d.t) - x);
      if (dd < bestD) { bestD = dd; best = d; }
    });
    var px = geom.X(best.t), py = geom.Y(best.peso);
    hLine.setAttribute("x1", px.toFixed(1)); hLine.setAttribute("x2", px.toFixed(1)); hLine.setAttribute("opacity", "1");
    hDot.setAttribute("cx", px.toFixed(1)); hDot.setAttribute("cy", py.toFixed(1)); hDot.setAttribute("opacity", "1");
    if (!tip) return;
    tip.innerHTML = "<b>" + fmtNum(best.peso) + " kg</b><br>" + esc(best.fecha) +
      (best.hora ? " · " + esc(best.hora.slice(0, 5)) : "") +
      '<br><span class="tt-avg">prom. 7: ' + fmtNum(best.avg) + "</span>";
    tip.hidden = false;
    tip.style.left = clamp(px, 56, geom.W - 56) + "px";
    tip.style.top = py + "px";
  }

  /* ───────────────── Utilidades ───────────────── */

  function setStatus(msg, kind) {
    var el = $("logStatus");
    el.textContent = msg || "";
    el.classList.toggle("is-error", kind === "error");
    el.classList.toggle("is-ok", kind === "ok");
  }
  function toNum(v) {
    if (v == null || v === "") return null;
    var n = typeof v === "number" ? v : parseFloat(String(v).trim().replace(",", "."));
    return isFinite(n) ? n : null;
  }
  function fmtNum(v) {
    return (Math.round(v * 100) / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  }
  function shortDate(fecha) {
    var p = String(fecha || "").split("/");
    return p.length === 3 ? p[0] + "/" + p[1] : fecha;
  }
  function niceTicks(lo, hi, target) {
    var steps = [0.2, 0.5, 1, 2, 5], step = steps[steps.length - 1];
    for (var i = 0; i < steps.length; i++) { if ((hi - lo) / steps[i] <= target) { step = steps[i]; break; } }
    var out = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
    return out;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
})();
