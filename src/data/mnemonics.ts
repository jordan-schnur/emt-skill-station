import type { MnemonicData } from "../types";

// Inline data from js/mnemonics.js (small enough to include directly).
// This removes the dependency on window.NREMT_MNEMONICS for typed imports.
export const NREMT_MNEMONICS: Record<string, MnemonicData> = {
  "e201": {
    sections: "Smart Paramedics Handle Serious Refugees",
    steps: {
      "SCENE SIZE-UP": "Safe Medics Number Extra Spines",
      "PRIMARY SURVEY/RESUSCITATION": "GoodRacers Crash Into Big Concrete Tracks",
      "HISTORY TAKING": "Vitals Snag Samples",
      "SECONDARY ASSESSMENT": "Hairy Necks Crush Awful Lazy Apes Picking Wounds",
    },
  },
  "e202": {
    sections: "Some Paramedics Have Sharp Vision Regularly.",
    steps: {
      "SCENE SIZE-UP": "Safe Medics Count Extra Spines",
      "PRIMARY SURVEY/RESUSCITATION": "Good Looks Cause Awesome Cardiac Priorities",
      "HISTORY TAKING": "Help People.",
      "VITAL SIGNS": "Big Pythons Roar For Insects",
      "REASSESSMENT": "Recheck Reveals, Radio Relays.",
    },
  },
  "e203": {
    sections: undefined,
    steps: { "Sequence": "Proper Rescuers Call Before Opening Suction Power Inserting Suction Openings Inserting Bag Pulses Oxygen Ventilate" },
  },
  "e204": {
    sections: undefined,
    steps: { "Sequence": "PPE Gathers Cracked Assemblies, Open Pressure Leaks; Attach, Prefill, Flow, Fit." },
  },
  "e211": {
    sections: undefined,
    steps: { "Sequence": "PPE Now Holds Motion, Collars Position Torso, Evaluate Pads, Head Moves Motion." },
  },
  "e212": {
    sections: undefined,
    steps: { "Sequence": "PPE Heads Hold Motor Collars Position Move Pad Torso Head-pad Head Legs Arms Recheck" },
  },
  "e213": {
    sections: undefined,
    steps: { "Sequence": "Patients Don't Tolerate Pain, Oxygen Helps Heal Truly" },
  },
  "e215": {
    sections: undefined,
    steps: { "Sequence": "Pretty Safe Rescuers Always Request Backup, Pumping Chests Powerfully Attaches Pads, Clearing Shocks, Continuing." },
  },
  "e216": {
    sections: undefined,
    steps: { "Sequence": "PPE Made Sam Pick Splints In Both Bones, Securing Reassessment." },
  },
  "e217": {
    sections: undefined,
    steps: { "Sequence": "PPE Does Measure And Apply Above Below Secure Functioning Reassess." },
  },
};
