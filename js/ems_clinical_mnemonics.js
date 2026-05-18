/**
 * ems_clinical_mnemonics.js – EMS clinical mnemonics and acronyms reference data.
 *
 * Sets window.EMS_CLINICAL_MNEMONICS = [ { id, acronym, title, category, note, letters: [...] } ]
 *
 * This is separate from js/mnemonics.js, which holds auto-generated psychomotor
 * skill-sheet section/step mnemonics. This file covers the clinical assessment
 * and treatment acronyms used throughout EMS practice.
 *
 * Extensibility: other reference libraries (BLS diagnoses, medications, etc.) should
 * follow the same shape so they can reuse renderReferenceLibrary() in views.js.
 */
(function (global) {
  global.EMS_CLINICAL_MNEMONICS = [

    // ── Patient Assessment ────────────────────────────────────────────────

    {
      id: "sample",
      acronym: "SAMPLE",
      title: "Medical History",
      category: "Patient Assessment",
      note: null,
      letters: [
        { letter: "S", stand: "Signs and Symptoms", detail: "Current chief complaint and all associated symptoms the patient is experiencing." },
        { letter: "A", stand: "Allergies", detail: "Drug, food, and environmental allergies; ask what reaction occurs." },
        { letter: "M", stand: "Medications", detail: "Prescription, OTC, herbals, and supplements; include dose and frequency." },
        { letter: "P", stand: "Pertinent Past Medical History", detail: "Relevant prior illnesses, surgeries, hospitalizations, or similar episodes." },
        { letter: "L", stand: "Last Oral Intake", detail: "When and what did the patient last eat or drink? Critical before sedation or surgery." },
        { letter: "E", stand: "Events Leading Up", detail: "What was the patient doing when symptoms began? Any precipitating activity or stress." },
      ],
    },

    {
      id: "opqrst",
      acronym: "OPQRST",
      title: "Pain / Symptom Characterization",
      category: "Patient Assessment",
      note: null,
      letters: [
        { letter: "O", stand: "Onset", detail: "When did it start? Was it sudden or gradual? What were you doing when it started?" },
        { letter: "P", stand: "Provocation / Palliation", detail: "What makes it worse? What makes it better? (e.g., movement, rest, position, nitro)." },
        { letter: "Q", stand: "Quality", detail: "How would you describe the feeling? (sharp, dull, pressure, burning, tearing, cramping)." },
        { letter: "R", stand: "Radiation", detail: "Does it spread or move anywhere? (e.g., left arm, jaw, back, groin)." },
        { letter: "S", stand: "Severity", detail: "On a scale of 0–10, how bad is it right now? How does it compare to the worst pain you've felt?" },
        { letter: "T", stand: "Time / Timing", detail: "How long have you had it? Is it constant or does it come and go? Any similar episodes before?" },
      ],
    },

    {
      id: "avpu",
      acronym: "AVPU",
      title: "Level of Responsiveness",
      category: "Patient Assessment",
      note: null,
      letters: [
        { letter: "A", stand: "Alert", detail: "Patient is awake, eyes open spontaneously, and responds appropriately to the environment." },
        { letter: "V", stand: "Verbal", detail: "Patient only responds when you speak to them (may be confused or give inappropriate responses)." },
        { letter: "P", stand: "Painful", detail: "Patient responds only to painful stimuli (sternal rub, trapezius pinch, nail-bed pressure)." },
        { letter: "U", stand: "Unresponsive", detail: "No response to any stimuli. Immediately assess airway and begin intervention." },
      ],
    },

    {
      id: "dcap-btls",
      acronym: "DCAP-BTLS",
      title: "Physical Trauma Assessment",
      category: "Patient Assessment",
      note: null,
      letters: [
        { letter: "D", stand: "Deformities", detail: "Visible malformation, angulation, or shortening of a body part suggesting fracture or dislocation." },
        { letter: "C", stand: "Contusions", detail: "Bruising (ecchymosis). Note color and pattern; patterned bruising may indicate mechanism." },
        { letter: "A", stand: "Abrasions", detail: "Road rash or scraping injuries; indicate direction of force and suggest deeper injury below." },
        { letter: "P", stand: "Punctures / Penetrations", detail: "Entry (and possibly exit) wounds. Seal all chest wounds; note trajectory." },
        { letter: "B", stand: "Burns", detail: "Estimate BSA (Rule of Nines) and depth. Note chemical, thermal, or electrical source." },
        { letter: "T", stand: "Tenderness", detail: "Point tenderness on palpation. Mark exact location; may indicate underlying fracture or organ injury." },
        { letter: "L", stand: "Lacerations", detail: "Cuts or tears in the skin. Assess depth, length, and bleeding control needs." },
        { letter: "S", stand: "Swelling / Edema", detail: "Swelling at an injury site suggests hemorrhage or inflammation. Compare bilaterally." },
      ],
    },

    {
      id: "pearl",
      acronym: "PEARL",
      title: "Pupillary Assessment",
      category: "Patient Assessment",
      note: null,
      letters: [
        { letter: "P", stand: "Pupils", detail: "Assess both pupils — are they present and visible?" },
        { letter: "E", stand: "Equal", detail: "Are both pupils the same size? Anisocoria (unequal pupils) suggests herniation or CN III compression." },
        { letter: "A", stand: "And", detail: "(connector)" },
        { letter: "R", stand: "Reactive", detail: "Do pupils constrict when light is shone in each eye? Check direct and consensual response." },
        { letter: "L", stand: "to Light", detail: "Both pupils should briskly constrict to light. Sluggish or fixed pupils are abnormal." },
      ],
    },

    {
      id: "cms",
      acronym: "CMS",
      title: "Extremity Neurovascular Assessment",
      category: "Patient Assessment",
      note: "Assess CMS distal to any injury or splint. Reassess after every intervention.",
      letters: [
        { letter: "C", stand: "Circulation", detail: "Check distal pulse (radial for arm, dorsalis pedis/posterior tibial for leg). Note rate, quality, and capillary refill." },
        { letter: "M", stand: "Motor Function", detail: "Can the patient move the hand/foot and fingers/toes against resistance? Weakness suggests nerve or vascular compromise." },
        { letter: "S", stand: "Sensation", detail: "Does the patient feel light touch in the fingers or toes? Numbness or tingling may indicate compartment syndrome or nerve injury." },
      ],
    },

    {
      id: "ticls",
      acronym: "TICLS",
      title: "Pediatric Appearance Assessment",
      category: "Patient Assessment",
      note: "Also called 'Tickles.' Part of the Pediatric Assessment Triangle (PAT). A normal TICLS means the child is likely compensating well.",
      letters: [
        { letter: "T", stand: "Tone", detail: "Is muscle tone normal? A floppy or hypotonic child is more concerning than one who is rigid or moving normally." },
        { letter: "I", stand: "Interactiveness", detail: "Is the child engaging with people and the environment? Lack of interest in surroundings is a red flag." },
        { letter: "C", stand: "Consolability", detail: "Can the child be comforted by a caregiver? Inconsolable crying or inability to be soothed is abnormal." },
        { letter: "L", stand: "Look / Gaze", detail: "Is the child making eye contact? A vacant, glassy, or unfocused stare suggests altered mental status." },
        { letter: "S", stand: "Speech / Cry", detail: "Is vocalization age-appropriate? A weak, high-pitched cry or absence of crying is concerning." },
      ],
    },

    {
      id: "pat",
      acronym: "PAT",
      title: "Pediatric Assessment Triangle",
      category: "Patient Assessment",
      note: "The PAT is a rapid (<30 second) visual and auditory assessment. No touching required. It tells you if the child is sick or not sick before you approach.",
      letters: [
        { letter: "P", stand: "Appearance (TICLS)", detail: "General appearance: tone, interactiveness, consolability, look/gaze, speech/cry. The most important indicator of overall status." },
        { letter: "A", stand: "Work of Breathing", detail: "Look and listen for abnormal airway sounds (stridor, grunting, wheezing), retractions, nasal flaring, or abnormal positioning (tripod, sniffing)." },
        { letter: "T", stand: "Circulation to Skin", detail: "Skin color at a distance: pallor, mottling, or cyanosis indicate poor perfusion even before vitals are obtained." },
      ],
    },

    // ── Altered Mental Status ─────────────────────────────────────────────

    {
      id: "aeiou-tips",
      acronym: "AEIOU-TIPS",
      title: "Causes of Altered Mental Status",
      category: "Altered Mental Status",
      note: null,
      letters: [
        { letter: "A", stand: "Alcohol / Addiction", detail: "Acute intoxication, alcohol withdrawal (seizures, delirium tremens), or chronic encephalopathy." },
        { letter: "E", stand: "Epilepsy / Seizure", detail: "Active seizure, postictal state, or uncontrolled epilepsy." },
        { letter: "I", stand: "Insulin / Blood Sugar", detail: "Hypoglycemia (most urgent — check BGL first) or hyperglycemia (DKA/HHNS)." },
        { letter: "O", stand: "Overdose / Opioids", detail: "Drug or medication overdose. Consider naloxone for opioid toxidrome (miosis, respiratory depression, decreased LOC)." },
        { letter: "U", stand: "Uremia / Kidney Failure", detail: "Uremia from acute or chronic renal failure causes encephalopathy, confusion, and asterixis." },
        { letter: "T", stand: "Trauma / Temperature", detail: "Head trauma (TBI, intracranial hemorrhage) or extremes of temperature (hypothermia, hyperthermia)." },
        { letter: "I", stand: "Infection / Inflammation", detail: "Sepsis, meningitis, encephalitis. Suspect in febrile patients with altered LOC and stiff neck." },
        { letter: "P", stand: "Psychiatric / Psychosis", detail: "Acute psychosis, severe anxiety, or conversion disorder. Diagnosis of exclusion — rule out organic causes first." },
        { letter: "S", stand: "Stroke / Structural", detail: "Ischemic or hemorrhagic stroke, hypertensive emergency, brain tumor, or mass lesion." },
      ],
    },

    // ── Airway ────────────────────────────────────────────────────────────

    {
      id: "lemon",
      acronym: "LEMON",
      title: "Difficult Airway Prediction",
      category: "Airway",
      note: "Use before any intubation attempt. Two or more positive findings = plan for a difficult airway and have backup devices ready.",
      letters: [
        { letter: "L", stand: "Look Externally", detail: "Facial trauma, large tongue, small mandible, significant facial hair, obesity, short neck, or prior neck surgery/radiation." },
        { letter: "E", stand: "Evaluate the 3-3-2 Rule", detail: "Mouth opening ≥3 finger-widths; chin to hyoid ≥3 fingers; hyoid to thyroid cartilage ≥2 fingers. Failure predicts difficulty." },
        { letter: "M", stand: "Mallampati Score", detail: "With mouth fully open and tongue out: can you see the uvula, soft palate, and fauces? Higher score = harder laryngoscopy." },
        { letter: "O", stand: "Obstruction / Obesity", detail: "Foreign body, epiglottitis, Ludwig's angina, hematoma, or significant obesity limiting positioning and mask seal." },
        { letter: "N", stand: "Neck Mobility", detail: "Can the patient extend the neck (sniffing position)? Cervical immobilization, arthritis, or prior fusion limits laryngoscopy." },
      ],
    },

    {
      id: "moans",
      acronym: "MOANS",
      title: "Difficult BVM Ventilation",
      category: "Airway",
      note: "Predict before you intubate — if BVM will be difficult, RSI failure is catastrophic. Plan a supraglottic device backup.",
      letters: [
        { letter: "M", stand: "Mask Seal", detail: "Facial hair, facial trauma, or unusual facial anatomy makes achieving an airtight mask seal difficult." },
        { letter: "O", stand: "Obstruction / Obesity", detail: "Upper airway obstruction (foreign body, edema) or morbid obesity increases airway resistance and limits chest rise." },
        { letter: "A", stand: "Age > 55", detail: "Loss of airway muscle tone with age makes passive BVM ventilation less effective." },
        { letter: "N", stand: "No Teeth / Edentulous", detail: "Absence of teeth collapses the cheeks, making a mask seal nearly impossible without airway adjuncts." },
        { letter: "S", stand: "Stiff Lungs / Snoring", detail: "Reduced pulmonary compliance (ARDS, severe asthma, pulmonary edema) requires high pressure; snoring suggests obstruction." },
      ],
    },

    {
      id: "rods",
      acronym: "RODS",
      title: "Difficult Supraglottic Airway (SGA)",
      category: "Airway",
      note: "Predicts difficulty placing a King LT, LMA, or i-gel. Plan for surgical airway if all options fail.",
      letters: [
        { letter: "R", stand: "Restricted Mouth Opening", detail: "Mouth opening < 3 cm prevents proper SGA insertion (same threshold as for laryngoscopy)." },
        { letter: "O", stand: "Obstruction / Obesity", detail: "Glottic or supraglottic obstruction prevents SGA from seating properly; obesity raises aspiration risk." },
        { letter: "D", stand: "Disrupted / Distorted Airway", detail: "Trauma, hematoma, tumor, or severe edema can prevent the SGA from aligning with the glottis." },
        { letter: "S", stand: "Short Thyromental Distance", detail: "A short thyromental distance predicts a more anterior, harder-to-access glottis regardless of device used." },
      ],
    },

    {
      id: "dope",
      acronym: "DOPE",
      title: "Intubated Patient Deterioration",
      category: "Airway",
      note: "When a ventilated patient suddenly deteriorates, run through DOPE before anything else.",
      letters: [
        { letter: "D", stand: "Displaced Tube", detail: "ETT has migrated into the right mainstem bronchus or back out of the trachea. Confirm with waveform capnography and bilateral breath sounds." },
        { letter: "O", stand: "Obstruction", detail: "The tube is kinked, plugged with secretions, or bitten. Suction through the tube; if unable to pass a suction catheter, replace the tube." },
        { letter: "P", stand: "Pneumothorax", detail: "Tension pneumothorax from positive pressure ventilation. Treat with needle decompression followed by chest tube." },
        { letter: "E", stand: "Equipment Failure", detail: "BVM failure, ventilator malfunction, oxygen source disconnected. Switch to a backup BVM with confirmed oxygen flow." },
      ],
    },

    // ── Cardiac / Arrest ──────────────────────────────────────────────────

    {
      id: "hs-and-ts",
      acronym: "Hs and Ts",
      title: "Reversible Causes of Cardiac Arrest",
      category: "Cardiac / Arrest",
      note: "Search for and treat these during every cardiac arrest resuscitation. Addressing a reversible cause is the only way to restore ROSC in many arrests.",
      letters: [
        { letter: "H", stand: "Hypovolemia", detail: "Most common cause of PEA. Treat with aggressive IV fluid resuscitation; consider hemorrhage control." },
        { letter: "H", stand: "Hypoxia", detail: "Ensure effective ventilation with 100% O₂. Confirm ETT or SGA placement with waveform capnography." },
        { letter: "H", stand: "Hydrogen Ion (Acidosis)", detail: "Severe metabolic acidosis (DKA, sepsis, prolonged arrest). Consider sodium bicarbonate per protocol." },
        { letter: "H", stand: "Hypo- / Hyperkalemia", detail: "Electrolyte abnormalities causing dysrhythmia. Calcium chloride for hyperkalemia; consider in dialysis patients." },
        { letter: "H", stand: "Hypothermia", detail: "Core temp < 30°C dramatically reduces defibrillation success. Rewarm — 'not dead until warm and dead.'" },
        { letter: "T", stand: "Tension Pneumothorax", detail: "Absent breath sounds, tracheal deviation, PEA. Treat with needle decompression (2nd ICS MCL or 4th/5th ICS AAL)." },
        { letter: "T", stand: "Tamponade (Cardiac)", detail: "Beck's triad (JVD, muffled heart sounds, hypotension). Requires pericardiocentesis or finger thoracostomy in traumatic arrest." },
        { letter: "T", stand: "Toxins / Poisons", detail: "Drug overdose, poisoning. Use specific antidotes: naloxone (opioids), sodium bicarb (TCAs), lipid emulsion (local anesthetics)." },
        { letter: "T", stand: "Thrombosis (Pulmonary or Coronary)", detail: "Massive PE (consider thrombolytics during CPR) or acute MI (PCI is the priority after ROSC)." },
      ],
    },

    {
      id: "mona",
      acronym: "MONA",
      title: "ACS Treatment (Historical)",
      category: "Cardiac / Arrest",
      note: "MONA is outdated. Modern evidence shows morphine increases mortality in MI (use fentanyl for pain). Oxygen is only indicated if SpO₂ < 90%. Nitroglycerin and aspirin remain appropriate. Current focus is rapid transport for PCI.",
      letters: [
        { letter: "M", stand: "Morphine", detail: "⚠ No longer recommended as first-line. Associated with increased mortality in STEMI. Use fentanyl if analgesia is needed." },
        { letter: "O", stand: "Oxygen", detail: "⚠ Only give supplemental O₂ if SpO₂ < 90%. Hyperoxia worsens ischemic injury in normoxic patients." },
        { letter: "N", stand: "Nitroglycerin", detail: "Sublingual NTG for chest pain relief. Contraindicated if SBP < 90, recent PDE-5 inhibitor use, or inferior MI with RV involvement." },
        { letter: "A", stand: "Aspirin", detail: "324 mg chewed (not swallowed whole) as soon as ACS is suspected. Still strongly evidence-based." },
      ],
    },

    // ── Stroke ────────────────────────────────────────────────────────────

    {
      id: "fast",
      acronym: "FAST",
      title: "Stroke Recognition",
      category: "Stroke",
      note: "Based on the Cincinnati Prehospital Stroke Scale. One positive finding = high suspicion for stroke. Activate stroke alert and transport immediately — time is brain.",
      letters: [
        { letter: "F", stand: "Face Drooping", detail: "Ask patient to smile. Is one side of the face drooping or numb? Unilateral facial droop is a classic stroke sign." },
        { letter: "A", stand: "Arm Weakness", detail: "Ask patient to raise both arms. Does one arm drift downward or feel weak? Pronator drift indicates motor cortex involvement." },
        { letter: "S", stand: "Speech Difficulty", detail: "Ask patient to repeat 'you can't teach an old dog new tricks.' Is speech slurred, garbled, or absent?" },
        { letter: "T", stand: "Time to Call", detail: "Note exact time symptoms began (or when patient was last known well). This determines thrombolytic eligibility (< 3–4.5 hours) and thrombectomy window." },
      ],
    },

    {
      id: "befast",
      acronym: "BE-FAST",
      title: "Enhanced Stroke Recognition",
      category: "Stroke",
      note: "Adds Balance and Eyes to capture posterior circulation (vertebrobasilar) strokes that FAST misses. Detects ~14% more strokes than FAST alone.",
      letters: [
        { letter: "B", stand: "Balance", detail: "Sudden loss of balance, dizziness, or lack of coordination not explained by another cause. Common in cerebellar or brainstem strokes." },
        { letter: "E", stand: "Eyes", detail: "Sudden vision change: loss of vision in one eye, double vision, or a visual field cut. Suggests posterior or ophthalmic artery involvement." },
        { letter: "F", stand: "Face Drooping", detail: "Unilateral facial weakness — ask the patient to smile." },
        { letter: "A", stand: "Arm Weakness", detail: "Unilateral arm drift or weakness when arms are held outstretched." },
        { letter: "S", stand: "Speech Difficulty", detail: "Slurred, absent, or nonsensical speech." },
        { letter: "T", stand: "Time to Call", detail: "Record last known well time and activate your stroke protocol immediately." },
      ],
    },

    // ── Pediatric / MCI ───────────────────────────────────────────────────

    {
      id: "jumpstart",
      acronym: "JumpSTART",
      title: "Pediatric MCI Triage",
      category: "Pediatric / MCI",
      note: "Designed for ages 1–8. Parallel to START triage but accounts for pediatric physiology (e.g., children can have respiratory arrest with a perfusing rhythm — a brief rescue breath is given before tagging black).",
      letters: [
        { letter: "J", stand: "Just Walk", detail: "GREEN (Minor): If the child can walk and follow commands, tag green and move on." },
        { letter: "u", stand: "Under 15 RR or over 45 RR", detail: "Respiratory rate outside 15–45/min → move to next step. Within range with no other concerns → YELLOW (Delayed)." },
        { letter: "m", stand: "Make a Pulse Check", detail: "No radial pulse or respiratory effort → give 5 rescue breaths. If breathing resumes → RED (Immediate). If not → BLACK (Deceased)." },
        { letter: "p", stand: "Pulse Present", detail: "Peripheral pulse present → assess AVPU. P or U → RED. A or V with abnormal RR → RED. A or V with normal RR → YELLOW." },
        { letter: "S", stand: "START Modifications", detail: "Same color tags as START: Black (deceased/unsalvageable), Red (immediate), Yellow (delayed), Green (minor)." },
        { letter: "T", stand: "Transport Priority", detail: "Red tags go first; pediatric patients should ideally go to pediatric trauma centers when feasible." },
        { letter: "A", stand: "AVPU Check", detail: "A (Alert) or V (Verbal) with normal RR = YELLOW. P (Pain) or U (Unresponsive) = RED." },
        { letter: "R", stand: "Rescue Breaths", detail: "Give 5 rescue breaths if apneic with a pulse. Unique to JumpSTART — children may have respiratory arrest with intact circulation." },
        { letter: "T", stand: "Tag and Move", detail: "Assign a tag color and move immediately to the next patient. Do not linger." },
      ],
    },

    {
      id: "cups",
      acronym: "CUPS",
      title: "Patient Priority / Urgency",
      category: "Pediatric / MCI",
      note: "A simple field triage tool for determining transport urgency. Most useful when START/JumpSTART is not yet indicated.",
      letters: [
        { letter: "C", stand: "Critical", detail: "Immediate life threat; intervention is happening now and transport is immediate. Examples: cardiac arrest, severe airway compromise." },
        { letter: "U", stand: "Unstable", detail: "Life threat present or imminent; condition could deteriorate rapidly. Rapid transport with treatment en route." },
        { letter: "P", stand: "Potentially Unstable", detail: "No immediate life threat but could deteriorate. Monitor closely and transport promptly." },
        { letter: "S", stand: "Stable", detail: "No immediate life threat identified; condition is unlikely to deteriorate. Routine transport; serial reassessment." },
      ],
    },

    // ── Communication / Handoff ───────────────────────────────────────────

    {
      id: "sbar",
      acronym: "SBAR",
      title: "Patient Handoff Communication",
      category: "Communication",
      note: "Originally developed by the U.S. military and adopted by Kaiser Permanente in 2003. Now a standard handoff framework across healthcare. A clear, concise SBAR reduces handoff errors and prevents miscommunication.",
      letters: [
        { letter: "S", stand: "Situation", detail: "Who you are, your unit/agency, where you're coming from, and a one-sentence description of the patient's chief complaint right now." },
        { letter: "B", stand: "Background", detail: "Relevant history: age/sex, mechanism or onset, past medical history, current medications, allergies." },
        { letter: "A", stand: "Assessment", detail: "Your clinical findings: vital signs, physical exam, GCS, relevant diagnostics (BGL, 12-lead, SpO₂). Your working impression." },
        { letter: "R", stand: "Recommendation", detail: "What you need from the receiving provider: specific treatments, consults, or resources. Include your transport ETA." },
      ],
    },

    {
      id: "imist-ambo",
      acronym: "IMIST-AMBO",
      title: "Paramedic Handover (Gold Standard)",
      category: "Communication",
      note: "Australian/international standard that consolidates OPQRST, SAMPLE, vitals, and DCAP-BTLS into a single structured handoff. Reduces handover duration and missed information.",
      letters: [
        { letter: "I", stand: "Identification", detail: "Patient's name, age, sex, and who is with them (family, bystander)." },
        { letter: "M", stand: "Mechanism / Medical Complaint", detail: "Mechanism of injury or nature of medical illness; how it happened or what led to this call." },
        { letter: "I", stand: "Injuries / Information", detail: "Injuries found on assessment (use DCAP-BTLS language) or key findings for a medical patient." },
        { letter: "S", stand: "Signs and Vital Signs", detail: "Full set of vitals (BP, HR, RR, SpO₂, BGL, temp, GCS, skin). Trending up or down?" },
        { letter: "T", stand: "Treatment", detail: "All interventions performed en route: airway management, IVs, medications given (drug, dose, route, time, response)." },
        { letter: "A", stand: "Allergies", detail: "Known drug, food, or environmental allergies." },
        { letter: "M", stand: "Medications", detail: "Patient's home medications, including any taken recently." },
        { letter: "B", stand: "Background Medical History", detail: "Relevant prior diagnoses, hospitalizations, surgeries, or similar prior episodes." },
        { letter: "O", stand: "Other Information", detail: "Anything else relevant: family concerns, advance directives, social situation, scene findings, witness statements." },
      ],
    },

    // ── Scene Safety ──────────────────────────────────────────────────────

    {
      id: "b-smac",
      acronym: "B-SMAC",
      title: "Scene Approach Assessment",
      category: "Scene Safety",
      note: null,
      letters: [
        { letter: "B", stand: "BSI / Body Substance Isolation", detail: "Don appropriate PPE before patient contact: gloves at minimum; add mask, eye protection, and gown as indicated by the scene." },
        { letter: "S", stand: "Scene Safe?", detail: "Is it safe to enter? Look for hazards: traffic, fire, downed wires, violence, unstable structures, hazmat. If unsafe, stage and wait." },
        { letter: "M", stand: "Mechanism of Injury / Nature of Illness", detail: "What happened? MOI for trauma, NOI for medical. This guides your index of suspicion and assessment priorities." },
        { letter: "A", stand: "Additional Resources Needed?", detail: "Do you need more ambulances, ALS, fire, police, helicopter, or specialty teams? Call early — they take time to arrive." },
        { letter: "C", stand: "C-Spine Precautions?", detail: "Does MOI suggest possible spinal injury? If yes, maintain in-line stabilization from first contact." },
      ],
    },

  ]; // end EMS_CLINICAL_MNEMONICS
})(window);
