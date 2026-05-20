import type { AppState, Sheet } from "../types";

export function getStepNote(state: AppState, cardId: string): string {
  return (state.notes?.step?.[cardId]) || "";
}

export function setStepNote(state: AppState, cardId: string, text: string): void {
  if (!state.notes) state.notes = { step: {}, sheet: {} };
  if (!state.notes.step) state.notes.step = {};
  if (text && text.trim()) state.notes.step[cardId] = text;
  else delete state.notes.step[cardId];
}

export function getSheetNote(state: AppState, sheetId: string): string {
  return (state.notes?.sheet?.[sheetId]) || "";
}

export function setSheetNote(state: AppState, sheetId: string, text: string): void {
  if (!state.notes) state.notes = { step: {}, sheet: {} };
  if (!state.notes.sheet) state.notes.sheet = {};
  if (text && text.trim()) state.notes.sheet[sheetId] = text;
  else delete state.notes.sheet[sheetId];
}

export function countSheetNotes(state: AppState, sheet: Sheet): number {
  let n = 0;
  for (const card of sheet.cards) {
    if (getStepNote(state, card.id)) n += 1;
  }
  if (getSheetNote(state, sheet.id)) n += 1;
  return n;
}

export const Notes = { getStepNote, setStepNote, getSheetNote, setSheetNote, countSheetNotes };
