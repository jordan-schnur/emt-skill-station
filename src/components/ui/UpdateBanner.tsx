import { useState, useEffect } from "preact/hooks";

const POLL_MS = 2 * 60 * 1000;

export function UpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const current = __APP_VERSION__;
    const url = import.meta.env.BASE_URL + "version.json";

    async function check() {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`);
        if (!res.ok) return;
        const { version } = await res.json() as { version: string };
        if (version && version !== current) setVisible(true);
      } catch {
        // network error — stay silent
      }
    }

    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  return (
    <div class="update-banner">
      <span>A new version is available.</span>
      <button class="btn btn-primary update-banner-btn" onClick={() => window.location.reload()}>
        Refresh
      </button>
      <button class="update-banner-dismiss" onClick={() => setVisible(false)} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
