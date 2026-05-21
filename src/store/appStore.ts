import { signal } from "@preact/signals";
import { load, save as storageSave } from "../lib/storage";
import { check as checkAchievements } from "../lib/achievements";
import { parseHash, writeHash } from "../router/hashRouter";
import type { AppState, Route } from "../types";

export const appState = signal<AppState>(load());
export const route = signal<Route>(parseHash() ?? { view: "home" });

// ─── Toast system ──────────────────────────────────────────────────────────

export interface ToastItem {
  id: number;
  type: "simple" | "achievement";
  message?: string;
  achievement?: { icon: string; name: string; desc: string };
}

const _toasts = signal<ToastItem[]>([]);
export const toasts = _toasts;
let _toastCounter = 0;

export function showToast(message: string): void {
  const id = ++_toastCounter;
  _toasts.value = [..._toasts.value, { id, type: "simple", message }];
  setTimeout(() => {
    _toasts.value = _toasts.value.filter((t) => t.id !== id);
  }, 1600);
}

export function showAchievementToast(def: { icon: string; name: string; desc: string }): void {
  const id = ++_toastCounter;
  _toasts.value = [..._toasts.value, { id, type: "achievement", achievement: def }];
  setTimeout(() => {
    _toasts.value = _toasts.value.filter((t) => t.id !== id);
  }, 3200);
}

// ─── State helpers ─────────────────────────────────────────────────────────

function updateStreak(state: AppState): void {
  const today = new Date().toISOString().slice(0, 10);
  if (state.stats.lastStreakDay === today) return;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  state.stats.dailyStreak =
    state.stats.lastStreakDay === yesterday ? (state.stats.dailyStreak || 0) + 1 : 1;
  state.stats.longestStreak = Math.max(state.stats.longestStreak || 0, state.stats.dailyStreak);
  state.stats.lastStreakDay = today;
}

export function save(): void {
  const state = appState.value;
  updateStreak(state);
  state.updatedAt = new Date().toISOString();
  storageSave(state);
  const newOnes = checkAchievements(state);
  if (newOnes.length) {
    storageSave(state);
    newOnes.forEach((ach, i) => setTimeout(() => showAchievementToast(ach), i * 600));
  }
  // Cloud sync (CloudSync may not be defined during migration)
  const cs = (window as unknown as Record<string, { uploadDebounced?: (s: AppState) => void }>)["CloudSync"];
  if (cs?.uploadDebounced) cs.uploadDebounced(state);
}

export function mutateState(fn: (draft: AppState) => void): void {
  const copy = structuredClone(appState.value);
  fn(copy);
  appState.value = copy;
}

export function navigate(next: Route): void {
  // Flush cloud sync if available
  const cs = (window as unknown as Record<string, { flush?: () => void }>)["CloudSync"];
  if (cs?.flush) cs.flush();
  route.value = next;
  writeHash(next);
}
