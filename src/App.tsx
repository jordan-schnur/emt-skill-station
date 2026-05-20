import { useEffect } from "preact/hooks";
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
};

export function App() {
  const r = route.value;
  const routeKey = JSON.stringify(r);

  useEffect(() => {
    const footer = document.getElementById("footer-status");
    if (footer) {
      footer.textContent = `${NREMT_DATA.sheets.length} sheets · ${NREMT_DATA.totalCards} cards · ${appState.value.stats.totalReviews} reviews logged`;
    }
    for (const btn of document.querySelectorAll<HTMLElement>(".topnav button, .brand")) {
      btn.classList.toggle("active", btn.dataset["nav"] === r.view);
    }
  });

  useEffect(() => {
    const onHash = () => { const parsed = parseHash(); if (parsed) route.value = parsed; };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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
