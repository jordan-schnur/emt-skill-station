# BLS Medications — Design Spec
**Date:** 2026-05-21  
**Status:** Approved  
**Route:** `#blsmeds[/<tab>]`

---

## 1. Goal

Build a standalone BLS Pharmacology study section that trains clinical decision-making — not just definition recall. The primary learning mode is patient scenarios; the secondary mode is SRS-scheduled retention drilling. The reference tab is always one tap away.

The benchmark: a user who masters this section should be able to answer any NREMT written question about BLS medications and correctly decide dose/route/contraindications in a live patient scenario.

---

## 2. Medications in Scope (9 drugs)

| Drug | Category | BLS Scope Note |
|------|----------|----------------|
| Oxygen | Foundational | Universal; delivery method distinctions matter |
| Aspirin | Cardiovascular | Chewed; 324 mg; ACS only |
| Nitroglycerin | Cardiovascular | Patient's own Rx; SBP check required; PDE5 inhibitor CI |
| Oral Glucose | Metabolic | Conscious + intact gag reflex only |
| Activated Charcoal | Toxicology | <1 hr from ingestion; multiple CIs |
| Epinephrine Auto-Injector | Anaphylaxis | 0.3 mg adult / 0.15 mg pedi; through clothing; repeat at 5 min |
| Albuterol (MDI/Neb) | Respiratory | Assist with patient's own or per protocol |
| Naloxone (Narcan) | Neurological/Toxicology | IN route; airway support first; expect withdrawal |
| Isopropyl Alcohol (inhaled) | Symptomatic | Nausea; some protocols only |

Source: NREMT EMT-Basic scope + Washington State 2024 BLS Protocol Guidance + WTCS Emergency Medical Technician textbook (Chapter 7: Pharmacology).

---

## 3. Data Model

### `src/data/bls_medications.ts`

```ts
export interface BLSMedDose {
  adult: string;
  pediatric?: string;
  notes?: string;
}

export interface BLSFollowUp {
  question: string;
  type: "dose" | "route" | "contraindication-check" | "reassessment";
  answer: string;
  options: string[]; // always 4 choices
}

export interface BLSScenario {
  id: string;
  vignette: string;        // 2-3 sentences, patient age/sex/chief complaint
  prompt: string;          // "Would you give [drug]?" or "Which drug is indicated?"
  format: "give-withhold" | "pick-drug";
  answer: string;          // "give" | "withhold" | medId
  explanation: string;     // why
  followUps: BLSFollowUp[]; // 1-3 follow-up questions for deep mode
}

export interface BLSMedication {
  id: string;              // kebab-case e.g. "nitroglycerin"
  name: string;
  genericName?: string;
  brandName?: string;
  category: string;        // "Cardiovascular" | "Respiratory" | "Metabolic" | "Toxicology" | "Anaphylaxis" | "Neurological" | "Foundational" | "Symptomatic"
  mechanism: string;       // one sentence
  indications: string[];
  contraindications: string[];
  dose: BLSMedDose;
  route: string[];
  onset: string;
  duration?: string;
  sideEffects: string[];
  clinicalPearls: string[]; // high-yield exam gotchas
  scenarios: BLSScenario[];
}
```

Scenarios are embedded per-drug (not a flat list) so they load with the drug's context. Each drug has 3–5 scenarios, mixing give/withhold and pick-drug formats. Approximately 35–40 total scenarios across 9 drugs.

### State (`src/types/index.ts`)

Add to `AppState`:
```ts
blsMedsSrs: Record<string, SRSRecord>; // key: "blsmed::<medId>"
```

Uses the existing `SRSRecord` shape and `emsSrs` scheduling logic from `src/lib/emsSrs.ts`.

---

## 4. View Architecture

**File:** `src/views/BlsMedsView.tsx`  
**Route:** added to `RouteView` as `"blsmeds"` and `VIEWS` map in `App.tsx`  
**Nav:** new item in the bottom nav strip

Three tabs, same pattern as `MedConditionsView`:

```
┌─────────────────────────────────┐
│  [Reference]  [Scenarios]  [Drill] │  ← tab strip
└─────────────────────────────────┘
```

---

## 5. Tab 1 — Reference

Browse all 9 medications. Expandable card per drug. Filter chips by category.

**Collapsed card:** drug name + category badge + one-line mechanism  
**Expanded card (all fields):**
- Indications (green bullet list)
- Contraindications (red bullet list)
- Dose: adult / pediatric / notes
- Route
- Onset / Duration
- Side Effects
- Clinical Pearls (yellow highlight)

No SRS or quiz in this tab — pure reference. Entry point for quick lookup during study.

---

## 6. Tab 2 — Scenarios

The primary learning mode. Two sub-modes selectable via toggle:

### Fast Mode (default)
1. Show patient vignette (2-3 sentences)
2. Prompt: "Would you give [drug]?" with Give / Withhold buttons, **or** "Which drug is indicated?" with 4-choice MCQ
3. Reveal answer + explanation immediately after selection
4. Track session accuracy (X/Y correct shown in header)
5. After each answer, offer "Go deeper →" button

### Deep Mode (via "Go deeper" or toggle)
After answering the scenario question, 1–3 follow-up questions appear in sequence:
- "What is the correct dose?"
- "Via which route?"
- "Name one contraindication for this drug."
Each is 4-choice MCQ. All auto-advance; explanation shown after each.

**Session flow:**
- Scenarios queue: due (SRS) first, then unseen, then upcoming
- Session length: 10 scenarios by default
- End screen: score %, drugs reviewed, SRS due count
- SRS update: correct answer → good grade applied; wrong → again

**Scenario authorship:** All vignettes in `bls_medications.ts` are hand-authored using real patient presentations from NREMT written exam study guides and EMS textbook case studies. Each drug has at least one "withhold" (contraindication) scenario.

---

## 7. Tab 3 — Drill

SRS-scheduled flashcard drill. Card face: drug name + category badge. Card back: full drug profile (same layout as Reference expanded card).

Grade buttons: Again / Hard / Good / Easy (same as `EmsMnemonicsView` QuizMode).

Due count shown on tab label: `Drill (3 due)`.

Reverse mode toggle: flip the card — front shows an indication or contraindication, back reveals the drug. This trains recognition from symptom to drug rather than drug to facts.

---

## 8. Routing

New route entry:
```ts
// types/index.ts
RouteView += "blsmeds"

Route += { blsmedsTab?: string }

// hashRouter.ts
#blsmeds        → { view: "blsmeds", blsmedsTab: "reference" }
#blsmeds/scenarios → { view: "blsmeds", blsmedsTab: "scenarios" }
#blsmeds/drill  → { view: "blsmeds", blsmedsTab: "drill" }
```

---

## 9. Navigation

Add `BlsMeds` to the existing bottom nav strip (same component that shows Home / Stats / Settings / Guide). Label: "BLS Meds" with a pill/capsule icon.

---

## 10. Achievements

Two new achievements in `src/lib/achievements.ts`:

| ID | Name | Trigger |
|----|------|---------|
| `blsmeds_first_scenario` | First Dose | Complete first BLS med scenario |
| `blsmeds_all_drilled` | Pharmacist | All 9 meds reviewed in Drill mode at least once |

---

## 11. Testing

- Unit tests in `tests/blsMedications.test.ts`: data integrity (all 9 meds present, all required fields populated, all scenario answers valid)
- Component test in `tests/BlsMedsView.test.tsx`: tab switching, scenario flow (select answer → show explanation), deep mode follow-up rendering
- E2E test in `tests/e2e/blsmeds.spec.js`: navigate to #blsmeds, complete a scenario, verify score updates

---

## 12. File Checklist

```
src/data/bls_medications.ts          ← new: 9 drugs, ~40 scenarios
src/views/BlsMedsView.tsx            ← new: 3-tab view
src/types/index.ts                   ← add BLSMedication, BLSScenario, BLSFollowUp types; blsMedsSrs on AppState; "blsmeds" RouteView
src/store/appStore.ts                ← add blsMedsSrs initial state
src/router/hashRouter.ts             ← #blsmeds route
src/App.tsx                          ← VIEWS map entry + nav item
src/lib/achievements.ts             ← 2 new achievements
tests/blsMedications.test.ts        ← data integrity tests
tests/BlsMedsView.test.tsx          ← component tests
tests/e2e/blsmeds.spec.js           ← E2E scenario flow
```

---

## 13. Sources

- [WTCS Emergency Medical Technician — Chapter 7: Pharmacology](https://wtcs.pressbooks.pub/emergencymedtech/chapter/chapter-8-pharmacology/)
- [Washington State 2024 BLS/ILS Protocol Guidance (DOH 530-281)](https://doh.wa.gov/sites/default/files/2024-08/530-281-BLS-ILSProtocolGuidance.pdf)
- [NREMT EMT-Basic Drug List — NM Health Publication 1889](https://www.nmhealth.org/publication/view/policy/1889/)
- [LogRx: Most Used EMT Medications](https://logrx.com/blog/exploring-the-most-used-emt-medications/)
