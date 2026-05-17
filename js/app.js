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

  function updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.stats.lastStreakDay === today) return;
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    state.stats.dailyStreak = (state.stats.lastStreakDay === yesterday)
      ? (state.stats.dailyStreak || 0) + 1
      : 1;
    state.stats.longestStreak = Math.max(state.stats.longestStreak || 0, state.stats.dailyStreak);
    state.stats.lastStreakDay = today;
  }

  function achievementToast(def) {
    const el = document.createElement("div");
    el.className = "toast toast-achievement";
    const icon = document.createElement("span");
    icon.className = "ach-toast-icon";
    icon.textContent = def.icon;
    const text = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = def.name;
    const small = document.createElement("div");
    small.className = "ach-toast-desc";
    small.textContent = def.desc;
    text.append(strong, small);
    el.append(icon, text);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function save() {
    updateStreak();
    state.updatedAt = new Date().toISOString();
    Storage.save(state);
    if (typeof Achievements !== "undefined") {
      const newOnes = Achievements.check(state);
      if (newOnes.length) {
        Storage.save(state);
        newOnes.forEach((ach, i) => setTimeout(() => achievementToast(ach), i * 600));
      }
    }
    if (typeof CloudSync !== "undefined") CloudSync.uploadDebounced(state);
  }

  function navigate(next) {
    if (typeof CloudSync !== "undefined") CloudSync.flush();
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
      case "guide":    view = Views.guide(ctx); break;
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
    if (["home", "stats", "settings", "guide"].includes(parts[0])) {
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

  // ---- flush on tab hide / page close ---------------------------------
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && typeof CloudSync !== "undefined") {
      CloudSync.flush();
    }
  });
  window.addEventListener("pagehide", () => {
    if (typeof CloudSync !== "undefined") CloudSync.flush();
  });

  // ---- cloud sync -----------------------------------------------------
  if (typeof CloudSync !== "undefined") {
    CloudSync.init();
    let _firstAuth = true;
    CloudSync.onAuthChange(async (user) => {
      const initial = _firstAuth;
      _firstAuth = false;
      if (!user) {
        if (!initial) ctx.refresh();
        return;
      }
      try {
        const cloud = await CloudSync.download();
        if (!cloud) {
          await CloudSync.upload(state);
        } else {
          const localTime = state.updatedAt ? new Date(state.updatedAt) : new Date(0);
          const cloudTime = cloud.updatedAt ? new Date(cloud.updatedAt) : new Date(0);
          if (cloudTime > localTime) {
            Object.assign(state, cloud);
            Storage.save(state);
            ctx.toast("Synced from cloud ☁");
            ctx.refresh();
            return;
          } else {
            await CloudSync.upload(state);
          }
        }
      } catch (err) {
        console.error("Cloud sync error:", err);
      }
      ctx.refresh();
    });
  }
})();
