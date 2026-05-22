import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { route, appState, navigate, save } from "./store/appStore";
import { parseHash } from "./router/hashRouter";
import { Toast } from "./components/ui/Toast";
import { Modal } from "./components/ui/Modal";
import { UpdateBanner } from "./components/ui/UpdateBanner";
import { HomeView } from "./views/HomeView";
import { SheetView } from "./views/SheetView";
import { StatsView } from "./views/StatsView";
import { GuideView } from "./views/GuideView";
import { SettingsView } from "./views/SettingsView";
import { EmsMnemonicsView } from "./views/EmsMnemonicsView";
import { MedConditionsView } from "./views/MedConditionsView";
import { ChatView } from "./views/ChatView";
import { ExamDayView } from "./views/ExamDayView";
import { NotFoundView } from "./views/NotFoundView";
import { NREMT_DATA } from "./data/sheets";
import type { Route } from "./types";

const VIEWS: Partial<Record<Route["view"], () => JSX.Element | null>> = {
  home:          () => <HomeView />,
  sheet:         () => <SheetView />,
  stats:         () => <StatsView />,
  guide:         () => <GuideView />,
  settings:      () => <SettingsView />,
  mnemonics:     () => <EmsMnemonicsView />,
  medconditions: () => <MedConditionsView />,
  chat:          () => <ChatView />,
  examday:       () => <ExamDayView />,
};

export function App() {
  const [r, setR] = useState<Route>(() => route.value);
  const routeKey = JSON.stringify(r);

  // Bridge signal changes to Preact state so re-renders fire reliably from
  // any context (hashchange, programmatic navigate, etc.).
  useEffect(() => route.subscribe(setR), []);

  useEffect(() => {
    const footer = document.getElementById("footer-status");
    if (footer) {
      footer.textContent = `${NREMT_DATA.sheets.length} sheets · ${NREMT_DATA.totalCards} cards · ${appState.value.stats.totalReviews} reviews logged`;
    }
    for (const btn of document.querySelectorAll<HTMLElement>(".topnav button, .brand")) {
      btn.classList.toggle("active", btn.dataset["nav"] === r.view);
    }
    // Streak pill
    const streakEl = document.getElementById("streak-pill");
    if (streakEl) {
      const days = appState.value.stats?.dailyStreak ?? 0;
      if (days >= 2) {
        streakEl.hidden = false;
        const txt = streakEl.querySelector(".streak-text");
        if (txt) txt.textContent = `${days}-day streak`;
      } else {
        streakEl.hidden = true;
      }
    }
  });

  useEffect(() => {
    const onHash = () => { const parsed = parseHash(); if (parsed) route.value = parsed; };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const entries: Array<[HTMLElement, () => void]> = [];
    const navSel = ".topnav button, .topbar-menu-pop button, .brand";
    for (const btn of document.querySelectorAll<HTMLElement>(navSel)) {
      const tgt = btn.dataset["nav"] as Route["view"] | undefined;
      if (!tgt) continue;
      const handler = () => {
        navigate({ view: tgt });
        // Close cog menu after navigation
        document.getElementById("topbar-menu")?.classList.remove("is-open");
      };
      btn.addEventListener("click", handler);
      entries.push([btn, handler]);
    }

    // Cog menu toggle
    const menuBtn = document.getElementById("topbar-menu-btn");
    const menuEl = document.getElementById("topbar-menu");
    const toggleMenu = (e: Event) => {
      e.stopPropagation();
      menuEl?.classList.toggle("is-open");
    };
    const closeMenu = () => menuEl?.classList.remove("is-open");
    menuBtn?.addEventListener("click", toggleMenu);
    document.addEventListener("click", closeMenu);

    return () => {
      entries.forEach(([btn, h]) => btn.removeEventListener("click", h));
      menuBtn?.removeEventListener("click", toggleMenu);
      document.removeEventListener("click", closeMenu);
    };
  }, []);

  const viewFn = VIEWS[r.view];
  const content = viewFn
    ? <div key={routeKey} style={{ display: "contents" }}>{viewFn()}</div>
    : <NotFoundView key={routeKey} />;

  return (
    <>
      <UpdateBanner />
      {content}
      <Toast />
      <Modal />
    </>
  );
}
