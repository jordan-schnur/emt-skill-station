/**
 * app.js – top-level controller. Owns state, routes, and the render loop.
 */
(function () {
  if (!window.NREMT_DATA) {
    document.body.innerHTML =
      '<div style="padding:24px;color:#e5534b;font-family:monospace">'
      + 'data.js failed to load. Run <code>python3 preprocess.py</code> first.'
      + '</div>';
    return;
  }

  const state = Storage.load();
  let route = parseHash() || { view: "home" };

  const root = document.getElementById("root");
  const footerStatus = document.getElementById("footer-status");

  function save() {
    Storage.save(state);
  }

  function navigate(next) {
    route = next;
    writeHash(route);
    render();
  }

  function refresh() {
    render();
  }

  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  const ctx = { state, get route() { return route; }, navigate, refresh, toast, save };

  function render() {
    root.innerHTML = "";
    let view;
    switch (route.view) {
      case "home":     view = Views.home(ctx); break;
      case "sheet":    view = Views.sheet(ctx); break;
      case "stats":    view = Views.stats(ctx); break;
      case "settings": view = Views.settings(ctx); break;
      default:         view = Views.notFound();
    }
    root.appendChild(view);

    const sheets = NREMT_DATA.sheets.length;
    const cards = NREMT_DATA.totalCards;
    footerStatus.textContent = `${sheets} sheets · ${cards} cards · ${state.stats.totalReviews} reviews logged`;

    // Sync top nav active state
    for (const btn of document.querySelectorAll(".topnav button, .brand")) {
      const tgt = btn.dataset.nav;
      btn.classList.toggle("active", tgt === route.view);
    }
  }

  // ---- hash routing ---------------------------------------------------
  function parseHash() {
    const h = window.location.hash.replace(/^#/, "");
    if (!h) return null;
    const parts = h.split("/").filter(Boolean);
    if (parts[0] === "sheet" && parts[1]) {
      return { view: "sheet", sheetId: parts[1], tab: parts[2] || "study" };
    }
    if (["home", "stats", "settings"].includes(parts[0])) {
      return { view: parts[0] };
    }
    return null;
  }
  function writeHash(r) {
    let h = "";
    if (r.view === "sheet") h = `sheet/${r.sheetId}/${r.tab || "study"}`;
    else if (r.view !== "home") h = r.view;
    window.history.replaceState(null, "", h ? `#${h}` : "#");
  }
  window.addEventListener("hashchange", () => {
    const parsed = parseHash();
    if (parsed) { route = parsed; render(); }
  });

  // ---- topbar wiring --------------------------------------------------
  for (const btn of document.querySelectorAll(".topnav button, .brand")) {
    btn.addEventListener("click", () => {
      const tgt = btn.dataset.nav;
      navigate({ view: tgt });
    });
  }

  render();
})();
