/**
 * Unit and integration tests for views.js – DOM rendering and user interactions
 */

require("../js/srs.js");
require("../js/storage.js");
require("../js/notes.js");
require("../js/views.js");

import {
  createMockSheet,
  createEmptyState,
  createStateWithSRS,
  createStateWithNotes,
  createStateWithDrills,
  createMockContext,
  setupMockNREMTData,
} from "./fixtures.js";

describe("Views – DOM Rendering and UI", () => {
  beforeEach(() => {
    setupMockNREMTData();
    document.body.innerHTML = '<div id="root"></div>';
  });

  describe("h() – hyperscript helper", () => {
    it("should create a basic HTML element", () => {
      const el = window.Views.h("div", {}, ["Hello"]);
      expect(el.tagName).toBe("DIV");
      expect(el.textContent).toBe("Hello");
    });

    it("should set class attribute", () => {
      const el = window.Views.h("div", { class: "my-class" });
      expect(el.className).toContain("my-class");
    });

    it("should set data attributes", () => {
      const el = window.Views.h("button", {
        dataset: { nav: "home", action: "click" },
      });
      expect(el.dataset.nav).toBe("home");
      expect(el.dataset.action).toBe("click");
    });

    it("should attach event listeners", () => {
      const handler = jest.fn();
      const el = window.Views.h("button", { onclick: handler });
      el.click();
      expect(handler).toHaveBeenCalled();
    });

    it("should append multiple children", () => {
      const el = window.Views.h("div", {}, [
        "Text1",
        window.Views.h("span", {}, ["Text2"]),
        "Text3",
      ]);
      expect(el.children).toHaveLength(1); // only the span
      expect(el.textContent).toBe("Text1Text2Text3");
    });

    it("should handle null/false children gracefully", () => {
      const el = window.Views.h("div", {}, ["Hello", null, false, "World"]);
      expect(el.textContent).toBe("HelloWorld");
    });

    it("should set innerHTML when provided", () => {
      const el = window.Views.h("div", { html: "<strong>Bold</strong>" });
      expect(el.innerHTML).toBe("<strong>Bold</strong>");
    });
  });

  describe("Views.home", () => {
    it("should render without crashing", () => {
      const ctx = createMockContext();
      expect(() => window.Views.home(ctx)).not.toThrow();
    });

    it("should display all sheet cards", () => {
      const ctx = createMockContext();
      const view = window.Views.home(ctx);

      const sheets = global.NREMT_DATA.sheets;
      const cards = view.querySelectorAll(".sheet-card");

      expect(cards.length).toBe(sheets.length);
    });

    it("should show sheet metadata on each card", () => {
      const ctx = createMockContext();
      const view = window.Views.home(ctx);

      const firstCard = view.querySelector(".sheet-card");
      expect(firstCard.textContent).toContain("E201");
      expect(firstCard.textContent).toContain("Patient Assessment / Management – Trauma");
    });

    it("should show mastery percentage", () => {
      const ctx = createMockContext(createStateWithSRS());
      const view = window.Views.home(ctx);

      const masteryText = view.textContent;
      expect(masteryText).toMatch(/mastery \d+%/);
    });

    it("should navigate to sheet on card click", () => {
      const ctx = createMockContext();
      const view = window.Views.home(ctx);

      const firstCard = view.querySelector(".sheet-card");
      firstCard.click();

      expect(ctx.navigate).toHaveBeenCalledWith({
        view: "sheet",
        sheetId: "e201",
        tab: "study",
      });
    });

    it("should display roadmap of upcoming features", () => {
      const ctx = createMockContext();
      const view = window.Views.home(ctx);

      const roadmap = view.querySelector(".roadmap");
      expect(roadmap).toBeTruthy();
      expect(roadmap.textContent).toContain("Coming next");
    });
  });

  describe("Views.study – Flashcard review", () => {
    it("should render empty state when no cards are due", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();
      // Mark all cards as reviewed far in future
      ctx.state.srs = {};
      for (const card of sheet.cards) {
        ctx.state.srs[card.id] = { due: Date.now() + 1000000 };
      }

      const view = window.Views.study(ctx, sheet);

      expect(view.textContent).toContain("Nothing due");
    });

    it("should render a card for review", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      const view = window.Views.study(ctx, sheet);

      expect(view.textContent).toContain("Card 1 of");
      expect(view.textContent).toContain("Show answer");
    });

    it("should show reveal button initially", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      const view = window.Views.study(ctx, sheet);
      // Find reveal button by text content
      const buttons = Array.from(view.querySelectorAll("button"));
      const revealBtn = buttons.find((b) => b.textContent.includes("Show answer"));

      expect(revealBtn).toBeTruthy();
      expect(revealBtn.textContent).toContain("Show answer");
    });

    it("should hide grade buttons until card is revealed", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      const view = window.Views.study(ctx, sheet);
      // Grade buttons are in a container that's hidden until revealed
      const gradeRow = view.querySelector(".grade-row");

      expect(gradeRow.style.display).toBe("none");
    });

    it("should reveal answer on button click", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      const view = window.Views.study(ctx, sheet);
      const revealBtn = view.querySelector("button:not(.grade)");
      revealBtn.click();

      const answer = view.querySelector(".card-answer");
      expect(answer.style.display).not.toBe("none");
    });

    it("should show four grade options after revealing", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();

      const view = window.Views.study(ctx, sheet);
      const revealBtn = view.querySelector("button:not(.grade)");
      revealBtn.click();

      const gradeRow = view.querySelector(".grade-row");
      expect(gradeRow.style.display).not.toBe("none");

      const grades = view.querySelectorAll(".grade");
      expect(grades.length).toBe(4); // again, hard, good, easy
    });

    it("should save SRS state when grading", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();
      const cardId = sheet.cards[0].id;

      const view = window.Views.study(ctx, sheet);
      const revealBtn = view.querySelector("button:not(.grade)");
      revealBtn.click();

      const goodBtn = view.querySelector(".grade.good");
      goodBtn.click();

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.state.srs[cardId]).toBeDefined();
    });

    it("should update total review count", () => {
      const ctx = createMockContext(createEmptyState());
      const sheet = createMockSheet();
      const initialCount = ctx.state.stats.totalReviews;

      const view = window.Views.study(ctx, sheet);
      const revealBtn = view.querySelector("button:not(.grade)");
      revealBtn.click();
      const goodBtn = view.querySelector(".grade.good");
      goodBtn.click();

      expect(ctx.state.stats.totalReviews).toBe(initialCount + 1);
    });
  });

  describe("Views.reference – Full sheet view", () => {
    it("should render without crashing", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();

      expect(() => window.Views.reference(ctx, sheet)).not.toThrow();
    });

    it("should display all sections", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();

      const view = window.Views.reference(ctx, sheet);
      const sections = view.querySelectorAll(".ref-section");

      expect(sections.length).toBeGreaterThan(0);
    });

    it("should display critical criteria block", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();

      const view = window.Views.reference(ctx, sheet);

      expect(view.textContent).toContain("Critical Criteria");
      sheet.criticalCriteria.forEach((cc) => {
        expect(view.textContent).toContain(cc);
      });
    });

    it("should show note buttons for each step", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();

      const view = window.Views.reference(ctx, sheet);
      const noteButtons = view.querySelectorAll(".note-btn");

      expect(noteButtons.length).toBeGreaterThan(0);
    });

    it("should display existing notes", () => {
      const ctx = createMockContext(createStateWithNotes());
      const sheet = createMockSheet();

      const view = window.Views.reference(ctx, sheet);

      // The reference view shows a note indicator (not the full note content)
      expect(view.textContent).toContain("1+ note");
    });
  });

  describe("Views.notes – Notes management tab", () => {
    it("should render without crashing", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();

      expect(() => window.Views.notes(ctx, sheet)).not.toThrow();
    });

    it("should show all step notes for the sheet", () => {
      const ctx = createMockContext(createStateWithNotes());
      const sheet = createMockSheet();

      const view = window.Views.notes(ctx, sheet);

      // Notes view shows step names for cards with notes
      expect(view.textContent).toContain("PPE: Takes or verbalizes appropriate PPE precautions");
      expect(view.textContent).toContain("Per-step notes");
    });

    it("should show sheet-level notes", () => {
      const ctx = createMockContext(createStateWithNotes());
      const sheet = createMockSheet();

      const view = window.Views.notes(ctx, sheet);

      // Sheet-level notes section header is present
      expect(view.textContent).toContain("General note for this sheet");
    });

    it("should allow editing sheet-level notes", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();

      const view = window.Views.notes(ctx, sheet);
      const textarea = view.querySelector("textarea");

      expect(textarea).toBeTruthy();
    });
  });

  describe("DOM structure integrity", () => {
    it("should render home view with valid HTML structure", () => {
      const ctx = createMockContext();
      const view = window.Views.home(ctx);

      // Should have a title
      const h1 = view.querySelector("h1");
      expect(h1).toBeTruthy();

      // Should have sheet cards
      const cards = view.querySelectorAll(".sheet-card");
      expect(cards.length).toBeGreaterThan(0);

      // Cards should have click handler or be buttons/links
      cards.forEach((card) => {
        expect(card.className).toBeDefined();
      });
    });

    it("should render sheet view with tab navigation", () => {
      const ctx = createMockContext();
      ctx.route = { view: "sheet", sheetId: "e201", tab: "study" };
      const sheet = createMockSheet();

      const view = window.Views.sheet(ctx);
      const tabs = view.querySelectorAll(".tabs button");

      expect(tabs.length).toBeGreaterThan(0);
      // Tabs should have labels for different views
      const tabLabels = Array.from(tabs).map((btn) => btn.textContent.toLowerCase());
      expect(tabLabels.some((label) => label.includes("reference") || label.includes("full"))).toBeTruthy();
    });
  });

  describe("Mastery tracking display", () => {
    it("should show mastery percentage on sheet cards", () => {
      const ctx = createMockContext(createStateWithSRS());
      const view = window.Views.home(ctx);

      const masteryText = view.textContent;
      expect(masteryText).toMatch(/mastery \d+%/);
    });

    it("should show mastery bar fill proportional to percentage", () => {
      const ctx = createMockContext(createStateWithSRS());
      const view = window.Views.home(ctx);

      const bars = view.querySelectorAll(".mastery-fill");
      bars.forEach((bar) => {
        const width = bar.style.width;
        expect(width).toMatch(/^\d+%$/);
        const percent = parseInt(width);
        expect(percent).toBeGreaterThanOrEqual(0);
        expect(percent).toBeLessThanOrEqual(100);
      });
    });

    it("should show drill progress badges", () => {
      const ctx = createMockContext(createStateWithDrills());
      const view = window.Views.home(ctx);

      const badges = view.querySelectorAll(".sec-badge");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe("Views.criticalDrill – Critical Fail Mode", () => {
    it("should render without crashing", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      expect(() => window.Views.criticalDrill(ctx, sheet)).not.toThrow();
    });

    it("should show a fallback when criticalCriteria is empty", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet({ criticalCriteria: [] });
      const view = window.Views.criticalDrill(ctx, sheet);
      expect(view.className).toContain("empty-state");
    });

    it("should show criterion count in card meta", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet(); // has 3 criticalCriteria
      const view = window.Views.criticalDrill(ctx, sheet);
      // "Criterion 1 of 3"
      expect(view.textContent).toContain("Criterion 1 of");
      expect(view.textContent).toContain("3");
    });

    it("should display the crit-badge on the card", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      const view = window.Views.criticalDrill(ctx, sheet);
      const badge = view.querySelector(".crit-badge");
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain("Auto-fail");
    });

    it("should hide grade buttons until card is revealed", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      const view = window.Views.criticalDrill(ctx, sheet);
      const gradeRow = view.querySelector(".grade-row");
      expect(gradeRow).toBeTruthy();
      expect(gradeRow.style.display).toBe("none");
    });

    it("should hide the criterion answer until revealed", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      const view = window.Views.criticalDrill(ctx, sheet);
      const answer = view.querySelector(".crit-answer");
      expect(answer).toBeTruthy();
      expect(answer.style.display).toBe("none");
    });

    it("should show 3 grade buttons (not 4) after reveal", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      const view = window.Views.criticalDrill(ctx, sheet);

      const revealBtn = Array.from(view.querySelectorAll("button")).find(
        (b) => b.textContent.includes("Reveal")
      );
      expect(revealBtn).toBeTruthy();
      revealBtn.click();

      const gradeRow = view.querySelector(".crit-grade-row");
      expect(gradeRow.style.display).not.toBe("none");
      const grades = gradeRow.querySelectorAll(".grade");
      expect(grades.length).toBe(3); // again, hard, easy only
    });

    it("should reveal the criterion text after clicking reveal", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      const view = window.Views.criticalDrill(ctx, sheet);

      const revealBtn = Array.from(view.querySelectorAll("button")).find(
        (b) => b.textContent.includes("Reveal")
      );
      revealBtn.click();

      const answer = view.querySelector(".crit-answer");
      expect(answer.style.display).not.toBe("none");
      // Criterion text should be shown
      expect(answer.textContent).toBeTruthy();
    });

    it("should save to state.srs under critical:: key when graded", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      const view = window.Views.criticalDrill(ctx, sheet);

      const revealBtn = Array.from(view.querySelectorAll("button")).find(
        (b) => b.textContent.includes("Reveal")
      );
      revealBtn.click();

      const easyBtn = view.querySelector(".grade.easy");
      easyBtn.click();

      const critId = `critical::${sheet.id}::0`;
      expect(ctx.state.srs[critId]).toBeDefined();
      expect(ctx.state.srs[critId].reps).toBeGreaterThan(0);
      expect(ctx.save).toHaveBeenCalled();
    });

    it("should increment totalReviews when graded", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      const before = ctx.state.stats.totalReviews;

      const view = window.Views.criticalDrill(ctx, sheet);
      const revealBtn = Array.from(view.querySelectorAll("button")).find(
        (b) => b.textContent.includes("Reveal")
      );
      revealBtn.click();
      view.querySelector(".grade.hard").click();

      expect(ctx.state.stats.totalReviews).toBe(before + 1);
    });

    it("should set due to 30 s in the future when graded 'again'", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      const view = window.Views.criticalDrill(ctx, sheet);

      const revealBtn = Array.from(view.querySelectorAll("button")).find(
        (b) => b.textContent.includes("Reveal")
      );
      revealBtn.click();
      view.querySelector(".grade.again").click();

      const critId = `critical::${sheet.id}::0`;
      const rec = ctx.state.srs[critId];
      expect(rec).toBeDefined();
      // due should be roughly now + 30 s (within 5 s tolerance)
      expect(rec.due).toBeGreaterThan(Date.now() + 25 * 1000);
      expect(rec.due).toBeLessThan(Date.now() + 35 * 1000);
    });

    it("should show 'all on schedule' when all criteria are future-due", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      // Pre-seed all criteria as future-due
      sheet.criticalCriteria.forEach((_, i) => {
        ctx.state.srs[`critical::${sheet.id}::${i}`] = {
          ease: 2.5, interval: 1, reps: 1,
          due: Date.now() + 24 * 60 * 60 * 1000, // tomorrow
          lastGrade: "easy", lapses: 0, lastReviewed: Date.now(),
        };
      });

      const view = window.Views.criticalDrill(ctx, sheet);
      expect(view.textContent).toContain("on schedule");
    });

    it("should show 'Drill all anyway' button when nothing is due", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet();
      sheet.criticalCriteria.forEach((_, i) => {
        ctx.state.srs[`critical::${sheet.id}::${i}`] = {
          ease: 2.5, interval: 1, reps: 1,
          due: Date.now() + 24 * 60 * 60 * 1000,
          lastGrade: "easy", lapses: 0, lastReviewed: Date.now(),
        };
      });

      const view = window.Views.criticalDrill(ctx, sheet);
      const cramBtn = Array.from(view.querySelectorAll("button")).find(
        (b) => b.textContent.includes("anyway")
      );
      expect(cramBtn).toBeTruthy();
    });

    it("should show all criteria reviewed in tab label after completing all", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet(); // 3 criticalCriteria
      // Simulate having reviewed all 3
      sheet.criticalCriteria.forEach((_, i) => {
        ctx.state.srs[`critical::${sheet.id}::${i}`] = {
          ease: 2.65, interval: 6, reps: 2,
          due: Date.now() + 6 * 24 * 60 * 60 * 1000,
          lastGrade: "easy", lapses: 0, lastReviewed: Date.now(),
        };
      });

      ctx.route = { view: "sheet", sheetId: sheet.id, tab: "critical" };
      const view = window.Views.sheet(ctx);
      const tabs = Array.from(view.querySelectorAll(".tabs button"));
      const critTab = tabs.find((t) => t.textContent.includes("Critical Criteria"));
      expect(critTab).toBeTruthy();
      // All 3 reviewed → shows ✓
      expect(critTab.textContent).toContain("✓");
    });

    it("should show partial progress in tab label when some reviewed", () => {
      const ctx = createMockContext();
      const sheet = createMockSheet(); // 3 criticalCriteria
      // Simulate having reviewed only 1
      ctx.state.srs[`critical::${sheet.id}::0`] = {
        ease: 2.5, interval: 1, reps: 1,
        due: Date.now() + 24 * 60 * 60 * 1000,
        lastGrade: "easy", lapses: 0, lastReviewed: Date.now(),
      };

      ctx.route = { view: "sheet", sheetId: sheet.id, tab: "critical" };
      const view = window.Views.sheet(ctx);
      const tabs = Array.from(view.querySelectorAll(".tabs button"));
      const critTab = tabs.find((t) => t.textContent.includes("Critical Criteria"));
      expect(critTab).toBeTruthy();
      // 1 of 3 reviewed → shows (1/3)
      expect(critTab.textContent).toContain("1/3");
    });
  });
});
