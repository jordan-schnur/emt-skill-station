# Per-Letter Active Recall Quiz + Sources Field

**Date:** 2026-05-21
**Status:** Approved

## Problem

The current EMS Mnemonics quiz presents the full acronym, lets the user self-grade after revealing all answers at once. This is passive review — the weakest form of retrieval practice. Research consistently shows free-response active recall produces ~50% better long-term retention than passive review (Roediger & Karpicke, 2006; VSAQ vs. MCQ meta-analyses in PMC11684041).

Additionally, the current acronym data has no source attribution, making it hard to verify clinical accuracy or update entries when guidelines change.

## Goals

1. Replace the reveal-and-self-grade quiz interaction with per-letter active recall.
2. Add a `sources` field to `ClinicalMnemonic` so every entry cites an authoritative reference.
3. Backfill sources on all existing 20 mnemonics.

## Non-Goals

- Reverse-lookup quiz mode (show expansion, identify acronym) — future ticket.
- Multiple-choice per letter — future ticket.
- Per-letter SRS tracking (SRS still grades per whole card).

## Type Change

`src/types/index.ts` — add to `ClinicalMnemonic`:

```ts
sources?: string[];  // e.g. ["NAEMSP, EMS Clinical Practice Guidelines, 2023"]
```

## Quiz Flow

### Before (current)

1. Card front: acronym + category
2. "Reveal" → shows all letters expanded
3. User self-grades: Again / Hard / Good / Easy

### After (new)

1. Card front: acronym + title + category
2. "Begin Quiz" button
3. Letter-by-letter loop:
   - Prompt: *"SAMPLE — what does **S** stand for?"*
   - Text input (Enter or Submit button)
   - Fuzzy match: Jaccard similarity ≥ 0.45 (reuse logic from `BlankRecallView`)
   - Connector letters (stand === "(connector)") are skipped automatically
   - Show ✓ / ✗ with the correct answer revealed
   - "Next →" advances to the next letter
4. After all letters: summary screen
   - Shows score: "5 / 6 correct"
   - Pre-highlights suggested SRS grade:
     - < 50% correct → **Again**
     - 50–79% → **Hard**
     - 80–99% → **Good**
     - 100% → **Easy**
   - User can override and tap any grade to confirm
5. SRS grade applied to whole card (no per-letter SRS — same store as today)

## Browse Card

When a card is expanded, if `mnemonic.sources` is non-empty, render a `sources` row at the bottom of the card body:

```
Sources: PA Trauma Systems Foundation, 2020 · Mistovich & Karren, Prehospital Emergency Care 11e
```

Rendered as small, muted text. No links required (citations, not URLs).

## Data Backfill

Add `sources` to all 20 existing `EMS_CLINICAL_MNEMONICS` entries. Priority sources:

- SAMPLE, OPQRST, AVPU, DCAP-BTLS: Mistovich & Karren, *Prehospital Emergency Care*, 11th ed.
- PEARL, CMS: Standard physical exam references (Bickley, *Bates' Guide to Physical Examination*)
- TICLS, PAT: Dieckmann et al., *Pediatric Emergency Care Applied Research Network*, 2000
- AEIOU-TIPS: Marx, *Rosen's Emergency Medicine*, 9th ed.
- LEMON, MOANS, RODS, DOPE: Walls et al., *The Walls Manual of Emergency Airway Management*, 5th ed.
- Hs and Ts: AHA/ACLS Guidelines, 2020
- MONA: AHA/ACLS Guidelines, 2020 (notes on outdated components)
- FAST, BE-FAST: Kothari et al., *STROKE*, 1999; Aroor et al., *J Stroke Cerebrovasc Dis*, 2017
- JumpSTART: Lou Romig MD, *Pediatric Disaster Preparedness*, 2002
- CUPS: NAEMSP *EMS Clinical Practice Guidelines*, 2023
- SBAR: Kaiser Permanente / IHI, adopted 2003
- IMIST-AMBO: Iedema et al., *BMJ Quality & Safety*, 2012
- B-SMAC: Standard NREMT curriculum

## Files Changed

- `src/types/index.ts` — add `sources?` field
- `src/data/ems_clinical_mnemonics.ts` — add sources to all entries
- `src/views/EmsMnemonicsView.tsx` — replace `QuizMode` with per-letter flow, add sources row to `EmsCard`

## Testing

- Unit tests for the Jaccard matching logic (already exists in blank recall tests; verify it works for short phrases)
- Unit test: connector letters are skipped
- Unit test: grade suggestion thresholds (< 50%, 50–79%, 80–99%, 100%)
- E2E: quiz a card, type correct answers for all letters → verify "Good"/"Easy" suggested
- E2E: quiz a card, type wrong answers → verify "Again"/"Hard" suggested

## References

- Roediger & Karpicke (2006) — retrieval practice effect
- PMC11684041 — VSAQ vs. MCQ, knowledge retention
- ScienceDirect S1575181317300578 — fill-in-the-blank vs. MCQ in dental education
