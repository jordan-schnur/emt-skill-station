import type { MedicationDosage } from "../types";

// Source: AAOS Emergency Care, Table 12-4 "EMT Medication Overview".
// Used by the time-based dosage flashcard quiz (Reference → Meds → Dosages).
const ADMINISTERED = "Medications EMTs Administer or May Assist in Administering";
const OTC = "Common Over-the-Counter Medications";

export const MEDICATION_DOSAGES: MedicationDosage[] = [
  {
    id: "aspirin",
    name: "Aspirin (Bayer)",
    section: ADMINISTERED,
    adultDose: "160 to 325 mg (chewable tablets for chest pain)",
    route: "PO",
    indication: "Chest pain of cardiac origin; mild pain, headache, fever",
  },
  {
    id: "ipratropium-albuterol",
    name: "Ipratropium [Atrovent], Albuterol [Proventil, Ventolin]",
    section: ADMINISTERED,
    adultDose: "1 to 2 inhalations; wait 5 minutes before repeating",
    route: "Inhalation",
    indication: "Asthma / difficulty breathing with wheezing",
  },
  {
    id: "epinephrine",
    name: "Epinephrine (EpiPen)",
    section: ADMINISTERED,
    adultDose: "0.3 mg (adult); 0.15 mg (children)",
    route: "IM",
    indication: "Anaphylactic reaction",
  },
  {
    id: "naloxone",
    name: "Naloxone (Narcan, EVZIO auto-injector)",
    section: ADMINISTERED,
    adultDose: "2 mg IN or IM auto-injector",
    route: "IM, IN",
    indication: "Opioid poisoning",
  },
  {
    id: "nitroglycerin",
    name: "Nitroglycerin (Nitrostat, Nitromist)",
    section: ADMINISTERED,
    adultDose: "0.3 to 0.4 mg SL; 0.4 mg spray",
    route: "SL tablet or spray",
    indication: "Chest pain of cardiac origin",
  },
  {
    id: "oral-glucose",
    name: "Oral Glucose (Glutose)",
    section: ADMINISTERED,
    adultDose: "1/2 to 1 tube",
    route: "PO",
    indication: "Low blood glucose (hypoglycemia)",
  },
  {
    id: "oxygen",
    name: "Oxygen (no trade name)",
    section: ADMINISTERED,
    adultDose: "28% to 100% via oxygen delivery devices",
    route: "Inhalation",
    indication: "Hypoxia or suspected hypoxia",
  },
  {
    id: "acetaminophen",
    name: "Acetaminophen (Tylenol)",
    section: OTC,
    adultDose: "500 to 1,000 mg every 4 hours as needed (peds weight-based)",
    route: "PO",
    indication: "Mild pain or fever, headache, muscle aches",
  },
  {
    id: "diphenhydramine",
    name: "Diphenhydramine (Benadryl)",
    section: OTC,
    adultDose: "25 to 50 mg",
    route: "PO",
    indication: "Mild allergic reactions",
  },
  {
    id: "ibuprofen",
    name: "Ibuprofen (Advil, Motrin, Nuprin)",
    section: OTC,
    adultDose: "200 to 400 mg every 4 to 6 hours (peds weight-based)",
    route: "PO",
    indication: "Mild pain or fever, headache, muscle aches",
  },
];
