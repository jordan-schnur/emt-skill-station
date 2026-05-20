import { render } from "preact";
import { App } from "./App";
import { NREMT_DATA } from "./data/sheets";

// Bridge: expose typed data on window so legacy window.Views.* calls still work
// during migration. js/data.js sets this first (synchronous script); we overwrite
// with the module-imported version so TypeScript code uses the typed copy.
(window as unknown as Record<string, unknown>)["NREMT_DATA"] = NREMT_DATA;

const root = document.getElementById("root");
if (root) {
  render(<App />, root);
}
