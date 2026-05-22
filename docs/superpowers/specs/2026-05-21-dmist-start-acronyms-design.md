# DMIST + START Triage Content Additions

**Date:** 2026-05-21
**Status:** Approved

## Problem

Two commonly-tested EMS acronyms are missing from the current 20-entry `EMS_CLINICAL_MNEMONICS` dataset:

1. **DMIST** — the standardized trauma handoff format used in Pennsylvania and Milwaukee EMS, and increasingly referenced in NREMT written exams.
2. **START triage** — the adult MCI triage protocol. JumpSTART (pediatric) is already in the app; the adult version is absent.

Both entries must include `sources` per the sourcing standard established in the per-letter-quiz spec.

## Non-Goals

- METHANE (MCI size-up) — not requested; deferred.
- MIST (simpler handoff) — not requested; deferred.
- VAN / WASTED (stroke) — not requested; deferred.

## New Entries

### DMIST

```ts
{
  id: "dmist",
  acronym: "DMIST",
  title: "Trauma Verbal Handoff",
  category: "Communication",
  note: "Designed for a 15–30 second trauma handoff from EMS to the receiving team. Standardized by the PA Trauma Systems Foundation. Complements SBAR (general) and IMIST-AMBO (international). Give DMIST immediately on arrival for stable patients; after patient transfer and primary survey for critical patients.",
  sources: [
    "PA Trauma Systems Foundation, DMIST Standardizing the EMS to Trauma Team Patient Hand-off, 2020",
    "Milwaukee County EMS Standards of Care, DMIST Trauma Verbal Handoff Format, 2020"
  ],
  letters: [
    {
      letter: "D",
      stand: "Demographics",
      detail: "Patient name (if known), age, sex, and weight if clinically relevant (e.g., pediatric dosing, crush injury)."
    },
    {
      letter: "M",
      stand: "Mechanism / Medical Complaint",
      detail: "For trauma: type of event (MVC, fall, assault, penetrating), speed, height of fall, weapon type, safety device use (seatbelt, airbag, helmet). For medical: the nature of illness in one sentence."
    },
    {
      letter: "I",
      stand: "Injuries / Illness Findings",
      detail: "Trauma: list injuries head-to-toe using DCAP-BTLS language. Medical: key exam findings (e.g., unequal pupils, absent breath sounds, ECG findings, stroke scale result)."
    },
    {
      letter: "S",
      stand: "Signs",
      detail: "Full vital signs: GCS, HR, RR, BP, SpO₂, BGL, skin signs (color, temperature, moisture). Note trends — improving or deteriorating."
    },
    {
      letter: "T",
      stand: "Treatment",
      detail: "All prehospital interventions: airway management, C-spine, hemorrhage control, IVs, medications given (drug, dose, route, time), and the patient's response to each treatment."
    }
  ]
}
```

### START Triage (30-2-Can Do)

START (Simple Triage And Rapid Treatment) is the adult MCI triage algorithm. The acronym itself is the system name; the testable content is the **30-2-Can Do** decision rule. The `letters` represent the four decision steps.

```ts
{
  id: "start",
  acronym: "START",
  title: "Adult MCI Triage (30-2-Can Do)",
  category: "Pediatric / MCI",
  note: "Simple Triage And Rapid Treatment. Adult counterpart to JumpSTART. Each patient assessed in under 60 seconds. The only prehospital treatment allowed during the triage pass is airway repositioning — no IVs, no medications. Use the 30-2-Can Do rule in sequence: Walk → 30 → 2 → Can Do.",
  sources: [
    "Benson M et al., 'START: Simple Triage And Rapid Treatment', Hoag Memorial Hospital Presbyterian, 1983",
    "FEMA / CHEMTREC START Triage Reference Card",
    "AHA/NAEMSP MCI Triage Guidelines"
  ],
  letters: [
    {
      letter: "Walk",
      stand: "Can the patient walk?",
      detail: "GREEN (Minor): Redirect walking wounded to a designated collection point. Tag green and move on immediately."
    },
    {
      letter: "30",
      stand: "Respirations (threshold: 30/min)",
      detail: "If apneic: reposition airway. Still no breathing → BLACK (Expectant/Deceased). If respirations > 30/min → RED (Immediate). If 10–29/min → continue to perfusion check."
    },
    {
      letter: "2",
      stand: "Perfusion (CRT > 2 sec or no radial pulse)",
      detail: "Absent radial pulse OR capillary refill > 2 seconds → RED (Immediate). Control major bleeding if present. CRT ≤ 2 sec with palpable pulse → continue to mental status."
    },
    {
      letter: "Can Do",
      stand: "Mental status (can follow simple commands?)",
      detail: "Ask: 'Open your hand' or 'close your eyes.' Cannot follow → RED (Immediate). Can follow simple commands → YELLOW (Delayed)."
    }
  ]
}
```

## Files Changed

- `src/data/ems_clinical_mnemonics.ts` — add DMIST and START entries at the end of the array

## Category Note

Both entries fit existing categories:
- DMIST → "Communication" (alongside SBAR, IMIST-AMBO)
- START → "Pediatric / MCI" (alongside JumpSTART, CUPS)

No new categories needed.

## Testing

- Verify both entries appear in BrowseMode under their respective categories
- Verify filter chips work (category filter shows DMIST under "Communication", START under "Pediatric / MCI")
- Verify per-letter quiz works for DMIST (5 letters, no connectors)
- Verify per-letter quiz works for START (4 multi-word "letters": Walk, 30, 2, Can Do)
- TypeScript: `npx tsc --noEmit` must pass

## References

- PA Trauma Systems Foundation — PA_DMIST_PPT.pdf (2020)
- Milwaukee County EMS — 2020TOOLDMIST062420.pdf
- Benson M et al. — START original publication, Hoag Hospital, 1983
- FEMA/CHEMTREC START reference materials
