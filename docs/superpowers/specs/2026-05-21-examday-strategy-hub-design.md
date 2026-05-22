# Exam Day Strategy Hub — Design Spec

**Date:** 2026-05-21
**Branch:** issue-8-sheet-card-mastery-badges (implementation will be on its own branch)

---

## Problem

The app teaches step sequences well but contains no content about the meta-strategy of the actual NREMT psychomotor exam. A user preparing for the exam has no in-app guidance on:

- How to open every station (the Big 5)
- How to interpret a vague dispatch
- How to read the equipment in the room to identify the scenario
- The importance of verbalizing everything
- The PA-specific single-scenario format and the list of possible scenarios
- The hospital transport question at the end
- The retry policy

The examiner chat mode also starts unrealistically — no dispatch, no equipment context, no Big 5 gate.

---

## Goals

1. Add a dedicated **Exam Day** page that surfaces examiner-sourced strategy tips.
2. Turn that page into a **scenario hub** that maps each of the 10 PA scenarios to its practice sheet (or a "coming soon" placeholder).
3. **Enhance the examiner chat system prompt** to simulate a realistic exam opening: vague dispatch, equipment hint, Big 5 gate, and hospital question at the end.
4. **File GitHub issues** for the four missing scenario sheets (CPAP, 12-lead, Suction, Vitals).

---

## Out of scope

- Interactive Big 5 checklist with persisted state (Approach C — deferred)
- Actually implementing the missing scenario sheets (tracked via GitHub issues)
- Any new app state keys or schema changes

---

## Architecture

### 1. New route: `#examday`

- Add `"examday"` to the `Route["view"]` union in `src/types/index.ts`.
- Add `ExamDayView` to the `VIEWS` map in `src/App.tsx`.
- Add a `<button data-nav="examday">Exam Day</button>` to the `.topbar-menu-pop` dropdown in `index.html` (alongside the existing Guide and Stats entries).

### 2. `src/views/ExamDayView.tsx`

A pure render component — no state, no signals. Sections (in order):

#### Dispatch strategy
> "Dispatches are vague — write down what you hear immediately."

Tips:
- Listen for age, chief complaint, and mechanism.
- Don't assume the scenario from the dispatch alone.
- Note-taking on arrival is expected and professional.

#### Read the room
> "Equipment in the room is a clue — look before you approach."

- The equipment set up in the station often signals the scenario type.
- Example: CPAP mask + O2 cylinder → CPAP station. BP cuff + stethoscope → Vitals.
- Do a quick visual scan before beginning.

#### The Big 5
Always verbalize these before beginning any skill. Displayed as five numbered cards:

1. **Scene safe?** — "Is the scene safe to enter?"
2. **BSI** — "I am taking BSI precautions." (gloves, eye protection as appropriate)
3. **Number of patients** — "I see one patient."
4. **MOI / NOI** — "Mechanism of injury is…" / "Nature of illness is…"
5. **Additional resources** — "Do I need additional resources?"

Skipping these in the real exam is an automatic flag; the examiner notes every verbalization.

#### During the station
- Talk to the patient. Talk to family members. Announce every action to the examiner.
- Request all information — vital signs, patient history, allergies.
- The examiner can only score what they **hear**. Silence = not done.

#### Wrap-up: hospital transport question
- At the end of the station the examiner may ask: "Where would you transport this patient?"
- Know your regional trauma center vs. stroke center vs. STEMI center criteria.
- If unsure, say "the nearest appropriate facility" and briefly justify.

#### Logistics / retry policy
- In Pennsylvania the exam uses a **single-scenario format** (not the older multi-station rotation).
- You can often **retry the same night** if you fail — ask the examiner immediately after the debrief.
- Don't leave the testing site before asking.

#### Possible scenarios (PA format)
A grid of scenario cards. Each card shows:
- Scenario name
- Equipment you'd see in the room (visual cue)
- A "Practice →" link to the skill sheet if one exists, or a "Coming soon" badge

| Scenario | Equipment hint | Sheet |
|---|---|---|
| O2 Administration | Non-rebreather mask, O2 cylinder, regulator | e204 → linked |
| CPR / AED | AED, CPR barrier, gloves | e215 → linked |
| Tourniquet / Bleeding Control | Tourniquet, trauma dressings, gloves | e213 → linked |
| Joint Immobilization | SAM splints, padding, bandaging | e216 → linked |
| Long Bone Immobilization | Traction splint or board splints | e217 → linked |
| OPA / BVM Ventilation | BVM, OPA set, O2 | e203 → linked |
| CPAP | CPAP mask, manometer, O2 source | Coming soon |
| 12-Lead ECG | 12-lead monitor, leads, electrodes | Coming soon |
| Suction | Suction unit, yankauer catheter | Coming soon |
| Vitals (Pulse, BP, RR) | BP cuff, stethoscope, watch | Coming soon |

"Coming soon" cards link to the corresponding GitHub issue.

---

### 3. Enhanced examiner system prompt (`src/lib/chat.ts`)

Update `buildSystemPrompt` for `mode === "examiner"`. The prompt gains four new behaviors:

#### a) Vague dispatch opening
The AI's first message opens with a dispatch matching the sheet's clinical context. A `SHEET_DISPATCH` constant in `chat.ts` maps sheet IDs to dispatch phrases:

```ts
const SHEET_DISPATCH: Record<string, string> = {
  e201: "Dispatch: Respond to a 28-year-old male, reported fall from a ladder. Scene is secure.",
  e202: "Dispatch: Respond to a 67-year-old female, difficulty breathing. Scene is secure.",
  e203: "Dispatch: Respond to an unresponsive adult, bystander CPR in progress. Scene is secure.",
  e204: "Dispatch: Respond to a 72-year-old male, shortness of breath. Scene is secure.",
  e211: "Dispatch: Respond to a 45-year-old female, MVC — ambulatory at scene. Scene is secure.",
  e212: "Dispatch: Respond to a 33-year-old male, MVC — found supine. Scene is secure.",
  e213: "Dispatch: Respond to a 19-year-old male, laceration to the thigh. Scene is secure.",
  e215: "Dispatch: Respond to a 58-year-old male, found unresponsive. Scene is secure.",
  e216: "Dispatch: Respond to a 40-year-old female, twisted ankle. Scene is secure.",
  e217: "Dispatch: Respond to a 25-year-old male, reported arm injury. Scene is secure.",
};
```

If no sheet is selected, a generic dispatch is used.

#### b) Equipment hint
After the dispatch, the AI describes what's visible in the station room. A separate `SHEET_EQUIPMENT` constant in `chat.ts` maps each sheet ID to a one-sentence room description (e.g., `e204: "You notice a non-rebreather mask and O2 cylinder set up in the room."`). The examiner AI is instructed to open with both the dispatch and the equipment hint before waiting for the candidate.

#### c) Big 5 gate
The system prompt instructs the examiner AI: before evaluating any skill steps, confirm the candidate has addressed the Big 5 (scene safety, BSI, patient count, MOI/NOI, additional resources). If the candidate skips them and jumps to treatment, the examiner responds:
> "You've entered the scene. What do you want to establish before approaching the patient?"

#### d) Hospital question at close
After the final debrief, the examiner asks:
> "Where would you transport this patient, and why?"

The examiner accepts any reasonable answer that names a facility type and justifies it.

#### e) Retry framing in debrief
If any critical criteria were missed, the debrief ends with:
> "You may request a re-attempt from the testing coordinator."

---

### 4. GitHub Issues

Four issues filed, one per missing scenario:

1. **Add CPAP scenario skill sheet** — Equipment: CPAP mask, manometer, O2 source. Needs: source NREMT CPAP skill sheet PDF, add steps to `preprocess.py`.
2. **Add 12-Lead ECG skill sheet** — Equipment: 12-lead monitor, leads, electrodes.
3. **Add Suction skill sheet** — Equipment: suction unit, rigid yankauer catheter.
4. **Add Vitals skill sheet (Pulse, BP, RR)** — Equipment: BP cuff, stethoscope, watch.

Each issue references this spec and the `ExamDayView` "Coming soon" cards.

---

## Files changed

| File | Change |
|---|---|
| `src/views/ExamDayView.tsx` | New file |
| `src/App.tsx` | Add `ExamDayView` to `VIEWS` map |
| `src/types/index.ts` | Add `"examday"` to route view union |
| `index.html` | Add "Exam Day" button to `.topbar-menu-pop` dropdown |
| `src/lib/chat.ts` | Add dispatch map, update `buildSystemPrompt` for examiner mode |
| `src/views/GuideView.tsx` | Add link to new Exam Day page |
| GitHub | File 4 issues |

---

## Testing

- `npm test` — existing tests must pass; no new state = no new unit tests required for the view itself
- `npx tsc --noEmit` — type-check the new route union and view
- Manual: verify all 6 linked scenario cards navigate to the correct sheet; verify 4 "Coming soon" cards render without crashing
- Manual: open an examiner chat on a sheet — confirm dispatch message appears first, Big 5 gate triggers if skipped, hospital question appears in debrief
- `npm run test:e2e:browser` — E2E must pass; add a smoke test for `#examday` route
