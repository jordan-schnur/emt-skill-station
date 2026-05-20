/**
 * notes.js – per-step and per-sheet notes, persisted in state.notes.
 */
(function (global) {
  function getStepNote(state, cardId) {
    return (state.notes && state.notes.step && state.notes.step[cardId]) || "";
  }
  function setStepNote(state, cardId, text) {
    state.notes = state.notes || { step: {}, sheet: {} };
    state.notes.step = state.notes.step || {};
    if (text && text.trim()) state.notes.step[cardId] = text;
    else delete state.notes.step[cardId];
  }
  function getSheetNote(state, sheetId) {
    return (state.notes && state.notes.sheet && state.notes.sheet[sheetId]) || "";
  }
  function setSheetNote(state, sheetId, text) {
    state.notes = state.notes || { step: {}, sheet: {} };
    state.notes.sheet = state.notes.sheet || {};
    if (text && text.trim()) state.notes.sheet[sheetId] = text;
    else delete state.notes.sheet[sheetId];
  }

  function countSheetNotes(state, sheet) {
    let n = 0;
    for (const card of sheet.cards) {
      if (getStepNote(state, card.id)) n += 1;
    }
    if (getSheetNote(state, sheet.id)) n += 1;
    return n;
  }

  global.Notes = {
    getStepNote,
    setStepNote,
    getSheetNote,
    setSheetNote,
    countSheetNotes,
  };
})(window);
