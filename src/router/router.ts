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
  if (parts[0] === "mnemonics") {
    const tab = parts[1] || "browse";
    const cardId = tab === "quiz" && parts[2] ? parts[2] : undefined;
    return { view: "mnemonics", mnemonicsTab: tab, ...(cardId ? { mnemonicsCardId: cardId } : {}) };
  }
  if (parts[0] === "medconditions") {
    return { view: "medconditions", medcondTab: parts[1] || "browse" };
  }
  if ((["home", "stats", "settings", "guide", "examday", "sources"] as string[]).includes(parts[0])) {
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

// Tries path first; falls back to hash for backwards-compat bookmarks
export function parseRoute(): Route | null {
  return parsePath() ?? parseHash();
}

export function writePath(r: Route, method: "push" | "replace" = "push"): void {
  let path = "";
  if (r.view === "sheet") path = `sheet/${r.sheetId}/${r.tab || "sheet"}`;
  else if (r.view === "chat") path = r.chatId ? `chat/${r.chatId}` : "chat";
  else if (r.view === "mnemonics") {
    if (r.mnemonicsTab === "quiz") {
      path = r.mnemonicsCardId ? `mnemonics/quiz/${r.mnemonicsCardId}` : "mnemonics/quiz";
    } else {
      path = "mnemonics";
    }
  }
  else if (r.view === "medconditions") path = r.medcondTab && r.medcondTab !== "browse" ? `medconditions/${r.medcondTab}` : "medconditions";
  else if (r.view !== "home") path = r.view;
  const url = path ? `${BASE}/${path}` : `${BASE}/`;
  if (method === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
}
