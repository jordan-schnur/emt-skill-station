---
name: stats-achievements-overhaul
description: Stats and achievements system overhauled May 2026 — removed SRS-based achievements, fixed spoken_script_pass bug, added 8 new achievements, new stats view with drill mastery table
metadata:
  type: project
---

Overhauled stats and achievements system in May 2026.

**Why:** SRS was previously removed from the app but achievements still referenced `state.srs` (never populated). `spoken_script_pass` had a bug checking `rec.lastScore >= 0.8` when `lastScore` is `{ correct, total, pct }`. `totalReviews` was never incremented (SRS removed) so all engagement achievements were dead for new users.

**Changes made:**
- `js/achievements.js`: Removed `first_card_deep` and `all_cards_seen` (SRS-based). Fixed `spoken_script_pass`. Added 8 new achievements: `order_mastered_first`, `stepseq_mastered_first`, `whatnext_mastered_first`, `first_recall_attempt`, `spoken_script_mastered`, `recall_three_sheets`, `first_note`, `ten_notes`, `streak_30`, `all_drills_three_sheets`. Total: 22 achievements.
- `js/views.js`: Added `ctx.state.stats.totalReviews += 1` at all 5 drill submit points. Overhauled `Views.stats` to add hero row (notes count, sheets complete), drill mastery progress table (5 types × 10 sheets bars), and improved per-sheet stepseq badge.
- `css/styles.css`: Added `.drill-mastery-table`, `.drill-mastery-row`, `.drill-mastery-bar`, `.drill-bar-fill` CSS.
- `tests/achievements.test.js`: Rewrote to match new achievement set (41 tests).
- `jest.config.js`: Added `/.claude/worktrees/` to testPathIgnorePatterns to stop stale worktree tests from polluting runs.
- Feature docs created at `.claude/docs/features.md` and `.claude/docs/achievements.md`.
- `CLAUDE.md` updated to reference docs and correct state shape.

**How to apply:** See `.claude/docs/achievements.md` for the full achievement list. When adding new drill types, add `totalReviews` increment at the save point and corresponding achievements in `achievements.js`.
