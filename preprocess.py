"""
NREMT Psychomotor Skill Sheet preprocessor.

Reads the 10 NREMT skill-sheet PDFs in this folder, validates the canonical
structured data below against the actual PDF text, and writes:

    data.json   - structured data consumed by the website
    js/data.js  - same data exported as `window.NREMT_DATA` so the site
                  works when opened directly from the file system (file://)

Why the structured data is hard-coded:
    The PDFs are formatted as tables with nested sub-points and multi-column
    layout. Automatic extraction works for simple sheets but mangles text on
    a few (e.g. the trauma assessment's "Head" row). Hard-coding preserves
    EXACT NREMT wording, which is a hard requirement for studying.

The script still does real PDF work:
    - Opens every referenced PDF and pulls full text via pdfplumber.
    - Verifies that every step's text appears in its PDF (sanity check).
    - Auto-extracts the critical-criteria block from each PDF.

Run:
    python3 preprocess.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.stderr.write("pdfplumber is required. Install: pip install pdfplumber\n")
    sys.exit(1)


HERE = Path(__file__).parent.resolve()
SCRIPTS_CACHE_FILE = HERE / "spoken_scripts_cache.json"


# ---------------------------------------------------------------------------
# Canonical skill-sheet data
# ---------------------------------------------------------------------------
# Each step record:
#   {"text": "...", "points": <int>, "substeps": [...optional]}
# Section records group steps under a heading. `header=False` is used for the
# very first PPE row which appears before any section header in the PDFs.

SHEETS = [
    {
        "id": "e201",
        "title": "Patient Assessment / Management – Trauma",
        "shortTitle": "Trauma Assessment",
        "category": "Patient Assessment",
        "totalPoints": 42,
        "timeLimit": "10 minutes",
        "sections": [
            {
                "name": "PPE",
                "header": False,
                "steps": [
                    {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
                ],
            },
            {
                "name": "SCENE SIZE-UP",
                "header": True,
                "steps": [
                    {"text": "Determines the scene/situation is safe", "points": 1},
                    {"text": "Determines the mechanism of injury/nature of illness", "points": 1},
                    {"text": "Determines the number of patients", "points": 1},
                    {"text": "Requests additional EMS assistance if necessary", "points": 1},
                    {"text": "Considers stabilization of the spine", "points": 1},
                ],
            },
            {
                "name": "PRIMARY SURVEY/RESUSCITATION",
                "header": True,
                "steps": [
                    {"text": "Verbalizes general impression of the patient", "points": 1},
                    {"text": "Determines responsiveness/level of consciousness", "points": 1},
                    {"text": "Determines chief complaint/apparent life-threats", "points": 1},
                    {
                        "text": "Airway",
                        "points": 2,
                        "substeps": [
                            {"text": "Opens and assesses airway", "points": 1},
                            {"text": "Inserts adjunct as indicated", "points": 1},
                        ],
                    },
                    {
                        "text": "Breathing",
                        "points": 4,
                        "substeps": [
                            {"text": "Assess breathing", "points": 1},
                            {"text": "Assures adequate ventilation", "points": 1},
                            {"text": "Initiates appropriate oxygen therapy", "points": 1},
                            {"text": "Manages any injury which may compromise breathing/ventilation", "points": 1},
                        ],
                    },
                    {
                        "text": "Circulation",
                        "points": 4,
                        "substeps": [
                            {"text": "Checks pulse", "points": 1},
                            {"text": "Assess skin [either skin color, temperature or condition]", "points": 1},
                            {"text": "Assesses for and controls major bleeding if present", "points": 1},
                            {"text": "Initiates shock management [positions patient properly, conserves body heat]", "points": 1},
                        ],
                    },
                    {"text": "Identifies patient priority and makes treatment/transport decision (based upon calculated GCS)", "points": 1},
                ],
            },
            {
                "name": "HISTORY TAKING",
                "header": True,
                "steps": [
                    {"text": "Obtains baseline vital signs [must include BP, P and R]", "points": 1},
                    {"text": "Attempts to obtain SAMPLE history", "points": 1},
                ],
            },
            {
                "name": "SECONDARY ASSESSMENT",
                "header": True,
                "steps": [
                    {
                        "text": "Head",
                        "points": 3,
                        "substeps": [
                            {"text": "Inspects and palpates scalp and ears", "points": 1},
                            {"text": "Assesses eyes", "points": 1},
                            {"text": "Inspects mouth, nose and assesses facial area", "points": 1},
                        ],
                    },
                    {
                        "text": "Neck",
                        "points": 3,
                        "substeps": [
                            {"text": "Checks position of trachea", "points": 1},
                            {"text": "Checks jugular veins", "points": 1},
                            {"text": "Palpates cervical spine", "points": 1},
                        ],
                    },
                    {
                        "text": "Chest",
                        "points": 3,
                        "substeps": [
                            {"text": "Inspects chest", "points": 1},
                            {"text": "Palpates chest", "points": 1},
                            {"text": "Auscultates chest", "points": 1},
                        ],
                    },
                    {
                        "text": "Abdomen/pelvis",
                        "points": 3,
                        "substeps": [
                            {"text": "Inspects and palpates abdomen", "points": 1},
                            {"text": "Assesses pelvis", "points": 1},
                            {"text": "Verbalizes assessment of genitalia/perineum as needed", "points": 1},
                        ],
                    },
                    {
                        "text": "Lower extremities",
                        "points": 2,
                        "substeps": [
                            {"text": "Inspects, palpates and assesses motor, sensory and distal circulatory functions (1 point/leg)", "points": 2},
                        ],
                    },
                    {
                        "text": "Upper extremities",
                        "points": 2,
                        "substeps": [
                            {"text": "Inspects, palpates and assesses motor, sensory and distal circulatory functions (1 point/arm)", "points": 2},
                        ],
                    },
                    {
                        "text": "Posterior thorax, lumbar and buttocks",
                        "points": 2,
                        "substeps": [
                            {"text": "Inspects and palpates posterior thorax", "points": 1},
                            {"text": "Inspects and palpates lumbar and buttocks areas", "points": 1},
                        ],
                    },
                    {"text": "Manages secondary injuries and wounds appropriately", "points": 1},
                ],
            },
            {
                "name": "REASSESSMENT",
                "header": True,
                "steps": [
                    {"text": "Demonstrates how and when to reassess the patient", "points": 1},
                ],
            },
        ],
    },
    {
        "id": "e202",
        "title": "Patient Assessment / Management – Medical",
        "shortTitle": "Medical Assessment",
        "category": "Patient Assessment",
        "totalPoints": 42,
        "timeLimit": "15 minutes",
        "sections": [
            {"name": "PPE", "header": False, "steps": [
                {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
            ]},
            {"name": "SCENE SIZE-UP", "header": True, "steps": [
                {"text": "Determines the scene/situation is safe", "points": 1},
                {"text": "Determines the mechanism of injury/nature of illness", "points": 1},
                {"text": "Determines the number of patients", "points": 1},
                {"text": "Requests additional EMS assistance if necessary", "points": 1},
                {"text": "Considers stabilization of the spine", "points": 1},
            ]},
            {"name": "PRIMARY SURVEY/RESUSCITATION", "header": True, "steps": [
                {"text": "Verbalizes the general impression of the patient", "points": 1},
                {"text": "Determines responsiveness/level of consciousness (AVPU)", "points": 1},
                {"text": "Determines chief complaint/apparent life-threats", "points": 1},
                {
                    "text": "Assesses airway and breathing",
                    "points": 3,
                    "substeps": [
                        {"text": "Assessment", "points": 1},
                        {"text": "Assures adequate ventilation", "points": 1},
                        {"text": "Initiates appropriate oxygen therapy", "points": 1},
                    ],
                },
                {
                    "text": "Assesses circulation",
                    "points": 3,
                    "substeps": [
                        {"text": "Assesses/controls major bleeding", "points": 1},
                        {"text": "Checks pulse", "points": 1},
                        {"text": "Assesses skin [either skin color, temperature or condition]", "points": 1},
                    ],
                },
                {"text": "Identifies patient priority and makes treatment/transport decision", "points": 1},
            ]},
            {"name": "HISTORY TAKING", "header": True, "steps": [
                {
                    "text": "History of the present illness",
                    "points": 8,
                    "mnemonic": "OPQRST",
                    "substeps": [
                        {"text": "Onset", "points": 1},
                        {"text": "Provocation", "points": 1},
                        {"text": "Quality", "points": 1},
                        {"text": "Radiation", "points": 1},
                        {"text": "Severity", "points": 1},
                        {"text": "Time", "points": 1},
                        {"text": "Clarifying questions of associated signs and symptoms related to OPQRST", "points": 2},
                    ],
                },
                {
                    "text": "Past medical history",
                    "points": 5,
                    "mnemonic": "SAMPLE (already covers chief complaint via OPQRST)",
                    "substeps": [
                        {"text": "Allergies", "points": 1},
                        {"text": "Medications", "points": 1},
                        {"text": "Past pertinent history", "points": 1},
                        {"text": "Last oral intake", "points": 1},
                        {"text": "Events leading to present illness", "points": 1},
                    ],
                },
            ]},
            {"name": "SECONDARY ASSESSMENT", "header": True, "steps": [
                {
                    "text": "Assesses affected body part/system",
                    "points": 5,
                    "note": "Eight possible systems listed on the sheet: Cardiovascular, Neurological, Integumentary, Reproductive, Pulmonary, Musculoskeletal, GI/GU, Psychological/Social. Maximum 5 points, awarded for the systems relevant to the chief complaint.",
                },
            ]},
            {"name": "VITAL SIGNS", "header": True, "steps": [
                {"text": "Blood pressure", "points": 1},
                {"text": "Pulse", "points": 1},
                {"text": "Respiratory rate and quality (1 point each)", "points": 2},
                {"text": "States field impression of patient", "points": 1},
                {"text": "Interventions [verbalizes proper interventions/treatment]", "points": 1},
            ]},
            {"name": "REASSESSMENT", "header": True, "steps": [
                {"text": "Demonstrates how and when to reassess the patient to determine changes in condition", "points": 1},
                {"text": "Provides accurate verbal report to arriving EMS unit", "points": 1},
            ]},
        ],
    },
    {
        "id": "e203",
        "title": "BVM Ventilation of an Apneic Adult Patient",
        "shortTitle": "BVM Ventilation",
        "category": "Airway / Ventilation",
        "totalPoints": 16,
        "timeLimit": None,
        "sections": [
            {"name": "Sequence", "header": False, "steps": [
                {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
                {"text": "Checks responsiveness", "points": 1},
                {"text": "Requests additional EMS assistance", "points": 1},
                {"text": "Checks breathing and pulse simultaneously", "points": 1, "examinerNote": "After checking responsiveness, then checking breathing and pulse for no more than 10 seconds, examiner informs candidate, “The patient is unresponsive, apneic and has a weak pulse of 60.”"},
                {"text": "Opens airway properly", "points": 1, "examinerNote": "The examiner must now inform the candidate, “The mouth is full of secretions and vomitus.”"},
                {"text": "Prepares rigid suction catheter", "points": 1},
                {"text": "Turns on power to suction device or retrieves manual suction device", "points": 1},
                {"text": "Inserts rigid suction catheter without applying suction", "points": 1},
                {"text": "Suctions the mouth and oropharynx", "points": 1, "examinerNote": "The examiner must now inform the candidate, “The mouth and oropharynx are clear.”"},
                {"text": "Opens the airway manually", "points": 1},
                {"text": "Inserts oropharyngeal airway", "points": 1, "examinerNote": "The examiner must now inform the candidate, “No gag reflex is present and the patient accepts the airway adjunct.”"},
                {"text": "Ventilates the patient immediately using a BVM device unattached to oxygen", "points": 1, "note": "Award this point if candidate elects to ventilate initially with BVM attached to reservoir and oxygen so long as first ventilation is delivered within 30 seconds.", "examinerNote": "The examiner must now inform the candidate that ventilation is being properly performed without difficulty."},
                {"text": "Re-checks pulse for no more than 10 seconds", "points": 1},
                {"text": "Attaches the BVM assembly [mask, bag, reservoir] to oxygen [15 L/minute]", "points": 1},
                {
                    "text": "Ventilates the patient adequately",
                    "points": 2,
                    "substeps": [
                        {"text": "Proper volume to cause visible chest rise", "points": 1},
                        {"text": "Proper rate [10 – 12/minute (1 ventilation every 5 – 6 seconds)]", "points": 1},
                    ],
                    "examinerNote": "The examiner must now ask the candidate, “How would you know if you are delivering appropriate volumes with each ventilation?”",
                },
            ]},
        ],
    },
    {
        "id": "e204",
        "title": "Oxygen Administration by Non-Rebreather Mask",
        "shortTitle": "O2 by NRB",
        "category": "Airway / Ventilation",
        "totalPoints": 11,
        "timeLimit": None,
        "sections": [
            {"name": "Sequence", "header": False, "steps": [
                {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
                {"text": "Gathers appropriate equipment", "points": 1},
                {"text": "Cracks valve on the oxygen tank", "points": 1},
                {"text": "Assembles the regulator to the oxygen tank", "points": 1},
                {"text": "Opens the oxygen tank valve", "points": 1},
                {"text": "Checks oxygen tank pressure", "points": 1},
                {"text": "Checks for leaks", "points": 1},
                {"text": "Attaches non-rebreather mask to correct port of regulator", "points": 1},
                {"text": "Turns on oxygen flow to prefill reservoir bag", "points": 1},
                {"text": "Adjusts regulator to assure oxygen flow rate of at least 10 L/minute", "points": 1},
                {"text": "Attaches mask to patient’s face and adjusts to fit snugly", "points": 1},
            ]},
        ],
    },
    {
        "id": "e211",
        "title": "Spinal Immobilization (Seated Patient)",
        "shortTitle": "Spinal – Seated",
        "category": "Trauma / Immobilization",
        "totalPoints": 12,
        "timeLimit": None,
        "sections": [
            {"name": "Sequence", "header": False, "steps": [
                {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
                {"text": "Directs assistant to place/maintain head in the neutral, in-line position", "points": 1},
                {"text": "Directs assistant to maintain manual stabilization of the head", "points": 1},
                {"text": "Reassesses motor, sensory and circulatory functions in each extremity", "points": 1},
                {"text": "Applies appropriately sized extrication collar", "points": 1},
                {"text": "Positions the immobilization device behind the patient", "points": 1},
                {"text": "Secures the device to the patient’s torso", "points": 1},
                {"text": "Evaluates torso fixation and adjusts as necessary", "points": 1},
                {"text": "Evaluates and pads behind the patient’s head as necessary", "points": 1},
                {"text": "Secures the patient’s head to the device", "points": 1},
                {"text": "Verbalizes moving the patient to a long backboard", "points": 1},
                {"text": "Reassesses motor, sensory and circulatory function in each extremity", "points": 1},
            ]},
        ],
    },
    {
        "id": "e212",
        "title": "Spinal Immobilization (Supine Patient)",
        "shortTitle": "Spinal – Supine",
        "category": "Trauma / Immobilization",
        "totalPoints": 14,
        "timeLimit": None,
        "sections": [
            {"name": "Sequence", "header": False, "steps": [
                {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
                {"text": "Directs assistant to place/maintain head in the neutral, in-line position", "points": 1},
                {"text": "Directs assistant to maintain manual stabilization of the head", "points": 1},
                {"text": "Reassesses motor, sensory and circulatory function in each extremity", "points": 1},
                {"text": "Applies appropriately sized extrication collar", "points": 1},
                {"text": "Positions the immobilization device appropriately", "points": 1},
                {"text": "Directs movement of the patient onto the device without compromising the integrity of the spine", "points": 1},
                {"text": "Applies padding to void between the torso and the device as necessary", "points": 1},
                {"text": "Immobilizes the patient’s torso to the device", "points": 1},
                {"text": "Evaluates and pads behind the patient’s head as necessary", "points": 1},
                {"text": "Immobilizes the patient’s head to the device", "points": 1},
                {"text": "Secures the patient’s legs to the device", "points": 1},
                {"text": "Secures the patient’s arms to the device", "points": 1},
                {"text": "Reassesses motor, sensory and circulatory function in each extremity", "points": 1},
            ]},
        ],
    },
    {
        "id": "e213",
        "title": "Bleeding Control / Shock Management",
        "shortTitle": "Bleeding & Shock",
        "category": "Trauma / Circulation",
        "totalPoints": 7,
        "timeLimit": None,
        "sections": [
            {"name": "Sequence", "header": False, "steps": [
                {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
                {"text": "Applies direct pressure to the wound", "points": 1, "examinerNote": "The examiner must now inform candidate that the wound continues to bleed."},
                {"text": "Applies tourniquet", "points": 1, "examinerNote": "The examiner must now inform candidate that the patient is exhibiting signs and symptoms of hypoperfusion."},
                {"text": "Properly positions the patient", "points": 1},
                {"text": "Administers high concentration oxygen", "points": 1},
                {"text": "Initiates steps to prevent heat loss from the patient", "points": 1},
                {"text": "Indicates the need for immediate transportation", "points": 1},
            ]},
        ],
    },
    {
        "id": "e215",
        "title": "Cardiac Arrest Management / AED",
        "shortTitle": "Cardiac Arrest / AED",
        "category": "Cardiac",
        "totalPoints": 17,
        "timeLimit": None,
        "sections": [
            {"name": "Sequence", "header": False, "steps": [
                {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
                {"text": "Determines the scene/situation is safe", "points": 1},
                {"text": "Checks patient responsiveness", "points": 1},
                {"text": "Direct assistant to retrieve AED", "points": 1},
                {"text": "Requests additional EMS assistance", "points": 1},
                {"text": "Checks breathing and pulse simultaneously", "points": 1, "examinerNote": "After checking responsiveness, then checking breathing and pulse for no more than 10 seconds, examiner informs candidate, “The patient is unresponsive, apneic and pulseless.”"},
                {"text": "Immediately begins chest compressions [adequate depth and rate; allows the chest to recoil completely]", "points": 1},
                {
                    "text": "Performs 2 minutes of high-quality, 1-rescuer adult CPR",
                    "points": 5,
                    "substeps": [
                        {"text": "Adequate depth and rate", "points": 1},
                        {"text": "Correct compression-to-ventilation ratio", "points": 1},
                        {"text": "Allows the chest to recoil completely", "points": 1},
                        {"text": "Adequate volumes for each breath", "points": 1},
                        {"text": "Minimal interruptions of no more than 10 seconds throughout", "points": 1},
                    ],
                    "examinerNote": "After 2 minutes (5 cycles), candidate assesses patient and second rescuer resumes compressions while candidate operates AED.",
                },
                {"text": "Turns on power to AED", "points": 1},
                {"text": "Follows prompts and correctly attaches AED to patient", "points": 1},
                {"text": "Stops CPR and ensures all individuals are clear of the patient during rhythm analysis", "points": 1},
                {"text": "Ensures that all individuals are clear of the patient and delivers shock from AED", "points": 1},
                {"text": "Immediately directs rescuer to resume chest compressions", "points": 1},
            ]},
        ],
    },
    {
        "id": "e216",
        "title": "Joint Immobilization",
        "shortTitle": "Joint Immobilization",
        "category": "Trauma / Immobilization",
        "totalPoints": 9,
        "timeLimit": None,
        "sections": [
            {"name": "Sequence", "header": False, "steps": [
                {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
                {"text": "Directs application of manual stabilization of the injury", "points": 1},
                {"text": "Assesses distal motor, sensory and circulatory functions in the injured extremity", "points": 1, "examinerNote": "The examiner acknowledges, “Motor, sensory and circulatory functions are present and normal.”"},
                {"text": "Selects the proper splinting material", "points": 1},
                {"text": "Immobilizes the site of the injury", "points": 1},
                {"text": "Immobilizes the bone above the injury site", "points": 1},
                {"text": "Immobilizes the bone below the injury site", "points": 1},
                {"text": "Secures the entire injured extremity", "points": 1},
                {"text": "Reassesses distal motor, sensory and circulatory functions in the injured extremity", "points": 1, "examinerNote": "The examiner acknowledges, “Motor, sensory and circulatory functions are present and normal.”"},
            ]},
        ],
    },
    {
        "id": "e217",
        "title": "Long Bone Immobilization",
        "shortTitle": "Long Bone Immobilization",
        "category": "Trauma / Immobilization",
        "totalPoints": 10,
        "timeLimit": None,
        "sections": [
            {"name": "Sequence", "header": False, "steps": [
                {"text": "Takes or verbalizes appropriate PPE precautions", "points": 1},
                {"text": "Directs application of manual stabilization of the injury", "points": 1},
                {"text": "Assesses distal motor, sensory and circulatory functions in the injured extremity", "points": 1, "examinerNote": "The examiner acknowledges, “Motor, sensory and circulatory functions are present and normal.”"},
                {"text": "Measures the splint", "points": 1},
                {"text": "Applies the splint", "points": 1},
                {"text": "Immobilizes the joint above the injury site", "points": 1},
                {"text": "Immobilizes the joint below the injury site", "points": 1},
                {"text": "Secures the entire injured extremity", "points": 1},
                {"text": "Immobilizes the hand/foot in the position of function", "points": 1},
                {"text": "Reassesses distal motor, sensory and circulatory functions in the injured extremity", "points": 1, "examinerNote": "The examiner acknowledges, “Motor, sensory and circulatory functions are present and normal.”"},
            ]},
        ],
    },
]


# ---------------------------------------------------------------------------
# PDF helpers
# ---------------------------------------------------------------------------

def _pdf_path(sheet_id: str) -> Path:
    return HERE / f"{sheet_id.upper()}_NREMT.pdf"


def extract_pdf_text(sheet_id: str) -> str:
    path = _pdf_path(sheet_id)
    with pdfplumber.open(path) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages)


def extract_critical_criteria(pdf_text: str) -> list[str]:
    """Pull the critical-criteria bullets out of the raw PDF text."""
    # The block begins after "CRITICAL CRITERIA" (or CRITICALCRITERIA on E202)
    # and runs until the rationale-documentation sentence.
    start = re.search(r"CRITICAL\s*CRITERIA", pdf_text, re.IGNORECASE)
    if not start:
        return []
    tail = pdf_text[start.end():]
    end = re.search(r"You must factually document", tail)
    if end:
        tail = tail[: end.start()]
    items: list[str] = []
    current = ""
    for raw in tail.splitlines():
        line = raw.strip()
        if not line:
            if current:
                items.append(_clean(current))
                current = ""
            continue
        # New bullets start with "____" placeholders for the checkbox
        if line.startswith("_"):
            if current:
                items.append(_clean(current))
            current = line.lstrip("_ ").strip()
        else:
            current += " " + line
    if current:
        items.append(_clean(current))
    return [i for i in items if i]


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _walk_steps(sections):
    """Yield every step text we expect to appear in the PDF."""
    for section in sections:
        for step in section["steps"]:
            yield step["text"]
            for sub in step.get("substeps", []) or []:
                yield sub["text"]


_NON_LETTERS = re.compile(r"[^a-z]")

def _fingerprint(text: str) -> str:
    """Lowercase letters only — survives PDF column-splitting like 'ob tain'."""
    return _NON_LETTERS.sub("", text.lower())


def _validate(sheet: dict, pdf_text: str) -> list[str]:
    """Return step-text fragments whose letter-fingerprint is NOT in the PDF."""
    pdf_print = _fingerprint(pdf_text)
    missing = []
    for text in _walk_steps(sheet["sections"]):
        fp = _fingerprint(text)[:40]  # first ~40 letters is plenty unique
        if fp and fp not in pdf_print:
            missing.append(text)
    return missing


# ---------------------------------------------------------------------------
# Card generation (flat list for the SRS to schedule)
# ---------------------------------------------------------------------------

def build_cards(sheet: dict) -> list[dict]:
    cards = []
    for section in sheet["sections"]:
        steps = section["steps"]
        for step_idx, step in enumerate(steps):
            substeps = step.get("substeps") or []
            if substeps:
                for sub_idx, sub in enumerate(substeps):
                    cards.append({
                        "id": f"{sheet['id']}::{section['name']}::{step_idx}::{sub_idx}",
                        "sheetId": sheet["id"],
                        "section": section["name"],
                        "sectionHeader": section["header"],
                        "parent": step["text"],
                        "stepIndex": step_idx,
                        "subIndex": sub_idx,
                        "text": sub["text"],
                        "points": sub["points"],
                    })
            else:
                cards.append({
                    "id": f"{sheet['id']}::{section['name']}::{step_idx}",
                    "sheetId": sheet["id"],
                    "section": section["name"],
                    "sectionHeader": section["header"],
                    "parent": None,
                    "stepIndex": step_idx,
                    "subIndex": None,
                    "text": step["text"],
                    "points": step["points"],
                })
    return cards


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    """Normalize curly/smart quotes to ASCII so cache lookups are robust."""
    return text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')


def _load_scripts_cache() -> dict[str, str]:
    try:
        raw = json.loads(SCRIPTS_CACHE_FILE.read_text())
        # Re-key with normalized text so lookups always work
        return {_normalize(k): v for k, v in raw.items()}
    except FileNotFoundError:
        return {}


def _collect_step_texts(sheets: list[dict]) -> list[str]:
    texts: list[str] = []
    for sheet in sheets:
        for section in sheet["sections"]:
            for step in section["steps"]:
                texts.append(step["text"])
    return texts


def generate_spoken_scripts(sheets: list[dict], service) -> None:
    """Generate spokenScript fields on all steps via LLM; updates sheets in-place."""
    cache = _load_scripts_cache()
    all_texts = _collect_step_texts(sheets)
    uncached = [t for t in all_texts if _normalize(t) not in cache]

    if uncached:
        prompt = (
            "You are writing exactly what an EMT-Basic candidate says aloud during the NREMT psychomotor exam.\n\n"
            "NREMT exam conventions — follow these precisely:\n"
            "1. SCENE SIZE-UP steps (scene safety, MOI/NOI, number of patients, need for additional EMS): "
            "the candidate asks the EXAMINER directly, as a short question. No 'I am' prefix.\n"
            "   Examples: 'Is the scene safe?' | 'What is the mechanism of injury?' | 'How many patients do we have?'\n"
            "2. ACTION steps (applying PPE, inserting airway, applying pressure, etc.): "
            "brief first-person narration of the action.\n"
            "   Examples: 'I'm putting on gloves and eye protection.' | 'I'm applying direct pressure to the wound.'\n"
            "3. ASSESSMENT steps (checking pulse, airway, breathing, etc.): "
            "state what you're doing and verbalize the assumed-normal finding.\n"
            "   Examples: 'I'm checking the radial pulse — rate and quality are within normal limits.' | "
            "'Airway is open and clear.'\n"
            "4. PATIENT HISTORY steps (chief complaint, SAMPLE, OPQRST): "
            "ask the patient directly.\n"
            "   Examples: 'What brings you here today?' | 'Do you have any allergies?'\n"
            "5. VERBALIZATION/DECISION steps (field impression, transport decision, etc.): "
            "state your finding or decision aloud to the examiner.\n"
            "   Examples: 'Based on my assessment, this patient is a high priority — I'm initiating rapid transport.'\n\n"
            "Keep each verbalization to 1–2 sentences. Use natural exam room language.\n"
            "Return ONLY a valid JSON object mapping each step text to its verbalization.\n\n"
            "Steps:\n"
            + json.dumps(uncached, ensure_ascii=False)
        )
        print(f"  Calling LLM for {len(uncached)} uncached steps…")
        raw = service.generate(prompt)
        # Strip markdown code fences if the model wrapped the JSON
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        try:
            new_scripts: dict[str, str] = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            sys.stderr.write(f"LLM returned invalid JSON: {exc}\nRaw:\n{raw[:500]}\n")
            sys.exit(1)
        # Store normalized keys in cache
        cache.update({_normalize(k): v for k, v in new_scripts.items()})
        SCRIPTS_CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False))
        print(f"  Cached {len(new_scripts)} new scripts → {SCRIPTS_CACHE_FILE.name}")

    for sheet in sheets:
        for section in sheet["sections"]:
            for step in section["steps"]:
                key = _normalize(step["text"])
                if key in cache:
                    step["spokenScript"] = cache[key]


def main() -> int:
    parser = argparse.ArgumentParser(description="NREMT skill-sheet preprocessor")
    parser.add_argument(
        "--generate-scripts",
        action="store_true",
        help="Call LLM API to generate spokenScript fields for every step",
    )
    args = parser.parse_args()

    out_sheets = []
    total_cards = 0
    problems = []

    for sheet in SHEETS:
        sheet_id = sheet["id"]
        pdf_path = _pdf_path(sheet_id)
        if not pdf_path.exists():
            problems.append(f"PDF missing: {pdf_path.name}")
            continue

        text = extract_pdf_text(sheet_id)
        missing = _validate(sheet, text)
        if missing:
            problems.append(
                f"{sheet_id}: {len(missing)} step text(s) not found in PDF:\n    - "
                + "\n    - ".join(missing)
            )

        criteria = extract_critical_criteria(text)
        cards = build_cards(sheet)
        total_cards += len(cards)

        out_sheets.append({
            **sheet,
            "criticalCriteria": criteria,
            "cards": cards,
        })
        print(f"✓ {sheet_id}  steps={len(cards):3d}  critical={len(criteria):2d}  total_pts={sheet['totalPoints']}")

    if problems:
        print("\n--- WARNINGS ---")
        for p in problems:
            print(p)

    # Apply spoken scripts: generate new ones if requested, otherwise load cache
    if args.generate_scripts:
        from llm_service import get_llm_service
        service = get_llm_service()
        generate_spoken_scripts(out_sheets, service)
    else:
        cache = _load_scripts_cache()
        if cache:
            for sheet in out_sheets:
                for section in sheet["sections"]:
                    for step in section["steps"]:
                        key = _normalize(step["text"])
                        if key in cache:
                            step["spokenScript"] = cache[key]

    data = {
        "version": 1,
        "totalCards": total_cards,
        "sheets": out_sheets,
    }

    json_path = HERE / "data.json"
    js_path = HERE / "js" / "data.js"
    js_path.parent.mkdir(parents=True, exist_ok=True)

    json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    js_payload = "window.NREMT_DATA = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n"
    js_path.write_text(js_payload)

    print(f"\nWrote {json_path}")
    print(f"Wrote {js_path}")
    print(f"Total flashcards: {total_cards}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
