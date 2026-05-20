---
name: ems-mnemonics-section
description: New EMS Mnemonics & Acronyms section (20 mnemonics, browse + SRS quiz) on branch worktree-ems-mnemonics; uses extensible renderReferenceLibrary() pattern for future BLS diagnoses
metadata:
  type: project
---

Branch `worktree-ems-mnemonics` adds the EMS Mnemonics section.

**Why:** Users needed to study clinical EMS mnemonics (SAMPLE, OPQRST, Hs & Ts, etc.) separate from the psychomotor skill sheets.

**How to apply:** Merge `worktree-ems-mnemonics` into `main` when ready. For adding BLS diagnoses later: create `js/bls_diagnoses.js` (same data shape as `EMS_CLINICAL_MNEMONICS`), add a route in `app.js`, call `renderReferenceLibrary(ctx, blsConfig)` — no UI code to rewrite.

Key files:
- `js/ems_clinical_mnemonics.js` — data (20 mnemonics, 7 categories)
- `js/views.js` → `renderReferenceLibrary()`, `Views.emsMnemonics()`
- `state.emsSrs` — SRS records for mnemonic cards
- `tests/ems_mnemonics.test.js` — 22 unit tests
- `tests/e2e/ems_mnemonics.spec.js` — E2E tests
