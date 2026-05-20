import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { route, appState, navigate, showToast, save } from "./store/appStore";
import { parseHash } from "./router/hashRouter";
import { Toast } from "./components/ui/Toast";
import { Modal } from "./components/ui/Modal";
import { GuideView } from "./views/GuideView";
import { StatsView } from "./views/StatsView";
import { NotFoundView } from "./views/NotFoundView";
import type { Route } from "./types";

// ─── Legacy globals declared for TypeScript ────────────────────────────────

interface LegacyCtx {
  state: unknown;
  route: Route;
  navigate: (r: Route) => void;
  refresh: () => void;
  toast: (msg: string) => void;
  save: () => void;
}

declare global {
  interface Window {
    Views: Record<string, (ctx: LegacyCtx) => HTMLElement>;
    NREMT_DATA: { sheets: { length: number }[]; totalCards: number };
  }
}

function makeLegacyCtx(): LegacyCtx {
  return {
    state: appState.value,
    get route() { return route.value; },
    navigate,
    // refresh: re-use current route to force signal update & LegacyView remount
    refresh: () => { route.value = { ...route.value }; },
    toast: showToast,
    save,
  };
}

// Views handled natively in Preact (Phase 5+)
const NATIVE_VIEWS: Partial<Record<string, () => JSX.Element | null>> = {
  guide: () => <GuideView />,
  stats: () => <StatsView />,
};

// Views still delegated to window.Views.* (legacy)
const LEGACY_VIEW_FN_MAP: Record<string, string> = {
  home: "home",
  sheet: "sheet",
  settings: "settings",
  chat: "chat",
  mnemonics: "emsMnemonics",
  medconditions: "medConditions",
};

// ─── LegacyView ────────────────────────────────────────────────────────────
// Mounts an existing window.Views.* function into a DOM node.
// Keyed on routeKey so Preact unmounts+remounts when the route changes.

function LegacyView() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const r = route.value;
    const fnName = LEGACY_VIEW_FN_MAP[r.view] ?? "notFound";
    const ctx = makeLegacyCtx();
    let el: HTMLElement;
    try {
      const fn = window.Views?.[fnName] ?? window.Views?.notFound;
      el = fn ? fn(ctx) : document.createElement("div");
    } catch (err) {
      console.error("LegacyView render error:", err);
      el = document.createElement("div");
    }
    ref.current.innerHTML = "";
    ref.current.appendChild(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once on mount; App remounts this via key when route changes

  return <div ref={ref} style={{ display: "contents" }} />;
}

// ─── App ───────────────────────────────────────────────────────────────────

export function App() {
  const r = route.value;
  const routeKey = JSON.stringify(r);

  // Sync footer text and topnav active class after every render
  useEffect(() => {
    const footer = document.getElementById("footer-status");
    if (footer && window.NREMT_DATA) {
      const d = window.NREMT_DATA;
      footer.textContent = `${d.sheets.length} sheets · ${d.totalCards} cards · ${appState.value.stats.totalReviews} reviews logged`;
    }
    for (const btn of document.querySelectorAll<HTMLElement>(".topnav button, .brand")) {
      btn.classList.toggle("active", btn.dataset["nav"] === r.view);
    }
  });

  // Wire hashchange → route signal (once on mount)
  useEffect(() => {
    const onHash = () => {
      const parsed = parseHash();
      if (parsed) route.value = parsed;
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Wire topnav/brand button clicks (once on mount)
  useEffect(() => {
    const entries: Array<[HTMLElement, () => void]> = [];
    for (const btn of document.querySelectorAll<HTMLElement>(".topnav button, .brand")) {
      const tgt = btn.dataset["nav"] as Route["view"] | undefined;
      if (!tgt) continue;
      const handler = () => navigate({ view: tgt });
      btn.addEventListener("click", handler);
      entries.push([btn, handler]);
    }
    return () => entries.forEach(([btn, h]) => btn.removeEventListener("click", h));
  }, []);

  // Determine which content to render
  const nativeFn = NATIVE_VIEWS[r.view];
  let content: JSX.Element | null;
  if (nativeFn) {
    content = <div key={routeKey} style={{ display: "contents" }}>{nativeFn()}</div>;
  } else if (LEGACY_VIEW_FN_MAP[r.view]) {
    content = <LegacyView key={routeKey} />;
  } else {
    content = <NotFoundView key={routeKey} />;
  }

  return (
    <>
      {content}
      <Toast />
      <Modal />
    </>
  );
}
