# BLS Medications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `#blsmeds` page with Reference, Scenarios, and Drill tabs for all 9 BLS-scope medications, training clinical decision-making via patient vignettes and SRS flashcards.

**Architecture:** New top-level view `BlsMedsView.tsx` with three tabs matching the `MedConditionsView` pattern. Medication data (including embedded scenarios) lives in `src/data/bls_medications.ts`. SRS state stored in `AppState.blsMedsSrs` using existing `SRSRecord` + `emsSrs.ts` scheduling. Achievement tracking via a new `blsmedsquiz` key on `AppState.drills`.

**Tech Stack:** Preact + signals (`@preact/signals`), Vitest + `@testing-library/preact`, Playwright E2E, TypeScript strict.

---

## Task 1: Types & state foundation

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/storage.ts`
- Modify: `tests/vitest.fixtures.ts`

- [ ] **Step 1: Add types and state shape to `src/types/index.ts`**

Add after the `MedicalCondition` interface (around line 146):

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
  vignette: string;
  prompt: string;
  format: "give-withhold" | "pick-drug";
  answer: string; // "give" | "withhold" | medId
  explanation: string;
  followUps: BLSFollowUp[];
}

export interface BLSMedication {
  id: string;
  name: string;
  genericName?: string;
  brandName?: string;
  category: string;
  mechanism: string;
  indications: string[];
  contraindications: string[];
  dose: BLSMedDose;
  route: string[];
  onset: string;
  duration?: string;
  sideEffects: string[];
  clinicalPearls: string[];
  scenarios: BLSScenario[];
}

export interface BlsMedsQuizRecord {
  scenariosCompleted: number;
  lastSessionAt: string | null;
}
```

Add `"blsmeds"` to `RouteView` union (around line 198):
```ts
export type RouteView =
  | "home"
  | "sheet"
  | "stats"
  | "settings"
  | "guide"
  | "chat"
  | "mnemonics"
  | "medconditions"
  | "blsmeds"
  | "notFound";
```

Add `blsmedsTab?: string` to `Route` interface and `blsMedsSrs` + `blsmedsquiz` to `AppState`:

```ts
// In Route interface, add:
blsmedsTab?: string;

// In Drills interface, add:
blsmedsquiz?: BlsMedsQuizRecord;

// In AppState interface, add:
blsMedsSrs: Record<string, SRSRecord>;
```

- [ ] **Step 2: Update `src/lib/storage.ts` to initialize and merge new state keys**

In `createEmptyState()`, add `blsMedsSrs: {}` to the return value:
```ts
export function createEmptyState(): AppState {
  return {
    version: 1,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: {
      totalReviews: 0,
      lastReviewedAt: null,
      dailyStreak: 0,
      longestStreak: 0,
      lastStreakDay: null,
    },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    emsSrs: {},
    medcondSrs: {},
    blsMedsSrs: {},
  };
}
```

In `mergeState()`, add after the `emsSrs` line:
```ts
medcondSrs: { ...((p["medcondSrs"] as AppState["medcondSrs"]) || {}) },
blsMedsSrs: { ...((p["blsMedsSrs"] as AppState["blsMedsSrs"]) || {}) },
```

- [ ] **Step 3: Update `tests/vitest.fixtures.ts` `createEmptyState` to include `blsMedsSrs`**

```ts
export function createEmptyState(): AppState {
  return {
    version: 1,
    srs: {},
    notes: { step: {}, sheet: {} },
    stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
    drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {} },
    achievements: {},
    mnemonics: {},
    chats: {},
    emsSrs: {},
    medcondSrs: {},
    blsMedsSrs: {},
  };
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all 229 existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/storage.ts tests/vitest.fixtures.ts
git commit -m "feat: add BLS medications types and state shape"
```

---

## Task 2: Data integrity tests (failing)

**Files:**
- Create: `tests/lib/blsMedications.test.ts`

- [ ] **Step 1: Write the failing data integrity test**

Create `tests/lib/blsMedications.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { BLS_MEDICATIONS } from "../../src/data/bls_medications";

const REQUIRED_IDS = [
  "oxygen",
  "aspirin",
  "nitroglycerin",
  "oral-glucose",
  "activated-charcoal",
  "epinephrine-auto-injector",
  "albuterol",
  "naloxone",
  "isopropyl-alcohol",
];

describe("BLS_MEDICATIONS data integrity", () => {
  it("exports an array", () => {
    expect(Array.isArray(BLS_MEDICATIONS)).toBe(true);
  });

  it("contains all 9 required medications", () => {
    const ids = BLS_MEDICATIONS.map((m) => m.id);
    for (const id of REQUIRED_IDS) {
      expect(ids).toContain(id);
    }
  });

  it("every medication has required string fields", () => {
    for (const med of BLS_MEDICATIONS) {
      expect(typeof med.id).toBe("string");
      expect(typeof med.name).toBe("string");
      expect(typeof med.category).toBe("string");
      expect(typeof med.mechanism).toBe("string");
      expect(typeof med.onset).toBe("string");
    }
  });

  it("every medication has non-empty arrays for indications and contraindications", () => {
    for (const med of BLS_MEDICATIONS) {
      expect(med.indications.length).toBeGreaterThan(0);
      expect(med.contraindications.length).toBeGreaterThan(0);
      expect(med.sideEffects.length).toBeGreaterThan(0);
      expect(med.clinicalPearls.length).toBeGreaterThan(0);
      expect(med.route.length).toBeGreaterThan(0);
    }
  });

  it("every medication has a valid dose with adult field", () => {
    for (const med of BLS_MEDICATIONS) {
      expect(typeof med.dose.adult).toBe("string");
      expect(med.dose.adult.length).toBeGreaterThan(0);
    }
  });

  it("every medication has at least 3 scenarios", () => {
    for (const med of BLS_MEDICATIONS) {
      expect(med.scenarios.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every scenario has required fields", () => {
    for (const med of BLS_MEDICATIONS) {
      for (const s of med.scenarios) {
        expect(typeof s.id).toBe("string");
        expect(typeof s.vignette).toBe("string");
        expect(typeof s.prompt).toBe("string");
        expect(["give-withhold", "pick-drug"]).toContain(s.format);
        expect(typeof s.answer).toBe("string");
        expect(typeof s.explanation).toBe("string");
        expect(Array.isArray(s.followUps)).toBe(true);
      }
    }
  });

  it("give-withhold scenarios have answer 'give' or 'withhold'", () => {
    for (const med of BLS_MEDICATIONS) {
      for (const s of med.scenarios) {
        if (s.format === "give-withhold") {
          expect(["give", "withhold"]).toContain(s.answer);
        }
      }
    }
  });

  it("every medication has at least one 'withhold' scenario", () => {
    for (const med of BLS_MEDICATIONS) {
      const hasWithhold = med.scenarios.some(
        (s) => s.format === "give-withhold" && s.answer === "withhold"
      );
      expect(hasWithhold).toBe(true);
    }
  });

  it("followUp options always has exactly 4 choices", () => {
    for (const med of BLS_MEDICATIONS) {
      for (const s of med.scenarios) {
        for (const fu of s.followUps) {
          expect(fu.options.length).toBe(4);
          expect(fu.options).toContain(fu.answer);
        }
      }
    }
  });

  it("scenario IDs are unique across all medications", () => {
    const ids: string[] = [];
    for (const med of BLS_MEDICATIONS) {
      for (const s of med.scenarios) {
        ids.push(s.id);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- tests/lib/blsMedications.test.ts
```

Expected: FAIL — "Cannot find module '../../src/data/bls_medications'"

---

## Task 3: Medication data file

**Files:**
- Create: `src/data/bls_medications.ts`

- [ ] **Step 1: Create the complete medication data file**

Create `src/data/bls_medications.ts`:

```ts
import type { BLSMedication } from "../types";

export const BLS_MEDICATIONS: BLSMedication[] = [
  {
    id: "oxygen",
    name: "Oxygen",
    category: "Foundational",
    mechanism: "Increases fraction of inspired oxygen (FiO2), enhancing diffusion across alveolar membranes to improve tissue oxygenation.",
    indications: [
      "Respiratory distress or difficulty breathing",
      "SpO2 < 94% (or < 88% target in COPD)",
      "Suspected hypoxia of any cause",
      "Cardiac arrest",
      "Suspected carbon monoxide poisoning",
      "Shock (any type)",
      "Major trauma",
    ],
    contraindications: [
      "No absolute contraindications",
      "Use caution in COPD: target SpO2 88–92% to avoid suppressing hypoxic drive",
    ],
    dose: {
      adult: "Nasal cannula: 2–6 L/min (24–44% FiO2); Non-rebreather mask: 10–15 L/min (60–90% FiO2); BVM: 15 L/min",
      pediatric: "Same delivery methods; titrate to SpO2 94–99%",
      notes: "Target SpO2 94–98% for most patients; 88–92% for known COPD",
    },
    route: ["Inhalation — nasal cannula, non-rebreather mask, BVM"],
    onset: "Immediate",
    duration: "Continuous while administered",
    sideEffects: [
      "Drying of mucous membranes",
      "Potential suppression of hypoxic drive in COPD (high-flow)",
      "Absorption atelectasis with prolonged 100% O2",
    ],
    clinicalPearls: [
      "Oxygen is a medication — document dose and delivery device",
      "SpO2 97–100% is not the goal; avoid hyperoxia",
      "For CO poisoning, give highest-flow O2 regardless of SpO2 reading (CO falsely elevates pulse ox)",
      "Check cylinder pressure before use — minimum 500 psi",
    ],
    scenarios: [
      {
        id: "o2-copd-low-spo2",
        vignette: "72-year-old male with known COPD. Labored breathing, RR 24, SpO2 84% on room air. History of multiple COPD exacerbations.",
        prompt: "Would you administer oxygen?",
        format: "give-withhold",
        answer: "give",
        explanation: "SpO2 84% is life-threatening hypoxia — give oxygen, targeting SpO2 88–92% in known COPD. Titrate NC flow to achieve this; avoid high-flow that would eliminate the hypoxic drive.",
        followUps: [
          {
            question: "What SpO2 target is appropriate for a known COPD patient?",
            type: "reassessment",
            answer: "88–92%",
            options: ["94–98%", "88–92%", "98–100%", "80–85%"],
          },
        ],
      },
      {
        id: "o2-normal-spo2",
        vignette: "45-year-old female, chest pain, SpO2 97% on room air, no respiratory distress, speaking in full sentences.",
        prompt: "Would you routinely apply high-flow oxygen via non-rebreather mask?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "With SpO2 97% and no distress, routine high-flow oxygen is not indicated and may cause harm. Low-flow NC or no supplemental oxygen is appropriate; treat the underlying cause.",
        followUps: [
          {
            question: "At what SpO2 threshold is supplemental oxygen indicated for most patients?",
            type: "dose",
            answer: "Below 94%",
            options: ["Below 99%", "Below 94%", "Below 88%", "Below 97%"],
          },
        ],
      },
      {
        id: "o2-co-poisoning",
        vignette: "30-year-old found unresponsive in a closed garage with a running car. Pulse ox reads 99%. Skin appears cherry-red.",
        prompt: "Would you apply high-flow oxygen via non-rebreather mask?",
        format: "give-withhold",
        answer: "give",
        explanation: "Suspected CO poisoning — apply highest-flow O2 immediately. Pulse oximetry is falsely elevated because CO binds hemoglobin in a way that reads as oxyhemoglobin. Cherry-red skin is a classic CO sign.",
        followUps: [
          {
            question: "Why is pulse oximetry unreliable in CO poisoning?",
            type: "reassessment",
            answer: "CO falsely elevates pulse ox readings by mimicking oxyhemoglobin",
            options: [
              "The device malfunctions in CO environments",
              "CO falsely elevates pulse ox readings by mimicking oxyhemoglobin",
              "CO absorbs the infrared light used by the probe",
              "Vasoconstriction prevents accurate readings",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "aspirin",
    name: "Aspirin",
    genericName: "Acetylsalicylic acid",
    brandName: "Bayer, Ecotrin",
    category: "Cardiovascular",
    mechanism: "Irreversibly inhibits COX-1 and COX-2 enzymes, preventing thromboxane A2 synthesis and platelet aggregation.",
    indications: [
      "Suspected acute coronary syndrome (ACS) / acute myocardial infarction (AMI)",
      "Chest pain of suspected cardiac origin",
    ],
    contraindications: [
      "True aspirin allergy (anaphylaxis, hives, angioedema — not GI intolerance)",
      "Active GI bleeding",
      "Recent GI surgery",
      "Patients under 12 years old",
      "Bleeding disorders (relative contraindication — consult medical direction)",
    ],
    dose: {
      adult: "324 mg (four 81 mg chewable tablets) — chewed, not swallowed whole",
      pediatric: "Not indicated in pediatric BLS for ACS",
      notes: "Chewing achieves faster antiplatelet effect than swallowing whole. Ask if patient has already taken aspirin before arrival.",
    },
    route: ["Oral — chewed"],
    onset: "Antiplatelet effect begins within 30–40 minutes",
    sideEffects: [
      "GI upset, nausea",
      "Increased bleeding risk",
      "Tinnitus (at high doses)",
    ],
    clinicalPearls: [
      "Chewed, not swallowed — faster absorption",
      "GI intolerance (upset stomach) is NOT a true allergy — true allergy is anaphylaxis or hives",
      "Always ask if patient already took aspirin before EMS arrival",
      "Do NOT give for suspected stroke — cannot rule out hemorrhagic stroke in the field",
      "324 mg = four 81 mg baby aspirin tabs OR two 162 mg tabs",
    ],
    scenarios: [
      {
        id: "asa-classic-ami",
        vignette: "58-year-old male, crushing substernal chest pain radiating to left arm, diaphoretic. BP 148/90, HR 88. No aspirin allergy reported, no GI bleeding history.",
        prompt: "Would you administer aspirin?",
        format: "give-withhold",
        answer: "give",
        explanation: "Classic ACS presentation with no contraindications. Give 324 mg chewable aspirin immediately — antiplatelet therapy is time-critical in AMI.",
        followUps: [
          {
            question: "What is the correct aspirin dose and method of administration?",
            type: "dose",
            answer: "324 mg chewed (four 81 mg tablets)",
            options: [
              "325 mg swallowed whole with water",
              "324 mg chewed (four 81 mg tablets)",
              "162 mg chewed (two 81 mg tablets)",
              "650 mg chewed (eight 81 mg tablets)",
            ],
          },
        ],
      },
      {
        id: "asa-gi-intolerance",
        vignette: "62-year-old female, chest pressure, reports she is 'allergic to aspirin because it upsets her stomach.'",
        prompt: "Would you administer aspirin?",
        format: "give-withhold",
        answer: "give",
        explanation: "GI intolerance (upset stomach) is NOT a true aspirin allergy. A true allergy causes anaphylaxis, hives, or angioedema. Clarify and administer aspirin per protocol unless there is evidence of a true allergic reaction.",
        followUps: [
          {
            question: "What distinguishes a true aspirin allergy from intolerance?",
            type: "contraindication-check",
            answer: "True allergy causes anaphylaxis, hives, or angioedema — not GI upset",
            options: [
              "Any adverse reaction to aspirin is a contraindication",
              "True allergy causes anaphylaxis, hives, or angioedema — not GI upset",
              "GI upset is always considered a true allergy in the field",
              "Only anaphylaxis counts; hives do not contraindicate aspirin",
            ],
          },
        ],
      },
      {
        id: "asa-gi-bleed",
        vignette: "45-year-old male, chest pain, BP 130/80. States he was hospitalized last week for GI bleeding and is currently on iron supplements.",
        prompt: "Would you administer aspirin?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Active or recent GI bleeding is a contraindication to aspirin. Aspirin's antiplatelet effect would worsen hemorrhage. Contact medical direction and transport rapidly.",
        followUps: [
          {
            question: "Active GI bleeding is a contraindication to aspirin because:",
            type: "contraindication-check",
            answer: "Aspirin inhibits platelet aggregation, worsening hemorrhage",
            options: [
              "Aspirin is absorbed poorly in GI-compromised patients",
              "Aspirin inhibits platelet aggregation, worsening hemorrhage",
              "GI bleeding indicates acetaminophen toxicity",
              "Aspirin causes vasoconstriction that worsens GI ischemia",
            ],
          },
        ],
      },
      {
        id: "asa-suspected-stroke",
        vignette: "68-year-old female, sudden facial droop, slurred speech, right arm weakness. She says she has chest pain too. FAST exam positive.",
        prompt: "Would you administer aspirin for her chest pain?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Do NOT give aspirin when stroke is suspected. A hemorrhagic stroke would be worsened by antiplatelet therapy. You cannot rule out hemorrhagic stroke in the field — transport rapidly.",
        followUps: [
          {
            question: "Why is aspirin contraindicated in suspected stroke?",
            type: "contraindication-check",
            answer: "Cannot rule out hemorrhagic stroke in the field; aspirin would worsen bleeding",
            options: [
              "Aspirin causes vasospasm that worsens stroke",
              "Cannot rule out hemorrhagic stroke in the field; aspirin would worsen bleeding",
              "Aspirin is only contraindicated in pediatric stroke",
              "Stroke patients are always allergic to aspirin",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "nitroglycerin",
    name: "Nitroglycerin",
    genericName: "Nitroglycerin",
    brandName: "Nitrostat, Nitrolingual",
    category: "Cardiovascular",
    mechanism: "Converts to nitric oxide, relaxing vascular smooth muscle. Dilates veins (reduces preload) and arteries (reduces afterload), decreasing myocardial oxygen demand.",
    indications: [
      "Angina pectoris — patient's own prescribed nitroglycerin",
      "Suspected acute coronary syndrome / chest pain of cardiac origin",
    ],
    contraindications: [
      "Systolic BP < 90 mmHg (or < 100 mmHg in some protocols)",
      "Heart rate < 50 bpm or > 100 bpm without heart failure present",
      "Use of phosphodiesterase-5 (PDE5) inhibitors within 24–48 hours (sildenafil/Viagra, tadalafil/Cialis, vardenafil/Levitra, avanafil/Stendra)",
      "Head injury or increased intracranial pressure",
      "Suspected right ventricular infarction (inferior MI)",
      "Hypersensitivity to nitrates",
      "Already administered maximum 3 doses",
    ],
    dose: {
      adult: "0.4 mg sublingual tablet or one metered spray; may repeat every 5 minutes up to 3 total doses",
      notes: "Must be patient's own prescription. Check BP before each dose. Instruct patient to sit or lie down.",
    },
    route: ["Sublingual (SL) — dissolves under tongue"],
    onset: "1–3 minutes",
    duration: "30–60 minutes",
    sideEffects: [
      "Headache (most common)",
      "Hypotension",
      "Reflex tachycardia",
      "Dizziness / lightheadedness",
      "Flushing",
    ],
    clinicalPearls: [
      "Always check BP before each dose — BP < 90 systolic is an absolute contraindication",
      "Ask about PDE5 inhibitors by brand name — patients may not know the generic (ask 'Viagra, Cialis, Levitra, or Stendra?')",
      "Have patient sit or lie down — prevents syncope from hypotension",
      "Medication degrades with heat and light — keep in original dark bottle",
      "Burning/fizzing sensation under tongue indicates medication is still potent",
      "Maximum 3 doses total, 5 minutes apart",
    ],
    scenarios: [
      {
        id: "nitro-classic-angina",
        vignette: "65-year-old male, typical angina, BP 122/78, HR 82. Has his own nitroglycerin prescription. Denies Viagra or similar medications.",
        prompt: "Would you assist with nitroglycerin?",
        format: "give-withhold",
        answer: "give",
        explanation: "No contraindications — BP adequate, HR normal, no PDE5 inhibitors. Assist patient with their own prescribed nitroglycerin 0.4 mg SL.",
        followUps: [
          {
            question: "How often may nitroglycerin be repeated, and what is the maximum number of doses?",
            type: "dose",
            answer: "Every 5 minutes, maximum 3 doses",
            options: [
              "Every 10 minutes, maximum 5 doses",
              "Every 5 minutes, maximum 3 doses",
              "Every 2 minutes, maximum 2 doses",
              "Every 15 minutes, maximum 4 doses",
            ],
          },
        ],
      },
      {
        id: "nitro-low-bp",
        vignette: "68-year-old female, chest pain, diaphoretic. BP 86/54, HR 96. Has her own nitroglycerin.",
        prompt: "Would you assist with nitroglycerin?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Systolic BP 86 mmHg is below the contraindication threshold of 90 mmHg. Nitroglycerin would cause further vasodilation and could precipitate cardiovascular collapse. Transport immediately.",
        followUps: [
          {
            question: "What is the minimum systolic BP required before administering nitroglycerin?",
            type: "contraindication-check",
            answer: "90 mmHg (some protocols 100 mmHg)",
            options: [
              "80 mmHg",
              "90 mmHg (some protocols 100 mmHg)",
              "100 mmHg always",
              "60 mmHg",
            ],
          },
        ],
      },
      {
        id: "nitro-pde5",
        vignette: "70-year-old male, chest pressure, BP 118/76. Has nitro prescription. When asked, admits he took sildenafil (Viagra) about 18 hours ago.",
        prompt: "Would you assist with nitroglycerin?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "PDE5 inhibitor use within 24–48 hours is an absolute contraindication. The combination can cause severe, refractory hypotension. 18 hours is within the 24-hour window for sildenafil.",
        followUps: [
          {
            question: "Which time window applies to PDE5 inhibitor contraindication with nitroglycerin?",
            type: "contraindication-check",
            answer: "24–48 hours (sildenafil 24h; tadalafil up to 48h)",
            options: [
              "6 hours",
              "12 hours",
              "24–48 hours (sildenafil 24h; tadalafil up to 48h)",
              "72 hours",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "oral-glucose",
    name: "Oral Glucose",
    genericName: "Glucose gel",
    brandName: "Instaglucose, Glutose 15",
    category: "Metabolic",
    mechanism: "Direct glucose supplementation absorbed through the GI tract, rapidly correcting hypoglycemia by restoring blood glucose to normal levels.",
    indications: [
      "Hypoglycemia (blood glucose < 70 mg/dL or per local protocol)",
      "Patient with altered mental status and known diabetes mellitus",
      "Signs/symptoms of hypoglycemia in a conscious patient able to swallow",
    ],
    contraindications: [
      "Altered mental status — patient cannot safely swallow (aspiration risk)",
      "Absent gag reflex",
      "Unconscious or unresponsive patient",
      "Unable to follow instructions or protect airway",
    ],
    dose: {
      adult: "15–25 g glucose gel (one tube = approximately 15 g)",
      pediatric: "15 g; allow child to self-administer if capable",
      notes: "Allow patient to self-administer if possible. Reassess blood glucose and mental status in 15 minutes.",
    },
    route: ["Oral — swallowed or placed between cheek and gum"],
    onset: "10–15 minutes",
    sideEffects: [
      "Aspiration if given to an unresponsive patient",
      "Hyperglycemia if given inappropriately",
      "Nausea",
    ],
    clinicalPearls: [
      "NEVER give to an unconscious or unresponsive patient — aspiration risk is lethal",
      "Reassess in 15 minutes; if no improvement, consider ALS intercept for IV dextrose",
      "Altered mental status with diabetes = assume hypoglycemia until proven otherwise",
      "Patient does not need to drink it — can be squeezed between cheek and gum",
    ],
    scenarios: [
      {
        id: "glucose-conscious-hypo",
        vignette: "28-year-old type 1 diabetic, found confused but responsive to voice. Blood glucose 42 mg/dL. Weak hand grip but able to follow commands. Gag reflex intact.",
        prompt: "Would you administer oral glucose?",
        format: "give-withhold",
        answer: "give",
        explanation: "Patient is conscious with intact gag reflex and can follow commands — safe to administer oral glucose. BG 42 is significantly hypoglycemic.",
        followUps: [
          {
            question: "What is the correct dose of oral glucose for an adult?",
            type: "dose",
            answer: "15–25 g (one tube)",
            options: ["5 g", "15–25 g (one tube)", "50 g", "100 g"],
          },
        ],
      },
      {
        id: "glucose-unconscious",
        vignette: "35-year-old known diabetic, found unresponsive on the floor. Blood glucose 32 mg/dL. No response to sternal rub.",
        prompt: "Would you administer oral glucose?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Patient is unresponsive — administering oral glucose risks aspiration and airway obstruction. Manage airway, support ventilation, and arrange ALS intercept for IV dextrose.",
        followUps: [
          {
            question: "What is the correct next step for an unconscious hypoglycemic patient at the BLS level?",
            type: "reassessment",
            answer: "Manage airway, support ventilation, request ALS for IV dextrose",
            options: [
              "Place glucose gel under the tongue anyway",
              "Manage airway, support ventilation, request ALS for IV dextrose",
              "Administer glucagon IM",
              "Wait for the patient to regain consciousness",
            ],
          },
        ],
      },
      {
        id: "glucose-normal-bg",
        vignette: "52-year-old diabetic, reports shakiness. Blood glucose is 88 mg/dL. Alert and oriented.",
        prompt: "Would you administer oral glucose?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Blood glucose 88 mg/dL is within the normal range — oral glucose is not indicated. Assess for other causes of shakiness and reassess.",
        followUps: [
          {
            question: "Below what blood glucose level is hypoglycemia typically defined in EMS?",
            type: "contraindication-check",
            answer: "Below 70 mg/dL (some protocols below 60 mg/dL)",
            options: [
              "Below 100 mg/dL",
              "Below 70 mg/dL (some protocols below 60 mg/dL)",
              "Below 50 mg/dL",
              "Below 40 mg/dL",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "activated-charcoal",
    name: "Activated Charcoal",
    genericName: "Activated charcoal",
    brandName: "Actidose-Aqua, CharcoAid",
    category: "Toxicology",
    mechanism: "Highly porous carbon matrix adsorbs (binds) toxins within the GI tract, preventing absorption into the bloodstream.",
    indications: [
      "Ingestion of a potentially toxic substance within approximately 60 minutes",
      "Toxic ingestion where the substance is adsorbed by charcoal (most medications, many household chemicals)",
      "Patient is conscious and able to swallow",
      "Medical direction orders or protocol allows administration",
    ],
    contraindications: [
      "Altered mental status — cannot protect airway",
      "Absent gag reflex or unable to swallow",
      "Caustic ingestions: strong acids (e.g., battery acid), strong alkalis (e.g., lye, bleach, drain cleaner)",
      "Hydrocarbon ingestions (gasoline, lighter fluid, kerosene) — aspiration risk",
      "Heavy metal ingestions (iron, lithium) — charcoal does not adsorb metals",
      "Alcohol ingestion — absorbed too rapidly; charcoal largely ineffective",
      "Cyanide poisoning",
      "Ingestion more than 60 minutes ago — significantly reduced benefit",
      "Patient already vomiting persistently",
    ],
    dose: {
      adult: "1–2 g/kg body weight; typically 25–50 g premixed in water",
      pediatric: "12.5–25 g (0.5–1 g/kg)",
      notes: "Contact medical direction before administering in most jurisdictions. May be given with juice to improve palatability.",
    },
    route: ["Oral — drink the premixed slurry"],
    onset: "Immediately begins adsorbing in GI tract",
    sideEffects: [
      "Black vomit and black stools",
      "Aspiration (if mental status altered)",
      "Constipation or bowel obstruction (rare)",
      "Nausea/vomiting",
    ],
    clinicalPearls: [
      "NOT activated charcoal from a grill — pharmaceutical grade only",
      "Caustics and hydrocarbons are absolute contraindications",
      "Does NOT work for iron, lithium, or alcohols",
      "Most effective within 30–60 minutes of ingestion; benefit drops sharply after 1 hour",
      "Requires medical direction in most EMS systems before administration",
    ],
    scenarios: [
      {
        id: "ac-tylenol-ingestion",
        vignette: "19-year-old, intentionally ingested approximately 20 acetaminophen (Tylenol) tablets 25 minutes ago. Alert, following commands, no vomiting.",
        prompt: "Would you administer activated charcoal?",
        format: "give-withhold",
        answer: "give",
        explanation: "Within 60 minutes, patient conscious and able to swallow, acetaminophen IS adsorbed by charcoal. Contact medical direction and administer per protocol.",
        followUps: [
          {
            question: "What is the correct adult dose of activated charcoal?",
            type: "dose",
            answer: "1–2 g/kg, typically 25–50 g",
            options: [
              "5–10 g regardless of weight",
              "1–2 g/kg, typically 25–50 g",
              "100 g fixed dose",
              "0.1 g/kg maximum 5 g",
            ],
          },
        ],
      },
      {
        id: "ac-caustic",
        vignette: "22-year-old, ingested an unknown amount of drain cleaner (lye). Complaining of severe mouth and throat pain. Alert.",
        prompt: "Would you administer activated charcoal?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Caustic (alkali) ingestions are an absolute contraindication. Activated charcoal does not bind caustics and may induce vomiting, causing additional chemical burns on the way back up.",
        followUps: [
          {
            question: "Which of the following ingestions is a contraindication to activated charcoal?",
            type: "contraindication-check",
            answer: "Lye (caustic alkali)",
            options: [
              "Acetaminophen overdose",
              "Lye (caustic alkali)",
              "Benzodiazepine overdose",
              "Aspirin overdose",
            ],
          },
        ],
      },
      {
        id: "ac-gasoline",
        vignette: "30-year-old accidentally ingested gasoline while siphoning a gas tank. Alert and anxious.",
        prompt: "Would you administer activated charcoal?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Hydrocarbon ingestion is a contraindication to activated charcoal. Vomiting (which charcoal may induce) risks aspirating hydrocarbons into the lungs, causing severe chemical pneumonitis.",
        followUps: [
          {
            question: "Why is activated charcoal contraindicated for hydrocarbon ingestions?",
            type: "contraindication-check",
            answer: "Inducing vomiting/regurgitation risks hydrocarbon aspiration causing chemical pneumonitis",
            options: [
              "Charcoal binds too strongly to hydrocarbons causing toxicity",
              "Inducing vomiting/regurgitation risks hydrocarbon aspiration causing chemical pneumonitis",
              "Charcoal reacts chemically with petroleum products",
              "Hydrocarbons are absorbed too slowly for charcoal to help",
            ],
          },
        ],
      },
      {
        id: "ac-late-ingestion",
        vignette: "25-year-old ingested sleeping pills 3 hours ago. Now alert, somewhat drowsy but following commands and swallowing normally.",
        prompt: "Would you administer activated charcoal?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Three hours post-ingestion is well beyond the effective window of 60 minutes. The drugs are largely absorbed into the bloodstream and charcoal offers minimal benefit while still carrying risk.",
        followUps: [
          {
            question: "Activated charcoal is most effective when given within how long after ingestion?",
            type: "dose",
            answer: "60 minutes",
            options: [
              "30 minutes",
              "60 minutes",
              "2 hours",
              "4 hours",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "epinephrine-auto-injector",
    name: "Epinephrine Auto-Injector",
    genericName: "Epinephrine 1:1,000",
    brandName: "EpiPen, EpiPen Jr, Auvi-Q",
    category: "Anaphylaxis",
    mechanism: "Acts on alpha-1 receptors (vasoconstriction, reverses hypotension), beta-1 receptors (increases heart rate and contractility), and beta-2 receptors (bronchodilation, reverses bronchospasm).",
    indications: [
      "Anaphylaxis — severe systemic allergic reaction with signs of airway compromise, respiratory distress, or cardiovascular compromise",
      "Signs include: stridor, wheezing, urticaria, angioedema, hypotension, tachycardia following allergen exposure",
    ],
    contraindications: [
      "No absolute contraindications in life-threatening anaphylaxis",
      "Use with caution in elderly patients and those with significant cardiovascular disease, but anaphylaxis is life-threatening — give it",
    ],
    dose: {
      adult: "0.3 mg IM (EpiPen — standard adult auto-injector)",
      pediatric: "0.15 mg IM (EpiPen Jr) for weight < 30 kg / < 66 lbs; some protocols use adult dose > 30 kg",
      notes: "Inject into anterolateral aspect of mid-thigh. Can inject through clothing. Massage injection site for 10 seconds. May repeat every 5–15 minutes if no improvement.",
    },
    route: ["Intramuscular (IM) — anterolateral thigh"],
    onset: "5–10 minutes for full effect; some relief within 1–2 minutes",
    duration: "15–20 minutes",
    sideEffects: [
      "Tachycardia",
      "Hypertension",
      "Anxiety, tremor",
      "Headache",
      "Pallor",
      "Palpitations",
    ],
    clinicalPearls: [
      "Can inject through clothing — do not waste time removing pants",
      "Massage injection site 10 seconds to aid absorption",
      "Anaphylaxis, not just allergic reaction — must have systemic involvement (airway, breathing, or circulation)",
      "Two-handed grip: no fingers over the tip (orange = needle end; blue = safety cap)",
      "Hold in place for 3–10 seconds after injection",
      "Repeat in 5–15 minutes if no improvement",
    ],
    scenarios: [
      {
        id: "epi-anaphylaxis-classic",
        vignette: "32-year-old, bee sting 10 minutes ago. Throat tightening, diffuse urticaria, wheezing bilaterally, BP 78/50, HR 118.",
        prompt: "Would you administer epinephrine auto-injector?",
        format: "give-withhold",
        answer: "give",
        explanation: "Classic anaphylaxis with airway involvement (throat tightening, wheezing) and cardiovascular compromise (hypotension). This is life-threatening — administer epinephrine immediately.",
        followUps: [
          {
            question: "What is the correct adult dose and injection site for the EpiPen?",
            type: "dose",
            answer: "0.3 mg IM into the anterolateral thigh",
            options: [
              "0.5 mg IM into the deltoid",
              "0.3 mg IM into the anterolateral thigh",
              "1 mg IV",
              "0.3 mg SQ into the abdomen",
            ],
          },
        ],
      },
      {
        id: "epi-mild-allergic-reaction",
        vignette: "24-year-old, bee sting, localized hives at sting site only, no throat tightness, no wheezing. BP 118/74, HR 78, SpO2 99%.",
        prompt: "Would you administer epinephrine auto-injector?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "This is a localized allergic reaction, not anaphylaxis. No systemic involvement (airway, breathing, or cardiovascular compromise). Epinephrine is not indicated — monitor and transport.",
        followUps: [
          {
            question: "Which finding would upgrade this allergic reaction to anaphylaxis requiring epinephrine?",
            type: "contraindication-check",
            answer: "Development of stridor, hypotension, or diffuse urticaria with throat tightening",
            options: [
              "Localized swelling at the sting site",
              "Development of stridor, hypotension, or diffuse urticaria with throat tightening",
              "Heart rate above 75 bpm",
              "Mild itching without other symptoms",
            ],
          },
        ],
      },
      {
        id: "epi-pediatric-dose",
        vignette: "A 7-year-old, 22 kg, severe peanut allergy reaction: stridor, generalized hives, BP 70/40. Parents have EpiPen Jr on scene.",
        prompt: "Would you administer the epinephrine auto-injector?",
        format: "give-withhold",
        answer: "give",
        explanation: "Anaphylaxis with airway compromise (stridor) and cardiovascular collapse. Administer EpiPen Jr (0.15 mg) for a child < 30 kg.",
        followUps: [
          {
            question: "Which auto-injector is appropriate for a 22 kg child?",
            type: "dose",
            answer: "EpiPen Jr (0.15 mg) — for children < 30 kg",
            options: [
              "Adult EpiPen (0.3 mg) — weight does not matter",
              "EpiPen Jr (0.15 mg) — for children < 30 kg",
              "No epinephrine — use diphenhydramine only",
              "Two EpiPen Jr doses simultaneously",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "albuterol",
    name: "Albuterol",
    genericName: "Albuterol sulfate",
    brandName: "ProAir, Ventolin, Proventil",
    category: "Respiratory",
    mechanism: "Selective beta-2 adrenergic agonist that relaxes bronchial smooth muscle, causing bronchodilation and reducing airway resistance.",
    indications: [
      "Bronchospasm from asthma exacerbation",
      "COPD exacerbation with wheezing",
      "Reversible obstructive airway disease",
      "Exercise-induced bronchospasm",
    ],
    contraindications: [
      "Hypersensitivity to albuterol",
      "Paradoxical bronchospasm (rare — stop if wheezing worsens after administration)",
      "Patient has already used maximum prescribed doses without relief (contact medical direction)",
    ],
    dose: {
      adult: "MDI: 2 puffs (90 mcg/puff = 180 mcg total) with spacer; Nebulizer: 2.5 mg in 3 mL NS",
      pediatric: "Same as adult for MDI; nebulizer 1.25–2.5 mg depending on age/weight",
      notes: "EMT assists with patient's own prescribed MDI or administers per protocol authorization. Shake MDI before use. Use spacer device when available.",
    },
    route: ["Inhaled — metered dose inhaler (MDI) or small-volume nebulizer"],
    onset: "5–15 minutes",
    duration: "4–6 hours",
    sideEffects: [
      "Tachycardia (most common)",
      "Tremor",
      "Anxiety, nervousness",
      "Hypokalemia (with repeated doses)",
      "Paradoxical bronchospasm (rare)",
    ],
    clinicalPearls: [
      "Shake the MDI canister before each use",
      "A spacer (holding chamber) significantly improves drug delivery",
      "Tachycardia is a normal side effect — do not withhold for moderate tachycardia in a hypoxic patient",
      "Failure to improve after 2 MDI treatments suggests severe exacerbation — expedite transport, consider ALS",
      "EMT may assist with patient's own prescribed inhaler, not administer a new prescription",
    ],
    scenarios: [
      {
        id: "albuterol-asthma",
        vignette: "17-year-old known asthmatic, wheezing audible across the room, RR 28, SpO2 91%, accessory muscle use. Has her own albuterol MDI with spacer.",
        prompt: "Would you assist with albuterol?",
        format: "give-withhold",
        answer: "give",
        explanation: "Moderate-severe asthma exacerbation with hypoxia (SpO2 91%). Assist with patient's own prescribed MDI — 2 puffs via spacer — and apply supplemental oxygen simultaneously.",
        followUps: [
          {
            question: "What is the correct method for MDI administration?",
            type: "route",
            answer: "Shake, exhale fully, 2 puffs via spacer, inhale slowly and hold 10 seconds",
            options: [
              "2 puffs directly into mouth without spacer, breathing normally",
              "Shake, exhale fully, 2 puffs via spacer, inhale slowly and hold 10 seconds",
              "1 puff every 30 seconds until wheezing stops",
              "4 puffs simultaneously for faster onset",
            ],
          },
        ],
      },
      {
        id: "albuterol-no-wheeze",
        vignette: "30-year-old, coughing for 2 days, SpO2 98%, lungs clear on auscultation. Asks if he can use his friend's albuterol inhaler.",
        prompt: "Would you administer albuterol?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "No bronchospasm (lungs clear, SpO2 98%, no wheezing). Also, EMT may only assist with the PATIENT'S OWN prescription, not someone else's. No indication to administer.",
        followUps: [
          {
            question: "An EMT may administer albuterol from:",
            type: "contraindication-check",
            answer: "The patient's own prescribed inhaler (or via protocol authorization)",
            options: [
              "Any albuterol inhaler on scene",
              "The patient's own prescribed inhaler (or via protocol authorization)",
              "A family member's inhaler if the patient agrees",
              "The ambulance supply regardless of prescription",
            ],
          },
        ],
      },
      {
        id: "albuterol-max-dose",
        vignette: "45-year-old COPD, severe wheezing, RR 32, SpO2 88%. Reports he has used his albuterol inhaler 10 times in the last hour with no improvement.",
        prompt: "Would you assist with another albuterol treatment?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Failure to respond after maximum doses indicates a severe exacerbation beyond BLS capability. Contact medical direction, consider ALS intercept, and transport expeditiously. Additional albuterol without medical direction is outside scope.",
        followUps: [
          {
            question: "What is the appropriate BLS action when a patient fails to respond to maximum albuterol doses?",
            type: "reassessment",
            answer: "Contact medical direction, consider ALS intercept, expedite transport",
            options: [
              "Continue giving albuterol every 5 minutes",
              "Contact medical direction, consider ALS intercept, expedite transport",
              "Switch to a different patient's inhaler",
              "Wait 30 minutes before re-assessing",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "naloxone",
    name: "Naloxone",
    genericName: "Naloxone hydrochloride",
    brandName: "Narcan, Kloxxado, Zimhi",
    category: "Neurological/Toxicology",
    mechanism: "Competitive opioid receptor antagonist that displaces opioids from mu, kappa, and delta receptors, rapidly reversing opioid-induced CNS and respiratory depression.",
    indications: [
      "Suspected opioid overdose with respiratory depression (RR < 12) or apnea",
      "Unresponsive patient with suspected opioid use (pinpoint pupils, track marks, drug paraphernalia present)",
      "Altered mental status with opioid overdose suspected",
    ],
    contraindications: [
      "No absolute contraindications in suspected opioid overdose",
      "May precipitate acute withdrawal in opioid-dependent patients (tremors, agitation, vomiting, seizures)",
      "Will not reverse non-opioid CNS depression — do not use as a diagnostic tool",
    ],
    dose: {
      adult: "Intranasal (IN): 2 mg (1 mg per nostril) using atomizer device; IM: 0.4–2 mg; may repeat every 2–3 minutes",
      pediatric: "IN: 0.1 mg/kg up to 2 mg; IM: 0.01 mg/kg up to 0.4 mg",
      notes: "OTC nasal spray (Narcan 4 mg) is a single-dose fixed formulation. Duration is 30–90 minutes — shorter than most opioids. Monitor for re-sedation.",
    },
    route: ["Intranasal (IN) — primary BLS route", "Intramuscular (IM) — if IN not available"],
    onset: "IN: 2–5 minutes; IM: 1–2 minutes",
    duration: "30–90 minutes (fentanyl may outlast naloxone)",
    sideEffects: [
      "Acute opioid withdrawal: agitation, combativeness, diaphoresis, vomiting",
      "Tachycardia, hypertension",
      "Seizures (in chronic users)",
      "Pulmonary edema (rare)",
    ],
    clinicalPearls: [
      "Airway management and ventilation FIRST — naloxone does not substitute for BVM",
      "Be prepared for a combative patient — waking from opioid OD can cause immediate aggression",
      "Re-sedation risk: fentanyl and methadone last longer than naloxone — reassess every 5 minutes",
      "Narcan does not work for benzodiazepine, alcohol, or non-opioid overdose",
      "Start with lower dose (0.4 mg) in known opioid-dependent patients to avoid precipitating severe withdrawal",
    ],
    scenarios: [
      {
        id: "naloxone-opioid-od",
        vignette: "25-year-old found unresponsive at a known drug house. Pinpoint pupils, RR 4, track marks on both arms. Drug paraphernalia visible.",
        prompt: "Would you administer naloxone?",
        format: "give-withhold",
        answer: "give",
        explanation: "Classic opioid overdose triad: unresponsive, pinpoint pupils, respiratory depression. Administer naloxone IN 2 mg after ensuring airway and initiating BVM ventilation.",
        followUps: [
          {
            question: "What is the FIRST action before administering naloxone?",
            type: "reassessment",
            answer: "Establish airway and assist ventilation with BVM",
            options: [
              "Administer naloxone immediately before anything else",
              "Establish airway and assist ventilation with BVM",
              "Obtain IV access",
              "Restrain the patient in anticipation of combativeness",
            ],
          },
        ],
      },
      {
        id: "naloxone-unknown-sedation",
        vignette: "35-year-old found unresponsive at a party after 'mixing substances.' RR 14, pupils midpoint and reactive, no drug paraphernalia visible.",
        prompt: "Would you administer naloxone?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "No clear opioid signs — pupils are midpoint (not pinpoint), RR is 14 (not severe depression), no drug evidence. Naloxone will not reverse non-opioid sedation and may cause harm. Manage airway, support ventilation, transport.",
        followUps: [
          {
            question: "Naloxone is effective for reversing which type of overdose?",
            type: "contraindication-check",
            answer: "Opioid overdose only",
            options: [
              "Benzodiazepine and opioid overdose",
              "Opioid overdose only",
              "Any CNS depressant overdose",
              "Alcohol and opioid overdose",
            ],
          },
        ],
      },
      {
        id: "naloxone-re-sedation",
        vignette: "29-year-old, naloxone given IN 20 minutes ago, woke up and was conversational. Now found becoming drowsy again with RR declining to 8.",
        prompt: "Would you administer a repeat dose of naloxone?",
        format: "give-withhold",
        answer: "give",
        explanation: "Re-sedation — the opioid (likely fentanyl) has outlasted the naloxone. Re-administer naloxone and expedite transport. Duration of naloxone is 30–90 minutes; fentanyl can last longer.",
        followUps: [
          {
            question: "Why does re-sedation occur after naloxone administration?",
            type: "reassessment",
            answer: "Naloxone's duration (30–90 min) is shorter than many opioids including fentanyl",
            options: [
              "The patient developed naloxone resistance",
              "Naloxone's duration (30–90 min) is shorter than many opioids including fentanyl",
              "The initial dose was too high and caused rebound",
              "Naloxone requires refrigeration and lost potency",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "isopropyl-alcohol",
    name: "Isopropyl Alcohol (Inhaled)",
    genericName: "Isopropyl alcohol vapor",
    brandName: "Alcohol prep pad",
    category: "Symptomatic",
    mechanism: "Exact mechanism unclear; proposed olfactory stimulation may reduce nausea perception through central pathways.",
    indications: [
      "Nausea with or without vomiting — per local protocol only",
    ],
    contraindications: [
      "No documented contraindications for brief inhalation use",
      "Protocol-dependent — not authorized in all EMS systems",
      "Do not use near open flames or oxygen delivery",
    ],
    dose: {
      adult: "Single alcohol prep pad held 1–2 cm from nose; patient takes 3 slow, deep nasal breaths",
      pediatric: "Same method; reduce exposure time",
      notes: "Temporary effect — may need to repeat. Should not delay transport or distract from treating the underlying cause of nausea.",
    },
    route: ["Inhalation — vapor"],
    onset: "1–3 minutes",
    duration: "Brief — 10–30 minutes",
    sideEffects: [
      "Mild nasal/mucosal irritation",
      "Lightheadedness (if over-used)",
    ],
    clinicalPearls: [
      "Inexpensive and readily available — every ambulance has alcohol prep pads",
      "Effect is temporary and symptomatic only — treat the underlying cause",
      "Not standard in all protocols — verify local authorization before using",
      "Keep away from oxygen delivery equipment — isopropyl alcohol is flammable",
    ],
    scenarios: [
      {
        id: "ipa-motion-sickness",
        vignette: "28-year-old, nausea from motion sickness during transport. Alert, BP 118/76, no other complaints. Protocol authorizes isopropyl alcohol for nausea.",
        prompt: "Would you use isopropyl alcohol inhalation for nausea?",
        format: "give-withhold",
        answer: "give",
        explanation: "Protocol-authorized indication. Patient is alert with nausea from a benign cause. Alcohol prep pad inhalation is a low-risk comfort measure.",
        followUps: [
          {
            question: "How is isopropyl alcohol administered for nausea?",
            type: "route",
            answer: "Alcohol prep pad held 1–2 cm from nose; patient takes 3 deep nasal breaths",
            options: [
              "Swallowed orally with water",
              "Alcohol prep pad held 1–2 cm from nose; patient takes 3 deep nasal breaths",
              "Applied to the skin on the wrist",
              "Dissolved in IV saline and administered slowly",
            ],
          },
        ],
      },
      {
        id: "ipa-not-authorized",
        vignette: "35-year-old, nausea after food poisoning. Your local protocol does not list isopropyl alcohol as an authorized BLS intervention.",
        prompt: "Would you use isopropyl alcohol inhalation for nausea?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Isopropyl alcohol inhalation is not authorized in all protocols. EMTs must operate within their local protocol — do not administer interventions outside authorized scope without medical direction.",
        followUps: [
          {
            question: "When can an EMT administer an intervention not listed in their protocol?",
            type: "contraindication-check",
            answer: "Only with online medical direction authorization",
            options: [
              "Whenever the patient requests it",
              "Only with online medical direction authorization",
              "Whenever another crew member agrees",
              "Never under any circumstances",
            ],
          },
        ],
      },
      {
        id: "ipa-nausea-cardiac",
        vignette: "58-year-old, nausea and diaphoresis, BP 98/64, HR 48. Nausea appears to be associated with bradycardia and hypotension.",
        prompt: "Would you treat the nausea with isopropyl alcohol before addressing other findings?",
        format: "give-withhold",
        answer: "withhold",
        explanation: "Nausea here is a symptom of a potentially serious cardiovascular event (hypotension, bradycardia). Treating the symptom before the cause delays critical care. Prioritize the underlying emergency.",
        followUps: [
          {
            question: "What should guide your treatment priority when nausea accompanies potentially life-threatening signs?",
            type: "reassessment",
            answer: "Treat the underlying cause first; symptomatic relief is secondary",
            options: [
              "Treat nausea first since it's the patient's chief complaint",
              "Treat the underlying cause first; symptomatic relief is secondary",
              "Administer both simultaneously",
              "Consult the patient which they want treated first",
            ],
          },
        ],
      },
    ],
  },
];
```

- [ ] **Step 2: Run data integrity tests**

```bash
npm test -- tests/lib/blsMedications.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Full test suite**

```bash
npm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/bls_medications.ts tests/lib/blsMedications.test.ts
git commit -m "feat: add BLS medications data with 9 drugs and 30 scenarios"
```

---

## Task 4: Router + nav wiring

**Files:**
- Modify: `src/router/hashRouter.ts`
- Modify: `index.html`

- [ ] **Step 1: Add `blsmeds` route to `parseHash` in `src/router/hashRouter.ts`**

Add after the `medconditions` block (around line 16):

```ts
if (parts[0] === "blsmeds") {
  return { view: "blsmeds", blsmedsTab: parts[1] || "reference" };
}
```

- [ ] **Step 2: Add `blsmeds` to `writeHash` in `src/router/hashRouter.ts`**

Add after the `medconditions` else-if (around line 30):

```ts
else if (r.view === "blsmeds") h = r.blsmedsTab && r.blsmedsTab !== "reference" ? `blsmeds/${r.blsmedsTab}` : "blsmeds";
```

- [ ] **Step 3: Add BLS Meds nav button to `index.html`**

In `index.html`, add a button to the `<nav class="topnav">` block. The current nav has: Today, Mnemonics, Medical, AI Chat. Add BLS Meds:

```html
<nav class="topnav">
  <button data-nav="home" type="button">Today</button>
  <button data-nav="mnemonics" type="button">Mnemonics</button>
  <button data-nav="medconditions" type="button">Medical</button>
  <button data-nav="blsmeds" type="button">BLS Meds</button>
  <button data-nav="chat" type="button">AI Chat</button>
</nav>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/router/hashRouter.ts index.html
git commit -m "feat: add blsmeds route and nav button"
```

---

## Task 5: BlsMedsView — shell + Reference tab

**Files:**
- Create: `src/views/BlsMedsView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write component test for Reference tab (failing)**

Create `tests/views/BlsMedsView.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/preact";
import { signal } from "@preact/signals";

vi.mock("../../src/store/appStore", async () => {
  const storage = await import("../../src/lib/storage");
  return {
    appState: signal(storage.createEmptyState()),
    route: signal({ view: "blsmeds", blsmedsTab: "reference" }),
    navigate: vi.fn(),
    save: vi.fn(),
    mutateState: vi.fn((fn: (s: ReturnType<typeof storage.createEmptyState>) => void) => {
      const s = storage.createEmptyState();
      fn(s);
    }),
    showToast: vi.fn(),
  };
});

vi.mock("../../src/data/bls_medications", () => ({
  BLS_MEDICATIONS: [
    {
      id: "aspirin",
      name: "Aspirin",
      category: "Cardiovascular",
      mechanism: "Inhibits platelet aggregation via COX inhibition.",
      indications: ["Suspected ACS"],
      contraindications: ["True aspirin allergy"],
      dose: { adult: "324 mg chewed" },
      route: ["Oral"],
      onset: "30–40 minutes",
      sideEffects: ["GI upset"],
      clinicalPearls: ["Chewed not swallowed"],
      scenarios: [
        {
          id: "asa-test-1",
          vignette: "58yo male, chest pain.",
          prompt: "Would you administer aspirin?",
          format: "give-withhold",
          answer: "give",
          explanation: "No contraindications.",
          followUps: [],
        },
        {
          id: "asa-test-2",
          vignette: "22yo, GI bleed.",
          prompt: "Would you administer aspirin?",
          format: "give-withhold",
          answer: "withhold",
          explanation: "Active GI bleed is a CI.",
          followUps: [
            {
              question: "Why is aspirin contraindicated here?",
              type: "contraindication-check",
              answer: "Worsens bleeding",
              options: ["Worsens bleeding", "Causes allergy", "Wrong dose", "Wrong route"],
            },
          ],
        },
        {
          id: "asa-test-3",
          vignette: "45yo male, stroke signs and chest pain.",
          prompt: "Would you administer aspirin?",
          format: "give-withhold",
          answer: "withhold",
          explanation: "Cannot rule out hemorrhagic stroke.",
          followUps: [],
        },
      ],
    },
    {
      id: "oxygen",
      name: "Oxygen",
      category: "Foundational",
      mechanism: "Increases FiO2.",
      indications: ["Hypoxia"],
      contraindications: ["None absolute"],
      dose: { adult: "2–15 L/min" },
      route: ["Inhalation"],
      onset: "Immediate",
      sideEffects: ["Drying mucosa"],
      clinicalPearls: ["Target SpO2 94–98%"],
      scenarios: [
        {
          id: "o2-test-1",
          vignette: "SpO2 84%.",
          prompt: "Give oxygen?",
          format: "give-withhold",
          answer: "give",
          explanation: "Hypoxic.",
          followUps: [],
        },
        {
          id: "o2-test-2",
          vignette: "SpO2 97%.",
          prompt: "Give high-flow O2?",
          format: "give-withhold",
          answer: "withhold",
          explanation: "Already normoxic.",
          followUps: [],
        },
        {
          id: "o2-test-3",
          vignette: "Unresponsive in garage.",
          prompt: "Give O2?",
          format: "give-withhold",
          answer: "give",
          explanation: "CO poisoning.",
          followUps: [],
        },
      ],
    },
  ],
}));

import { BlsMedsView } from "../../src/views/BlsMedsView";

describe("BlsMedsView — Reference tab", () => {
  it("renders the reference heading", () => {
    render(<BlsMedsView />);
    expect(screen.getByRole("heading", { name: /BLS Medications/i })).toBeTruthy();
  });

  it("renders tab buttons", () => {
    render(<BlsMedsView />);
    expect(screen.getByText("Reference")).toBeTruthy();
    expect(screen.getByText("Scenarios")).toBeTruthy();
    expect(screen.getByText("Drill")).toBeTruthy();
  });

  it("shows medication cards in reference tab", () => {
    render(<BlsMedsView />);
    expect(screen.getByText("Aspirin")).toBeTruthy();
    expect(screen.getByText("Oxygen")).toBeTruthy();
  });

  it("shows category filter chips", () => {
    render(<BlsMedsView />);
    expect(screen.getByText("All")).toBeTruthy();
    expect(screen.getByText("Cardiovascular")).toBeTruthy();
  });

  it("filter chip hides non-matching medications", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Cardiovascular"));
    expect(screen.getByText("Aspirin")).toBeTruthy();
    expect(screen.queryByText("Oxygen")).toBeNull();
  });

  it("clicking a medication card expands it to show clinical details", () => {
    render(<BlsMedsView />);
    const aspirinCard = screen.getByText("Aspirin").closest(".blsmed-card")!;
    fireEvent.click(aspirinCard);
    expect(screen.getByText("Suspected ACS")).toBeTruthy();
    expect(screen.getByText("True aspirin allergy")).toBeTruthy();
    expect(screen.getByText("324 mg chewed")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npm test -- tests/views/BlsMedsView.test.tsx
```

Expected: FAIL — "Cannot find module '../../src/views/BlsMedsView'"

- [ ] **Step 3: Implement BlsMedsView with shell and Reference tab**

Create `src/views/BlsMedsView.tsx`:

```tsx
import { useState } from "preact/hooks";
import { route, navigate } from "../store/appStore";
import { BLS_MEDICATIONS } from "../data/bls_medications";
import type { BLSMedication } from "../types";

type BlsTab = "reference" | "scenarios" | "drill";

// ─── Reference card ──────────────────────────────────────────────────────────

function MedCard({ med }: { med: BLSMedication }) {
  const [open, setOpen] = useState(false);
  return (
    <div class={`blsmed-card${open ? " expanded" : ""}`} onClick={() => setOpen((o) => !o)}>
      <div class="blsmed-card-header">
        <div class="blsmed-card-left">
          <span class="blsmed-name">{med.name}</span>
          {med.genericName && med.genericName !== med.name && (
            <span class="blsmed-generic muted">{med.genericName}</span>
          )}
        </div>
        <div class="blsmed-card-right">
          <span class="blsmed-cat-badge">{med.category}</span>
          <span class="blsmed-expand-icon">▾</span>
        </div>
      </div>
      {!open && <div class="blsmed-mechanism-preview muted">{med.mechanism}</div>}
      {open && (
        <div class="blsmed-card-body">
          <div class="blsmed-mechanism">{med.mechanism}</div>
          <div class="blsmed-section blsmed-indications">
            <div class="blsmed-section-label">Indications</div>
            <ul class="blsmed-list">{med.indications.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
          </div>
          <div class="blsmed-section blsmed-contraindications">
            <div class="blsmed-section-label">Contraindications</div>
            <ul class="blsmed-list">{med.contraindications.map((c, idx) => <li key={idx}>{c}</li>)}</ul>
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Dose</div>
            <div class="blsmed-dose-adult"><strong>Adult:</strong> {med.dose.adult}</div>
            {med.dose.pediatric && <div class="blsmed-dose-pedi muted"><strong>Pediatric:</strong> {med.dose.pediatric}</div>}
            {med.dose.notes && <div class="blsmed-dose-notes muted">{med.dose.notes}</div>}
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Route</div>
            <ul class="blsmed-list">{med.route.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Onset</div>
            <div>{med.onset}{med.duration ? ` · Duration: ${med.duration}` : ""}</div>
          </div>
          <div class="blsmed-section">
            <div class="blsmed-section-label">Side Effects</div>
            <ul class="blsmed-list">{med.sideEffects.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
          </div>
          <div class="blsmed-section blsmed-pearls">
            <div class="blsmed-section-label">Clinical Pearls</div>
            <ul class="blsmed-list">{med.clinicalPearls.map((p, idx) => <li key={idx}>{p}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reference tab ────────────────────────────────────────────────────────────

function ReferenceTab() {
  const categories = ["All", ...Array.from(new Set(BLS_MEDICATIONS.map((m) => m.category)))];
  const [activeCat, setActiveCat] = useState("All");
  const filtered = activeCat === "All" ? BLS_MEDICATIONS : BLS_MEDICATIONS.filter((m) => m.category === activeCat);
  return (
    <>
      <h1>BLS Medications</h1>
      <p class="subtitle">All BLS-scope medications with indications, contraindications, dosages, and clinical pearls.</p>
      <div class="blsmed-filter-row">
        {categories.map((cat) => (
          <button
            key={cat}
            class={`blsmed-filter-chip${cat === activeCat ? " active" : ""}`}
            type="button"
            onClick={(e) => { e.stopPropagation(); setActiveCat(cat); }}
          >{cat}</button>
        ))}
      </div>
      <div class="blsmed-card-grid">
        {filtered.map((med) => <MedCard key={med.id} med={med} />)}
      </div>
    </>
  );
}

// ─── Scenarios tab (stub — implemented in next task) ─────────────────────────

function ScenariosTab() {
  return <div class="blsmed-scenarios"><p class="muted">Scenarios loading…</p></div>;
}

// ─── Drill tab (stub — implemented in next task) ─────────────────────────────

function DrillTab() {
  return <div class="blsmed-drill"><p class="muted">Drill loading…</p></div>;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const TABS: { id: BlsTab; label: string }[] = [
  { id: "reference", label: "Reference" },
  { id: "scenarios", label: "Scenarios" },
  { id: "drill", label: "Drill" },
];

export function BlsMedsView() {
  const r = route.value as { blsmedsTab?: string };
  const tab = (r.blsmedsTab as BlsTab) ?? "reference";
  return (
    <div class="blsmed-wrap">
      <div class="blsmed-tab-strip">
        {TABS.map((t) => (
          <button
            key={t.id}
            class={`blsmed-tab-btn${tab === t.id ? " active" : ""}`}
            type="button"
            onClick={() => navigate({ view: "blsmeds", blsmedsTab: t.id })}
          >{t.label}</button>
        ))}
      </div>
      {tab === "reference" && <ReferenceTab />}
      {tab === "scenarios" && <ScenariosTab />}
      {tab === "drill" && <DrillTab />}
    </div>
  );
}
```

- [ ] **Step 4: Wire into App.tsx**

In `src/App.tsx`, add the import and VIEWS entry:

```ts
// Add import after MedConditionsView import:
import { BlsMedsView } from "./views/BlsMedsView";

// Add to VIEWS map:
blsmeds: () => <BlsMedsView />,
```

- [ ] **Step 5: Run component tests**

```bash
npm test -- tests/views/BlsMedsView.test.tsx
```

Expected: Reference tab tests pass; Scenarios and Drill tests not yet written.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Full test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/views/BlsMedsView.tsx src/App.tsx tests/views/BlsMedsView.test.tsx
git commit -m "feat: add BlsMedsView with Reference tab"
```

---

## Task 6: Scenarios tab

**Files:**
- Modify: `src/views/BlsMedsView.tsx`

- [ ] **Step 1: Add Scenarios tab tests to `tests/views/BlsMedsView.test.tsx`**

Append these tests to the existing describe block in `tests/views/BlsMedsView.test.tsx`:

```tsx
describe("BlsMedsView — Scenarios tab", () => {
  beforeEach(async () => {
    const { navigate } = await import("../../src/store/appStore");
    (navigate as ReturnType<typeof vi.fn>).mockClear();
  });

  it("shows vignette text in scenario session", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Scenarios"));
    expect(screen.getByText(/58yo male, chest pain/)).toBeTruthy();
  });

  it("shows Give and Withhold buttons for give-withhold format", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Scenarios"));
    expect(screen.getByText("Give")).toBeTruthy();
    expect(screen.getByText("Withhold")).toBeTruthy();
  });

  it("shows explanation after answering", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Scenarios"));
    fireEvent.click(screen.getByText("Give"));
    expect(screen.getByText("No contraindications.")).toBeTruthy();
  });

  it("shows correct/incorrect feedback after answering", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Scenarios"));
    fireEvent.click(screen.getByText("Withhold")); // wrong answer
    expect(screen.getByText(/Incorrect/i)).toBeTruthy();
  });

  it("shows Go Deeper button after answering when followUps exist", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Scenarios"));
    // Navigate to asa-test-2 which has a followUp
    fireEvent.click(screen.getByText("Give")); // answer first scenario
    fireEvent.click(screen.getByText("Next →")); // advance
    fireEvent.click(screen.getByText("Withhold")); // answer second (withhold)
    expect(screen.getByText("Go Deeper →")).toBeTruthy();
  });

  it("shows followUp question in deep mode", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Scenarios"));
    fireEvent.click(screen.getByText("Give"));
    fireEvent.click(screen.getByText("Next →"));
    fireEvent.click(screen.getByText("Withhold"));
    fireEvent.click(screen.getByText("Go Deeper →"));
    expect(screen.getByText("Why is aspirin contraindicated here?")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npm test -- tests/views/BlsMedsView.test.tsx
```

Expected: new Scenarios tests FAIL.

- [ ] **Step 3: Replace the `ScenariosTab` stub with full implementation**

Replace the `ScenariosTab` function in `src/views/BlsMedsView.tsx`:

```tsx
import { appState, mutateState, save } from "../store/appStore";
import { defaultRecord, grade } from "../lib/emsSrs";
import type { BLSScenario, BLSFollowUp, SRSRecord } from "../types";

// Add this near the top of the file, after imports:
// (move the existing imports to the top, keep them together)

function buildScenarioQueue() {
  const srsStore = appState.value.blsMedsSrs ?? {};
  const now = Date.now();
  const all: Array<{ scenario: BLSScenario; medId: string; rec: SRSRecord }> = [];
  for (const med of BLS_MEDICATIONS) {
    for (const s of med.scenarios) {
      const key = `blsmed::${med.id}::${s.id}`;
      const rec = srsStore[key] ?? defaultRecord();
      all.push({ scenario: s, medId: med.id, rec });
    }
  }
  const due = all.filter((x) => x.rec.due && x.rec.due <= now).sort((a, b) => a.rec.due - b.rec.due);
  const fresh = all.filter((x) => !x.rec.due || x.rec.due === 0);
  const upcoming = all.filter((x) => x.rec.due && x.rec.due > now).sort((a, b) => a.rec.due - b.rec.due);
  return [...due, ...fresh, ...upcoming].slice(0, 10);
}

function ScenariosTab() {
  const [queue] = useState(() => buildScenarioQueue());
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [deepMode, setDeepMode] = useState(false);
  const [followUpIdx, setFollowUpIdx] = useState(0);
  const [followUpAnswered, setFollowUpAnswered] = useState(false);
  const [followUpSelected, setFollowUpSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  if (done || queue.length === 0) {
    const pct = queue.length > 0 ? Math.round((correct / Math.min(idx, queue.length)) * 100) : 0;
    return (
      <div class="blsmed-scenarios-done">
        <div class="blsmed-done-score">{pct}%</div>
        <div class="blsmed-done-detail">{correct} / {Math.min(idx, queue.length)} correct</div>
        <button class="btn btn-primary" type="button" onClick={() => navigate({ view: "blsmeds", blsmedsTab: "reference" })}>
          ← Back to Reference
        </button>
      </div>
    );
  }

  const { scenario, medId, rec } = queue[idx];
  const isCorrect = answered && selectedAnswer === scenario.answer;
  const hasFollowUps = scenario.followUps.length > 0;
  const currentFollowUp: BLSFollowUp | undefined = scenario.followUps[followUpIdx];

  function chooseAnswer(ans: string) {
    if (answered) return;
    setAnswered(true);
    setSelectedAnswer(ans);
    const correct_ = ans === scenario.answer;
    if (correct_) setCorrect((c) => c + 1);
    const key = `blsmed::${medId}::${scenario.id}`;
    const updated = grade(rec, correct_ ? "good" : "again");
    mutateState((draft) => {
      if (!draft.blsMedsSrs) draft.blsMedsSrs = {};
      draft.blsMedsSrs[key] = updated;
      if (!draft.drills.blsmedsquiz) draft.drills.blsmedsquiz = { scenariosCompleted: 0, lastSessionAt: null };
      draft.drills.blsmedsquiz.scenariosCompleted += 1;
      draft.drills.blsmedsquiz.lastSessionAt = new Date().toISOString();
    });
    save();
  }

  function advance() {
    if (idx + 1 >= queue.length) setDone(true);
    else {
      setIdx((i) => i + 1);
      setAnswered(false);
      setSelectedAnswer(null);
      setDeepMode(false);
      setFollowUpIdx(0);
      setFollowUpAnswered(false);
      setFollowUpSelected(null);
    }
  }

  function goDeeper() {
    setDeepMode(true);
  }

  function chooseFollowUp(opt: string) {
    if (followUpAnswered) return;
    setFollowUpAnswered(true);
    setFollowUpSelected(opt);
  }

  function nextFollowUp() {
    if (followUpIdx + 1 >= scenario.followUps.length) {
      setDeepMode(false);
      advance();
    } else {
      setFollowUpIdx((i) => i + 1);
      setFollowUpAnswered(false);
      setFollowUpSelected(null);
    }
  }

  return (
    <div class="blsmed-scenarios">
      <div class="blsmed-scenarios-header">
        <span class="blsmed-progress">{idx + 1} / {queue.length}</span>
        <span class="blsmed-score muted">{correct} correct</span>
      </div>
      {!deepMode ? (
        <div class="blsmed-scenario-card">
          <div class="blsmed-vignette">{scenario.vignette}</div>
          <div class="blsmed-prompt">{scenario.prompt}</div>
          {!answered && scenario.format === "give-withhold" && (
            <div class="blsmed-gw-row">
              <button class="btn btn-primary" type="button" onClick={() => chooseAnswer("give")}>Give</button>
              <button class="btn btn-danger" type="button" onClick={() => chooseAnswer("withhold")}>Withhold</button>
            </div>
          )}
          {answered && (
            <>
              <div class={`blsmed-feedback ${isCorrect ? "blsmed-feedback-correct" : "blsmed-feedback-wrong"}`}>
                {isCorrect ? "Correct!" : `Incorrect — answer is ${scenario.answer.charAt(0).toUpperCase() + scenario.answer.slice(1)}`}
              </div>
              <div class="blsmed-explanation muted">{scenario.explanation}</div>
              <div class="blsmed-actions">
                {hasFollowUps && <button class="btn" type="button" onClick={goDeeper}>Go Deeper →</button>}
                <button class="btn btn-primary" type="button" onClick={advance}>Next →</button>
              </div>
            </>
          )}
        </div>
      ) : (
        currentFollowUp && (
          <div class="blsmed-followup-card">
            <div class="blsmed-followup-label muted">Deep Mode — Follow-up</div>
            <div class="blsmed-followup-question">{currentFollowUp.question}</div>
            <div class="blsmed-followup-options">
              {currentFollowUp.options.map((opt) => (
                <button
                  key={opt}
                  class={`blsmed-option btn${
                    followUpAnswered && opt === currentFollowUp.answer
                      ? " correct"
                      : followUpAnswered && opt === followUpSelected && opt !== currentFollowUp.answer
                      ? " wrong"
                      : ""
                  }`}
                  type="button"
                  disabled={followUpAnswered}
                  onClick={() => chooseFollowUp(opt)}
                >{opt}</button>
              ))}
            </div>
            {followUpAnswered && (
              <button class="btn btn-primary" type="button" onClick={nextFollowUp}>Next →</button>
            )}
          </div>
        )
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run Scenarios tests**

```bash
npm test -- tests/views/BlsMedsView.test.tsx
```

Expected: all tests pass including new Scenarios tests.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Full suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/views/BlsMedsView.tsx tests/views/BlsMedsView.test.tsx
git commit -m "feat: implement Scenarios tab with fast and deep mode"
```

---

## Task 7: Drill tab

**Files:**
- Modify: `src/views/BlsMedsView.tsx`

- [ ] **Step 1: Add Drill tab tests to `tests/views/BlsMedsView.test.tsx`**

Append to the existing test file:

```tsx
describe("BlsMedsView — Drill tab", () => {
  it("shows drug name on card front in drill tab", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Drill"));
    expect(screen.getByText("Aspirin")).toBeTruthy();
  });

  it("shows Reveal button on card front", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Drill"));
    expect(screen.getByText("Reveal")).toBeTruthy();
  });

  it("shows grade buttons after reveal", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Drill"));
    fireEvent.click(screen.getByText("Reveal"));
    expect(screen.getByText("Again")).toBeTruthy();
    expect(screen.getByText("Good")).toBeTruthy();
  });

  it("shows medication indications on card back", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Drill"));
    fireEvent.click(screen.getByText("Reveal"));
    expect(screen.getByText("Suspected ACS")).toBeTruthy();
  });

  it("reverse mode toggle changes card front to show indication", () => {
    render(<BlsMedsView />);
    fireEvent.click(screen.getByText("Drill"));
    fireEvent.click(screen.getByText("Reverse"));
    // In reverse mode, front shows an indication/contraindication
    const card = document.querySelector(".blsmed-drill-card-front");
    expect(card).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npm test -- tests/views/BlsMedsView.test.tsx
```

Expected: Drill tab tests FAIL.

- [ ] **Step 3: Replace DrillTab stub with full implementation**

Replace the `DrillTab` function stub in `src/views/BlsMedsView.tsx`:

```tsx
function DrillTab() {
  const srsStore = appState.value.blsMedsSrs ?? {};
  const now = Date.now();
  const [reverse, setReverse] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const due = BLS_MEDICATIONS
    .filter((m) => { const r = srsStore[`blsmed::${m.id}`]; return r && r.due <= now; })
    .sort((a, b) => (srsStore[`blsmed::${a.id}`]?.due ?? 0) - (srsStore[`blsmed::${b.id}`]?.due ?? 0));

  const fresh = BLS_MEDICATIONS.filter((m) => !srsStore[`blsmed::${m.id}`]);

  const initialQueue = [...due, ...fresh];
  const [queue] = useState(initialQueue);
  const [idx, setIdx] = useState(0);

  const dueCount = BLS_MEDICATIONS.filter((m) => {
    const r = srsStore[`blsmed::${m.id}`];
    return !r || r.due <= now;
  }).length;

  if (done || queue.length === 0) {
    return (
      <div class="blsmed-drill-done">
        <div class="big">✓</div>
        <p>{queue.length === 0 ? "All caught up! Check back later." : "Session complete!"}</p>
        <button class="btn" type="button" onClick={() => navigate({ view: "blsmeds", blsmedsTab: "reference" })}>
          ← Back to Reference
        </button>
      </div>
    );
  }

  const med = queue[idx];
  const recKey = `blsmed::${med.id}`;
  const rec = srsStore[recKey] ?? defaultRecord();

  function applyGrade(g: "again" | "hard" | "good" | "easy") {
    const updated = grade(rec, g);
    mutateState((draft) => {
      if (!draft.blsMedsSrs) draft.blsMedsSrs = {};
      draft.blsMedsSrs[recKey] = updated;
    });
    save();
    if (g === "again") {
      // do not advance — card will resurface at end of queue
    }
    if (idx + 1 >= queue.length) setDone(true);
    else {
      setIdx((i) => i + 1);
      setRevealed(false);
    }
  }

  const reverseClue = med.indications[0] ?? med.contraindications[0];

  return (
    <div class="blsmed-drill">
      <div class="blsmed-drill-header">
        <span class="blsmed-drill-counter">{queue.length - idx} card{queue.length - idx === 1 ? "" : "s"} remaining</span>
        <span class="blsmed-due-count muted">{dueCount} due</span>
        <button
          class={`blsmed-reverse-btn btn${reverse ? " active" : ""}`}
          type="button"
          onClick={() => { setReverse((r) => !r); setRevealed(false); }}
        >Reverse</button>
      </div>
      <div class="blsmed-drill-card">
        <div class="blsmed-drill-card-front">
          {!reverse ? (
            <>
              <div class="blsmed-drill-name">{med.name}</div>
              <div class="blsmed-drill-cat muted">{med.category}</div>
            </>
          ) : (
            <>
              <div class="blsmed-drill-reverse-prompt muted">Which drug?</div>
              <div class="blsmed-drill-clue">{reverseClue}</div>
            </>
          )}
        </div>
        {revealed && (
          <div class="blsmed-drill-card-back">
            {!reverse ? (
              <>
                <div class="blsmed-section">
                  <div class="blsmed-section-label">Indications</div>
                  <ul class="blsmed-list">{med.indications.map((i, n) => <li key={n}>{i}</li>)}</ul>
                </div>
                <div class="blsmed-section">
                  <div class="blsmed-section-label">Contraindications</div>
                  <ul class="blsmed-list">{med.contraindications.map((c, n) => <li key={n}>{c}</li>)}</ul>
                </div>
                <div class="blsmed-section">
                  <strong>Dose:</strong> {med.dose.adult}
                </div>
                <div class="blsmed-section">
                  <strong>Route:</strong> {med.route.join(", ")}
                </div>
                <div class="blsmed-section blsmed-pearls">
                  <div class="blsmed-section-label">Clinical Pearls</div>
                  <ul class="blsmed-list">{med.clinicalPearls.map((p, n) => <li key={n}>{p}</li>)}</ul>
                </div>
              </>
            ) : (
              <div class="blsmed-drill-answer">
                <strong>{med.name}</strong>
                <div class="muted">{med.category}</div>
              </div>
            )}
          </div>
        )}
        {!revealed ? (
          <button class="btn btn-primary" type="button" onClick={() => setRevealed(true)}>Reveal</button>
        ) : (
          <div class="blsmed-grade-row">
            {(["again", "hard", "good", "easy"] as const).map((g, i) => (
              <button
                key={g}
                class={`btn ${i === 0 ? "btn-danger" : i === 2 ? "btn-primary" : ""}`}
                type="button"
                onClick={() => applyGrade(g)}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

Also update the tab label to show due count — replace the Drill tab button in the `TABS` render (inside `BlsMedsView`) with a dynamic label. Replace the TABS map render in `BlsMedsView`:

```tsx
export function BlsMedsView() {
  const r = route.value as { blsmedsTab?: string };
  const tab = (r.blsmedsTab as BlsTab) ?? "reference";
  const srsStore = appState.value.blsMedsSrs ?? {};
  const now = Date.now();
  const drillDue = BLS_MEDICATIONS.filter((m) => {
    const rec = srsStore[`blsmed::${m.id}`];
    return !rec || rec.due <= now;
  }).length;

  return (
    <div class="blsmed-wrap">
      <div class="blsmed-tab-strip">
        {TABS.map((t) => (
          <button
            key={t.id}
            class={`blsmed-tab-btn${tab === t.id ? " active" : ""}`}
            type="button"
            onClick={() => navigate({ view: "blsmeds", blsmedsTab: t.id })}
          >
            {t.id === "drill" && drillDue > 0 ? `Drill (${drillDue})` : t.label}
          </button>
        ))}
      </div>
      {tab === "reference" && <ReferenceTab />}
      {tab === "scenarios" && <ScenariosTab />}
      {tab === "drill" && <DrillTab />}
    </div>
  );
}
```

- [ ] **Step 4: Run all BlsMedsView tests**

```bash
npm test -- tests/views/BlsMedsView.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Full suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/views/BlsMedsView.tsx tests/views/BlsMedsView.test.tsx
git commit -m "feat: implement Drill tab with SRS and reverse mode"
```

---

## Task 8: Achievements

**Files:**
- Modify: `src/lib/achievements.ts`

- [ ] **Step 1: Add achievement tests to `tests/lib/achievements.test.ts`**

Append to the existing describe/check block:

```ts
it("unlocks blsmeds_first_scenario after first scenario completed", () => {
  const state = createEmptyState();
  (state.drills as Record<string, unknown>)["blsmedsquiz"] = { scenariosCompleted: 1, lastSessionAt: new Date().toISOString() };
  expect(check(state).some((a) => a.id === "blsmeds_first_scenario")).toBe(true);
});

it("does not unlock blsmeds_first_scenario with zero scenarios", () => {
  const state = createEmptyState();
  expect(check(state).some((a) => a.id === "blsmeds_first_scenario")).toBe(false);
});

it("unlocks blsmeds_all_drilled when all 9 meds have SRS records with reps >= 1", () => {
  const state = createEmptyState();
  const ids = ["oxygen", "aspirin", "nitroglycerin", "oral-glucose", "activated-charcoal", "epinephrine-auto-injector", "albuterol", "naloxone", "isopropyl-alcohol"];
  for (const id of ids) {
    state.blsMedsSrs[`blsmed::${id}`] = { ease: 2.5, interval: 1, reps: 1, due: Date.now() + 86400000, lastGrade: "good", lapses: 0, lastReviewed: new Date().toISOString() };
  }
  expect(check(state).some((a) => a.id === "blsmeds_all_drilled")).toBe(true);
});

it("does not unlock blsmeds_all_drilled when only 8 meds drilled", () => {
  const state = createEmptyState();
  const ids = ["oxygen", "aspirin", "nitroglycerin", "oral-glucose", "activated-charcoal", "epinephrine-auto-injector", "albuterol", "naloxone"];
  for (const id of ids) {
    state.blsMedsSrs[`blsmed::${id}`] = { ease: 2.5, interval: 1, reps: 1, due: Date.now() + 86400000, lastGrade: "good", lapses: 0, lastReviewed: new Date().toISOString() };
  }
  expect(check(state).some((a) => a.id === "blsmeds_all_drilled")).toBe(false);
});
```

- [ ] **Step 2: Run to confirm new achievement tests fail**

```bash
npm test -- tests/lib/achievements.test.ts
```

Expected: new tests FAIL.

- [ ] **Step 3: Add achievements to `src/lib/achievements.ts`**

Add to the `DEFS` array, after the `med_quiz_ace` entry:

```ts
{
  id: "blsmeds_first_scenario",
  name: "First Dose",
  desc: "Complete your first BLS medication scenario",
  icon: "💊",
  check: (s) => ((s.drills as unknown as Record<string, { scenariosCompleted?: number }>)["blsmedsquiz"]?.scenariosCompleted ?? 0) >= 1,
},
{
  id: "blsmeds_all_drilled",
  name: "Pharmacist",
  desc: "Review all 9 BLS medications in the Drill tab at least once",
  icon: "🧪",
  check: (s) => {
    const ids = ["oxygen", "aspirin", "nitroglycerin", "oral-glucose", "activated-charcoal", "epinephrine-auto-injector", "albuterol", "naloxone", "isopropyl-alcohol"];
    return ids.every((id) => {
      const rec = (s.blsMedsSrs ?? {})[`blsmed::${id}`];
      return rec && rec.reps >= 1;
    });
  },
},
```

- [ ] **Step 4: Run achievement tests**

```bash
npm test -- tests/lib/achievements.test.ts
```

Expected: all tests pass including new ones.

- [ ] **Step 5: Full suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/achievements.ts tests/lib/achievements.test.ts
git commit -m "feat: add BLS meds achievements (First Dose, Pharmacist)"
```

---

## Task 9: E2E test

**Files:**
- Create: `tests/e2e/blsmeds.spec.js`

- [ ] **Step 1: Write the E2E test**

Create `tests/e2e/blsmeds.spec.js`:

```js
import { test, expect } from "@playwright/test";

test.describe("BLS Medications", () => {
  test("BLS Meds nav button is visible in topnav", async ({ page }) => {
    await page.goto(".");
    const btn = page.locator(".topnav button", { hasText: "BLS Meds" });
    await expect(btn).toBeVisible();
  });

  test("clicking BLS Meds nav navigates to blsmeds view", async ({ page }) => {
    await page.goto(".");
    await page.locator(".topnav button", { hasText: "BLS Meds" }).click();
    await expect(page).toHaveURL(/#blsmeds/);
    await expect(page.locator("h1")).toContainText("BLS Medications");
  });

  test("reference tab shows medication cards", async ({ page }) => {
    await page.goto("./#blsmeds");
    await expect(page.locator(".blsmed-card").first()).toBeVisible();
    const count = await page.locator(".blsmed-card").count();
    expect(count).toBe(9);
  });

  test("filter chip reduces visible medications", async ({ page }) => {
    await page.goto("./#blsmeds");
    await expect(page.locator(".blsmed-card").first()).toBeVisible();
    const allCount = await page.locator(".blsmed-card").count();
    await page.locator(".blsmed-filter-chip", { hasText: "Cardiovascular" }).click();
    const filteredCount = await page.locator(".blsmed-card").count();
    expect(filteredCount).toBeLessThan(allCount);
  });

  test("clicking a medication card expands to show indications", async ({ page }) => {
    await page.goto("./#blsmeds");
    const firstCard = page.locator(".blsmed-card").first();
    await firstCard.click();
    await expect(firstCard.locator(".blsmed-indications")).toBeVisible();
  });

  test("scenarios tab shows a vignette", async ({ page }) => {
    await page.goto("./#blsmeds/scenarios");
    await expect(page.locator(".blsmed-vignette")).toBeVisible();
  });

  test("scenarios tab: answering shows explanation", async ({ page }) => {
    await page.goto("./#blsmeds/scenarios");
    await expect(page.locator(".blsmed-vignette")).toBeVisible();
    const giveBtn = page.locator(".blsmed-gw-row .btn", { hasText: "Give" });
    const withholdBtn = page.locator(".blsmed-gw-row .btn", { hasText: "Withhold" });
    // Click whichever button is available
    if (await giveBtn.isVisible()) {
      await giveBtn.click();
    } else {
      await withholdBtn.click();
    }
    await expect(page.locator(".blsmed-explanation")).toBeVisible();
  });

  test("drill tab shows medication name card", async ({ page }) => {
    await page.goto("./#blsmeds/drill");
    await expect(page.locator(".blsmed-drill-card")).toBeVisible();
    await expect(page.locator(".blsmed-drill-name, .blsmed-drill-clue").first()).toBeVisible();
  });

  test("drill tab: reveal shows grade buttons", async ({ page }) => {
    await page.goto("./#blsmeds/drill");
    await page.locator("button", { hasText: "Reveal" }).click();
    await expect(page.locator("button", { hasText: "Again" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Good" })).toBeVisible();
  });

  test("deep-link to #blsmeds/scenarios loads scenarios tab directly", async ({ page }) => {
    await page.goto("./#blsmeds/scenarios");
    const activeTab = page.locator(".blsmed-tab-btn.active");
    await expect(activeTab).toContainText("Scenarios");
  });

  test("deep-link to #blsmeds/drill loads drill tab directly", async ({ page }) => {
    await page.goto("./#blsmeds/drill");
    const activeTab = page.locator(".blsmed-tab-btn.active");
    await expect(activeTab).toContainText("Drill");
  });
});
```

- [ ] **Step 2: Start the dev server (in a separate terminal) and run E2E tests**

Start dev server:
```bash
npm run dev
```

Run E2E (in another terminal):
```bash
npm run test:e2e:browser -- tests/e2e/blsmeds.spec.js
```

Expected: all E2E tests pass.

- [ ] **Step 3: Full unit test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/blsmeds.spec.js
git commit -m "test: add E2E tests for BLS medications view"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 9 medications with all required fields (Task 3)
- ✅ Reference tab: browse, filter by category, expandable cards (Task 5)
- ✅ Scenarios tab: fast mode give/withhold + pick-drug (Task 6)
- ✅ Deep mode follow-up questions (Task 6)
- ✅ SRS scheduling in scenarios (Task 6 — `grade()` called on answer)
- ✅ Drill tab: SRS flashcards (Task 7)
- ✅ Drill tab: reverse mode (Task 7)
- ✅ Due count on Drill tab label (Task 7)
- ✅ `#blsmeds` routing (Task 4)
- ✅ Nav button (Task 4)
- ✅ `blsMedsSrs` persists to localStorage (Task 1 — storage.ts merge)
- ✅ 2 achievements (Task 8)
- ✅ Data integrity tests (Task 2–3)
- ✅ Component tests (Tasks 5–7)
- ✅ E2E (Task 9)

**Type consistency check:**
- `BLSMedication` defined in Task 1 types, used in Task 3 data and Task 5 view ✅
- `BLSScenario.followUps` array of `BLSFollowUp` — `followUpIdx` indexes into it ✅
- SRS key format `blsmed::<medId>` in Drill; `blsmed::<medId>::<scenarioId>` in Scenarios — these are intentionally distinct ✅
- `grade()` from `emsSrs.ts` — imported in Task 6 Scenarios, Task 7 Drill ✅
- `defaultRecord()` from `emsSrs.ts` — used in both ✅
- Achievement checks reference `s.blsMedsSrs` which is initialized in Task 1 ✅

**No placeholders:** Confirmed — all code blocks are complete.
