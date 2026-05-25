# Critical Criteria — "Spot the Missing" Drill

**Date:** 2026-05-24  
**Status:** Approved

## Problem

The current `CriticalCriteriaDrill` shows the criterion text and immediately asks the student to self-grade. No active recall is required — the answer is always visible. This trains recognition, not recall, and doesn't build "complete set" awareness (knowing all N criteria for a station).

## Chosen Approach: Spot the Missing

Show the full criteria list for the sheet with one entry blanked out (the current SRS card). Student tries to recall the missing criterion in context of the others, then taps "Reveal" and self-grades.

## Data Model

No changes. Existing `drills.critical[sheetId][criterionId]` SRS records used as-is. The SRS queue and grading logic (`buildQueue`, `gradeCard`, `reinsertCard`) are unchanged.

## Component Behaviour

### Before reveal
- Full numbered list rendered for the sheet
- Current criterion (SRS target) shown as `???` highlighted in accent color  
- All criteria already graded "know" this session are dimmed (opacity 0.4)
- "Reveal criterion N" button below list
- Keyboard: Space/Enter triggers reveal

### After reveal
- `???` replaced with actual criterion text, styled in accent-ink
- Grade buttons appear below list: Would fail / Close call / Know it cold
- Keyboard: 1/2/3 for grade (existing behaviour)
- Advancing resets `revealed` to false

### Session states (unchanged)
- "All caught up" — SRS queue empty
- "Session complete" — all cards in queue processed

## State additions
- `revealed: boolean` — resets to `false` on each advance

## CSS additions
- `.critical-list` — flex column list, no list-style
- `.critical-list-item` — each row with number + text
- `.critical-list-item.is-target` — accent border + tinted bg
- `.critical-list-item.is-known` — dimmed (not the target)
- `.critical-list-num` — muted number prefix
- `.critical-list-blank` — italic accent `???` placeholder
- `.critical-list-revealed` — accent-ink bold revealed text
- `.critical-reveal-btn` — full-width reveal CTA

## Removed
- `.critical-card` / `.critical-card-text` — replaced by list view
- `.critical-pearl` "Why this matters" details — was "Coming soon", cut
- `.critical-mini-list` chip strip at bottom — redundant; list IS the content now
