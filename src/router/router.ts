import type { Route, RouteView, SheetTab } from "../types";

// Strip trailing slash so path joins are "/base/view" not "/base//view"
const BASE = (import.meta.env?.BASE_URL ?? "/").replace(/\/$/, "");

function parseParts(parts: string[]): Route | null {
  if (parts[0] === "sheet" && parts[1]) {
    return { view: "sheet", sheetId: parts[1], tab: (parts[2] || "sheet") as SheetTab };
  }
  if (parts[0] === "chat") {
    return { view: "chat", chatId: parts[1] || undefined };
  }
  // New unified reference route
  if (parts[0] === "reference") {
    const tab = (parts[1] as "conditions" | "mnemonics" | "meds") || "conditions";
    if (tab === "mnemonics" && parts[2] === "quiz" && parts[3]) {
      return { view: "reference", referenceTab: "mnemonics", referenceCardId: parts[3] };
    }
    return { view: "reference", referenceTab: tab };
  }
  // Old routes — redirect to reference
  if (parts[0] === "mnemonics") {
    const cardId = parts[1] === "quiz" && parts[2] ? parts[2] : undefined;
    return { view: "reference", referenceTab: "mnemonics", ...(cardId ? { referenceCardId: cardId } : {}) };
  }
  if (parts[0] === "medconditions") {
    return { view: "reference", referenceTab: "conditions" };
  }
  if (parts[0] === "blsmeds") {
    return { view: "reference", referenceTab: "meds" };
  }
  if (parts[0] === "stats" || parts[0] === "guide") return { view: "home" };
  if ((["home", "settings", "examday", "sources", "skills"] as string[]).includes(parts[0])) {
    return { view: parts[0] as RouteView };
  }
  return null;
}

export function parsePath(): Route | null {
  const stripped = window.location.pathname.slice(BASE.length).replace(/^\//, "");
  if (!stripped) return null;
  return parseParts(stripped.split("/").filter(Boolean));
}

export function parseHash(): Route | null {
  const h = window.location.hash.replace(/^#/, "");
  if (!h) return null;
  return parseParts(h.split("/").filter(Boolean));
}

export function writePath(r: Route, method: "push" | "replace" = "push"): void {
  let path = "";
  if (r.view === "sheet") path = `sheet/${r.sheetId}/${r.tab || "sheet"}`;
  else if (r.view === "chat") path = r.chatId ? `chat/${r.chatId}` : "chat";
  else if (r.view === "reference") {
    const tab = r.referenceTab ?? "conditions";
    if (tab === "mnemonics" && r.referenceCardId) {
      path = `reference/mnemonics/quiz/${r.referenceCardId}`;
    } else {
      path = `reference/${tab}`;
    }
  }
  else if (r.view === "mnemonics") {
    if (r.mnemonicsTab === "quiz") {
      path = r.mnemonicsCardId ? `mnemonics/quiz/${r.mnemonicsCardId}` : "mnemonics/quiz";
    } else {
      path = "mnemonics";
    }
  }
  else if (r.view === "medconditions") path = r.medcondTab && r.medcondTab !== "browse" ? `medconditions/${r.medcondTab}` : "medconditions";
  else if (r.view === "blsmeds") path = r.blsmedsTab && r.blsmedsTab !== "reference" ? `blsmeds/${r.blsmedsTab}` : "blsmeds";
  else if (r.view !== "home") path = r.view;
  const url = path ? `${BASE}/${path}` : `${BASE}/`;
  if (method === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
}

export function parseRoute(): Route | null {
  const r = parsePath() ?? parseHash();
  if (!r) return null;
  // Rewrite old paths to new reference URL in the browser address bar
  if (r.view === "reference" && !window.location.pathname.includes("/reference")) {
    writePath(r, "replace");
  }
  return r;
}
