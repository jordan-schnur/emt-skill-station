import { render } from "preact";
import { App } from "./App";
import { NREMT_DATA } from "./data/sheets";
import { CloudSync, isFirebaseConfigured } from "./lib/firebase";

// Bridge: expose typed data on window so legacy window.Views.* calls still work
// during migration. js/data.js sets this first (synchronous script); we overwrite
// with the module-imported version so TypeScript code uses the typed copy.
(window as unknown as Record<string, unknown>)["NREMT_DATA"] = NREMT_DATA;

// Override the legacy CDN-based window.CloudSync with the env-var–configured
// modular version. This is the single source of truth for both the Preact app
// and any remaining legacy views that read window.CloudSync.
if (isFirebaseConfigured) {
  (window as unknown as Record<string, unknown>)["CloudSync"] = CloudSync;
}

const root = document.getElementById("root");
if (root) {
  render(<App />, root);
}
