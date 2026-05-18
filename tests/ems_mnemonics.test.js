/**
 * Tests for EMS Clinical Mnemonics data and views.
 */

require("../js/srs.js");
require("../js/storage.js");
require("../js/notes.js");
require("../js/achievements.js");
require("../js/ems_clinical_mnemonics.js");
require("../js/views.js");

import {
  createEmptyState,
  createMockContext,
  setupMockNREMTData,
} from "./fixtures.js";

// ── Data integrity tests ───────────────────────────────────────────────────

describe("EMS_CLINICAL_MNEMONICS – data integrity", () => {
  const data = global.EMS_CLINICAL_MNEMONICS;

  it("exports a non-empty array", () => {
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const m of data) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0);
      expect(typeof m.acronym).toBe("string");
      expect(m.acronym.length).toBeGreaterThan(0);
      expect(typeof m.title).toBe("string");
      expect(typeof m.category).toBe("string");
      expect(Array.isArray(m.letters)).toBe(true);
      expect(m.letters.length).toBeGreaterThan(0);
    }
  });

  it("every letter entry has required fields", () => {
    for (const m of data) {
      for (const item of m.letters) {
        expect(typeof item.letter).toBe("string");
        expect(item.letter.length).toBeGreaterThan(0);
        expect(typeof item.stand).toBe("string");
        expect(item.stand.length).toBeGreaterThan(0);
        expect(typeof item.detail).toBe("string");
      }
    }
  });

  it("has no duplicate IDs", () => {
    const ids = data.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("includes core EMS mnemonics", () => {
    const ids = new Set(data.map((m) => m.id));
    expect(ids.has("sample")).toBe(true);
    expect(ids.has("opqrst")).toBe(true);
    expect(ids.has("avpu")).toBe(true);
    expect(ids.has("dcap-btls")).toBe(true);
    expect(ids.has("hs-and-ts")).toBe(true);
    expect(ids.has("fast")).toBe(true);
  });

  it("SAMPLE has exactly 6 letters", () => {
    const sample = data.find((m) => m.id === "sample");
    expect(sample).toBeDefined();
    expect(sample.letters).toHaveLength(6);
  });

  it("Hs and Ts has 9 entries (5 Hs + 4 Ts)", () => {
    const ht = data.find((m) => m.id === "hs-and-ts");
    expect(ht).toBeDefined();
    expect(ht.letters).toHaveLength(9);
  });

  it("MONA has a non-null note (clinical caveat)", () => {
    const mona = data.find((m) => m.id === "mona");
    expect(mona).toBeDefined();
    expect(typeof mona.note).toBe("string");
    expect(mona.note.length).toBeGreaterThan(0);
  });

  it("note field is null or string on every entry", () => {
    for (const m of data) {
      expect(m.note === null || typeof m.note === "string").toBe(true);
    }
  });
});

// ── Storage tests ──────────────────────────────────────────────────────────

describe("Storage – emsSrs initialisation", () => {
  beforeEach(() => {
    localStorage.getItem.mockClear();
  });

  it("empty state includes emsSrs as empty object", () => {
    localStorage.getItem.mockReturnValue(null);
    const state = Storage.load();
    expect(state.emsSrs).toBeDefined();
    expect(typeof state.emsSrs).toBe("object");
    expect(Object.keys(state.emsSrs)).toHaveLength(0);
  });

  it("load() backfills emsSrs when absent from stored state", () => {
    localStorage.getItem.mockReturnValue(JSON.stringify({ version: 1, srs: {} }));
    const state = Storage.load();
    expect(state.emsSrs).toBeDefined();
    expect(typeof state.emsSrs).toBe("object");
  });

  it("load() preserves existing emsSrs records", () => {
    const existing = {
      version: 1,
      srs: {},
      emsSrs: { "ems::sample": { ease: 2.5, interval: 1, reps: 1, due: 9999999999, lastGrade: "good", lapses: 0 } },
    };
    localStorage.getItem.mockReturnValue(JSON.stringify(existing));
    const state = Storage.load();
    expect(state.emsSrs["ems::sample"]).toBeDefined();
    expect(state.emsSrs["ems::sample"].reps).toBe(1);
  });
});

// ── View rendering tests ───────────────────────────────────────────────────

describe("Views.emsMnemonics – rendering", () => {
  beforeEach(() => {
    setupMockNREMTData();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("renders without throwing", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    expect(() => Views.emsMnemonics(ctx)).not.toThrow();
  });

  it("returns an HTMLElement", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    const el = Views.emsMnemonics(ctx);
    expect(el instanceof HTMLElement).toBe(true);
  });

  it("renders a heading", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    const el = Views.emsMnemonics(ctx);
    const h1 = el.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1.textContent).toContain("Mnemonics");
  });

  it("renders category filter chips including 'All'", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    const el = Views.emsMnemonics(ctx);
    const chips = el.querySelectorAll(".ems-filter-chip");
    expect(chips.length).toBeGreaterThan(1);
    const labels = Array.from(chips).map((c) => c.textContent);
    expect(labels).toContain("All");
  });

  it("renders mnemonic cards in the grid", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    const el = Views.emsMnemonics(ctx);
    const cards = el.querySelectorAll(".ems-card");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("shows SAMPLE acronym on a card", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    const el = Views.emsMnemonics(ctx);
    const acronyms = Array.from(el.querySelectorAll(".ems-acronym")).map((a) => a.textContent);
    expect(acronyms).toContain("SAMPLE");
  });

  it("renders quiz button", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    const el = Views.emsMnemonics(ctx);
    const btn = el.querySelector(".ems-quiz-btn");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain("Quiz");
  });

  it("clicking a card expands it to show letter table", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    const el = Views.emsMnemonics(ctx);
    const card = el.querySelector(".ems-card");
    expect(card).not.toBeNull();
    const body = card.querySelector(".ems-card-body");
    expect(body.style.display).toBe("none");
    card.click();
    expect(body.style.display).toBe("");
    expect(card.classList.contains("expanded")).toBe(true);
  });

  it("clicking expanded card collapses it", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    const el = Views.emsMnemonics(ctx);
    const card = el.querySelector(".ems-card");
    card.click(); // expand
    card.click(); // collapse
    const body = card.querySelector(".ems-card-body");
    expect(body.style.display).toBe("none");
    expect(card.classList.contains("expanded")).toBe(false);
  });

  it("filter chip hides cards from other categories", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "browse" });
    const el = Views.emsMnemonics(ctx);
    const chips = el.querySelectorAll(".ems-filter-chip");
    const strokeChip = Array.from(chips).find((c) => c.textContent === "Stroke");
    if (!strokeChip) return; // guard if category name changes
    strokeChip.click();
    const cards = el.querySelectorAll(".ems-card");
    expect(cards.length).toBeGreaterThan(0);
    // All visible cards should belong to Stroke category
    for (const card of cards) {
      const tag = card.querySelector(".ems-category-tag");
      expect(tag.textContent).toBe("Stroke");
    }
  });
});

// ── Quiz mode tests ────────────────────────────────────────────────────────

describe("Views.emsMnemonics – quiz mode", () => {
  beforeEach(() => {
    setupMockNREMTData();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("renders quiz mode without throwing", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "quiz" });
    expect(() => Views.emsMnemonics(ctx)).not.toThrow();
  });

  it("shows quiz card when cards are due", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "quiz" });
    const el = Views.emsMnemonics(ctx);
    const quizCard = el.querySelector(".ems-quiz-card");
    expect(quizCard).not.toBeNull();
  });

  it("shows acronym on quiz card front", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "quiz" });
    const el = Views.emsMnemonics(ctx);
    const acronymEl = el.querySelector(".ems-quiz-acronym");
    expect(acronymEl).not.toBeNull();
    expect(acronymEl.textContent.length).toBeGreaterThan(0);
  });

  it("back is hidden before reveal", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "quiz" });
    const el = Views.emsMnemonics(ctx);
    const back = el.querySelector(".ems-quiz-back");
    expect(back).not.toBeNull();
    expect(back.style.display).toBe("none");
  });

  it("clicking Reveal shows back and grade buttons", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "quiz" });
    const el = Views.emsMnemonics(ctx);
    const revealBtn = el.querySelector(".ems-reveal-btn");
    expect(revealBtn).not.toBeNull();
    revealBtn.click();
    const back = el.querySelector(".ems-quiz-back");
    expect(back.style.display).toBe("");
    const gradeRow = el.querySelector(".ems-grade-row");
    expect(gradeRow.style.display).toBe("");
  });

  it("grading a card calls ctx.save()", () => {
    const ctx = createMockContext(null, { view: "mnemonics", tab: "quiz" });
    const el = Views.emsMnemonics(ctx);
    el.querySelector(".ems-reveal-btn").click();
    const goodBtn = Array.from(el.querySelectorAll(".ems-grade-row .btn"))
      .find((b) => b.textContent === "Good");
    expect(goodBtn).not.toBeNull();
    goodBtn.click();
    expect(ctx.save).toHaveBeenCalled();
  });

  it("grading a card stores an SRS record in state.emsSrs", () => {
    const state = createEmptyState();
    state.emsSrs = {};
    const ctx = createMockContext(state, { view: "mnemonics", tab: "quiz" });
    const el = Views.emsMnemonics(ctx);
    el.querySelector(".ems-reveal-btn").click();
    const goodBtn = Array.from(el.querySelectorAll(".ems-grade-row .btn"))
      .find((b) => b.textContent === "Good");
    goodBtn.click();
    expect(Object.keys(state.emsSrs).length).toBeGreaterThan(0);
  });

  it("shows all-caught-up when no cards are due", () => {
    const state = createEmptyState();
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    // Mark all cards as reviewed and not due for a long time
    for (const m of global.EMS_CLINICAL_MNEMONICS) {
      state.emsSrs = state.emsSrs || {};
      state.emsSrs["ems::" + m.id] = {
        ease: 2.5, interval: 30, reps: 3,
        due: now + 30 * DAY, lastGrade: "good", lapses: 0,
      };
    }
    const ctx = createMockContext(state, { view: "mnemonics", tab: "quiz" });
    const el = Views.emsMnemonics(ctx);
    expect(el.textContent).toContain("All caught up");
  });
});
