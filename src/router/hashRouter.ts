import type { Route, RouteView, SheetTab } from "../types";

export function parseHash(): Route | null {
  const h = window.location.hash.replace(/^#/, "");
  if (!h) return null;
  const parts = h.split("/").filter(Boolean);
  if (parts[0] === "sheet" && parts[1]) {
    return { view: "sheet", sheetId: parts[1], tab: (parts[2] || "sheet") as SheetTab };
  }
  if (parts[0] === "chat") {
    return { view: "chat", chatId: parts[1] || undefined };
  }
  if (parts[0] === "mnemonics") {
    return { view: "mnemonics", mnemonicsTab: parts[1] || "browse" };
  }
  if (parts[0] === "medconditions") {
    return { view: "medconditions", medcondTab: parts[1] || "browse" };
  }
  if ((["home", "stats", "settings", "guide", "examday"] as string[]).includes(parts[0])) {
    return { view: parts[0] as RouteView };
  }
  return null;
}

export function writeHash(r: Route): void {
  let h = "";
  if (r.view === "sheet") h = `sheet/${r.sheetId}/${r.tab || "sheet"}`;
  else if (r.view === "chat") h = r.chatId ? `chat/${r.chatId}` : "chat";
  else if (r.view === "mnemonics") h = r.mnemonicsTab === "quiz" ? "mnemonics/quiz" : "mnemonics";
  else if (r.view === "medconditions") h = r.medcondTab && r.medcondTab !== "browse" ? `medconditions/${r.medcondTab}` : "medconditions";
  else if (r.view !== "home") h = r.view;
  window.history.replaceState(null, "", h ? `#${h}` : "#");
}
