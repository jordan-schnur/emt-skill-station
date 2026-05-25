import { useState, useEffect, useRef } from "preact/hooks";
import { appState, navigate, save, showToast, mutateState } from "../store/appStore";
import { reset, exportToFile, importFromFile, createEmptyState } from "../lib/storage";
import { getConfig, saveConfig, clearConfig, fetchModels } from "../lib/chat";
import { openConfirmModal, openConflictModal } from "../components/ui/Modal";
import { CloudSync, isFirebaseConfigured } from "../lib/firebase";
import { getAll as getAllAchievements } from "../lib/achievements";

// ─── Cloud section ──────────────────────────────────────────────────────────

function CloudSection() {
  const CS = isFirebaseConfigured ? CloudSync : undefined;
  const [user, setUser] = useState(CS?.getUser?.() ?? null);
  const [authReady, setAuthReady] = useState(CS?.isAuthReady?.() ?? false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!CS) return;
    const unsub = CS.onAuthChange((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  async function handleSync() {
    const cs = isFirebaseConfigured ? CloudSync : undefined;
    if (!cs) return;
    setSyncing(true);
    try {
      const meta = await cs.downloadWithMeta();
      const state = appState.value;
      const localTime = state.updatedAt ? new Date(state.updatedAt) : new Date(0);
      const cloudTime = meta?.state?.updatedAt ? new Date(meta.state.updatedAt) : new Date(0);

      if (meta?.state && cloudTime > localTime) {
        openConflictModal({
          localUpdatedAt: state.updatedAt ?? null,
          cloudUpdatedAt: meta.state.updatedAt ?? null,
          onKeepLocal: async () => {
            mutateState((draft) => {
              draft.updatedAt = new Date().toISOString();
              draft.lastSyncedAt = draft.updatedAt;
            });
            await cs.upload(appState.value);
            showToast("Local version pushed to cloud");
          },
          onUseCloud: () => {
            mutateState((draft) => { Object.assign(draft, meta.state, { lastSyncedAt: new Date().toISOString() }); });
            save();
            showToast("Cloud version restored locally");
            navigate({ view: "settings" });
          },
        });
      } else {
        mutateState((draft) => {
          draft.updatedAt = new Date().toISOString();
          draft.lastSyncedAt = draft.updatedAt;
        });
        await cs.upload(appState.value);
        showToast("Synced to cloud");
      }
    } catch {
      showToast("Sync failed");
    }
    setSyncing(false);
  }

  async function handleSignIn() {
    const cs = isFirebaseConfigured ? CloudSync : undefined;
    if (!cs) return;
    try {
      await cs.signIn();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      console.error("Sign-in error:", err);
      showToast("Sign-in failed: " + (code ?? (err as Error).message ?? "unknown error"));
    }
  }

  async function handleSignOut() {
    const cs = isFirebaseConfigured ? CloudSync : undefined;
    if (!cs) return;
    await cs.signOut();
    showToast("Signed out");
  }

  function handleClearAll() {
    openConfirmModal({
      title: "Clear all data?",
      body: "This permanently deletes all your SRS progress, notes, and drill history — both locally and from the cloud. This cannot be undone.",
      confirmLabel: "Delete everything",
      onConfirm: async () => {
        const cs = isFirebaseConfigured ? CloudSync : undefined;
        try { if (cs) await cs.clearCloud(); } catch (err) { console.error("Failed to clear cloud data", err); }
        reset();
        mutateState((draft) => { Object.assign(draft, createEmptyState()); });
        showToast("All data deleted");
      },
    });
  }

  function relativeTime(iso: string): string {
    const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  }

  return (
    <div class="settings-section">
      <h3>Cloud sync</h3>
      {!CS && (
        <p class="muted">Cloud sync is not configured.</p>
      )}
      {CS && !authReady && (
        <div class="sync-loading">
          <div class="sync-spinner" />
          <span class="muted">Checking sign-in…</span>
        </div>
      )}
      {CS && authReady && !user && (
        <>
          <p class="muted">Sign in with Google to automatically sync your progress across all your devices.</p>
          <div class="settings-row">
            <button class="btn btn-google" onClick={handleSignIn}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="" width="18" height="18" aria-hidden="true"
              />
              Sign in with Google
            </button>
          </div>
        </>
      )}
      {CS && authReady && user && (
        <>
          <div class="sync-user">
            {user.photoURL
              ? <img src={user.photoURL} alt="" width="28" height="28" class="sync-avatar" referrerpolicy="no-referrer" />
              : <div class="sync-avatar-placeholder">{user.displayName ? user.displayName[0] : "?"}</div>
            }
            <div class="sync-user-info">
              <div>{user.displayName || "Signed in"}</div>
              <div class="muted" style="font-size:12px">{user.email}</div>
            </div>
          </div>
          <p class="muted" style="margin-top:8px;margin-bottom:10px">
            {appState.value.lastSyncedAt ? `Synced ${relativeTime(appState.value.lastSyncedAt)}` : "Not yet synced"}
          </p>
          <div class="settings-row">
            <button class="btn btn-primary" onClick={handleSync} disabled={syncing}>
              {syncing ? "Checking…" : "Sync now"}
            </button>
            <button class="btn" onClick={handleSignOut}>Sign out</button>
            <button class="btn btn-danger" onClick={handleClearAll}>Clear all data</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── AI Chat section ─────────────────────────────────────────────────────────

function AISection() {
  const initial = getConfig();
  const [provider, setProvider] = useState<"openai" | "anthropic">((initial.provider as "openai" | "anthropic") || "openai");
  const [apiKey, setApiKey] = useState(initial.apiKey || "");
  const [model, setModel] = useState(initial.model || "");
  const [models, setModels] = useState<Array<{ id: string; label: string }>>(
    initial.apiKey && initial.model ? [{ id: initial.model, label: initial.model }] : []
  );
  const [fetching, setFetching] = useState(false);
  const [saved, setSaved] = useState(!!(initial.apiKey && initial.model));

  async function handleFetch() {
    if (!apiKey.trim()) { showToast("Enter an API key first"); return; }
    setFetching(true);
    try {
      const list = await fetchModels(provider, apiKey.trim());
      if (!list.length) throw new Error("No models returned");
      setModels(list);
      if (!model) setModel(list[0].id);
      showToast(`${list.length} models loaded`);
    } catch (err: unknown) {
      showToast("Failed: " + (err as Error).message);
    }
    setFetching(false);
  }

  function handleSave() {
    saveConfig({ provider, model, apiKey: apiKey.trim() });
    showToast("AI Chat settings saved");
    setSaved(true);
  }

  function handleClear() {
    clearConfig();
    setApiKey("");
    setModel("");
    setModels([]);
    setSaved(false);
    showToast("API key cleared");
  }

  return (
    <div class="settings-section">
      <h3>AI Chat</h3>
      <p class="muted">
        Configure the chatbot for context-aware study help and examiner simulation. Your API key is stored locally only and is never synced to the cloud.
      </p>
      <div class="ai-config-grid">
        <label class="ai-config-label">Provider</label>
        <select class="ai-select" value={provider} onChange={(e) => { setProvider((e.target as HTMLSelectElement).value as "openai" | "anthropic"); setModels([]); setModel(""); setSaved(false); }}>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
        <label class="ai-config-label">API key</label>
        <input
          type="password"
          class="ai-key-input"
          placeholder={provider === "anthropic" ? "sk-ant-…" : "sk-…"}
          value={apiKey}
          autocomplete="off"
          onInput={(e) => { setApiKey((e.target as HTMLInputElement).value); setSaved(false); }}
        />
      </div>
      <div class="settings-row" style="margin-top:10px">
        <button class="btn" type="button" disabled={fetching} onClick={handleFetch}>
          {fetching ? "Fetching…" : "Fetch models"}
        </button>
      </div>
      {models.length > 0 && (
        <div class="ai-model-row">
          <label class="ai-config-label">Model</label>
          <select class="ai-select" value={model} onChange={(e) => { setModel((e.target as HTMLSelectElement).value); setSaved(false); }}>
            {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
      )}
      <div class="settings-row" style="margin-top:10px">
        <button class="btn btn-primary" type="button" disabled={!model || !apiKey} onClick={handleSave}>
          {saved ? "Saved ✓" : "Save"}
        </button>
        <button class="btn btn-danger" type="button" onClick={handleClear}>Clear key</button>
      </div>
    </div>
  );
}

// ─── Achievements section ────────────────────────────────────────────────────

function AchievementsSection() {
  const [open, setOpen] = useState(false);
  const allAchs = getAllAchievements(appState.value);
  const unlocked = allAchs.filter((a) => !!a.unlockedAt);
  const nextUp = allAchs.find((a) => !a.unlockedAt);

  return (
    <section class="settings-section">
      <button class="settings-collapse-btn" onClick={() => setOpen(!open)}>
        <span>Achievements ({unlocked.length}/{allAchs.length})</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div class="ach-grid" style="margin-top: 12px;">
          {unlocked.map((a) => (
            <div key={a.id} class="ach-card ach-unlocked">
              <div class="ach-icon">{a.icon}</div>
              <div class="ach-body">
                <div class="ach-name">{a.name}</div>
                <div class="ach-desc">{a.desc}</div>
                <div class="ach-date">Unlocked {new Date(a.unlockedAt!).toLocaleDateString()}</div>
              </div>
              <div class="ach-check">✓</div>
            </div>
          ))}
          {nextUp && (
            <div class="ach-card ach-next-up">
              <div class="ach-icon">{nextUp.icon}</div>
              <div class="ach-body">
                <div class="ach-name">{nextUp.name}</div>
                <div class="ach-desc">Keep going to unlock this!</div>
              </div>
            </div>
          )}
          {unlocked.length === 0 && (
            <p style="color: var(--text-dim); font-size: 13px;">Complete drills to unlock achievements!</p>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Main SettingsView ──────────────────────────────────────────────────────

export function SettingsView() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const next = await importFromFile(file);
      mutateState((draft) => { Object.assign(draft, next); });
      save();
      showToast("Import successful");
      navigate({ view: "settings" });
    } catch (err: unknown) {
      alert("Couldn't import that file: " + (err as Error).message);
    }
  }

  function handleReset() {
    if (!confirm("Erase ALL local progress and notes?")) return;
    reset();
    mutateState((draft) => { Object.assign(draft, createEmptyState()); });
    showToast("Reset complete");
  }

  return (
    <div>
      <h1>Backup &amp; Settings</h1>
      <p class="muted">
        Progress + notes live in this browser's local storage. Sign in with Google to sync across devices, or export a JSON backup.
      </p>

      <CloudSection />

      <div class="settings-section">
        <h3>Export progress</h3>
        <p class="muted">Downloads a nremt-progress-YYYY-MM-DD.json file you can keep as a local backup.</p>
        <div class="settings-row">
          <button class="btn btn-primary" onClick={() => exportToFile(appState.value)}>Download JSON</button>
        </div>
      </div>

      <div class="settings-section">
        <h3>Import progress</h3>
        <p class="muted">Replaces current progress + notes with the contents of a previously exported file.</p>
        <div class="settings-row">
          <button class="btn" onClick={() => fileInputRef.current?.click()}>Choose JSON file…</button>
          <input ref={fileInputRef} type="file" accept="application/json" style="display:none" onChange={handleImport} />
        </div>
      </div>

      <div class="settings-section">
        <h3>Reset everything</h3>
        <p class="muted">Erases all SRS progress and notes. There's no undo — export first if you might want them.</p>
        <div class="settings-row">
          <button class="btn" onClick={handleReset}>Reset</button>
        </div>
      </div>

      <AISection />

      <AchievementsSection />
    </div>
  );
}
