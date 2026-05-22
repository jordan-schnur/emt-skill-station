const SOURCES = [
  {
    id: "nremt-psychomotor",
    title: "NREMT Psychomotor Skill Sheets",
    publisher: "National Registry of Emergency Medical Technicians",
    url: "https://www.nremt.org/EMT/EMT_Psychomotor_Exam",
    note: "Official skill performance checklists used as the basis for all sheets in this trainer (E201–E217).",
  },
  {
    id: "aaos-textbook",
    title: "Emergency Care and Transportation of the Sick and Injured, 12th ed.",
    publisher: "American Academy of Orthopaedic Surgeons (AAOS)",
    note: "Primary EMT curriculum reference for step sequences, terminology, and clinical rationale.",
  },
  {
    id: "brady-textbook",
    title: "Brady Emergency Care, 14th ed.",
    publisher: "Bledsoe, Porter & Cherry / Pearson Education",
    note: "Secondary reference for patient assessment frameworks and medication administration protocols.",
  },
  {
    id: "pa-ems",
    title: "Pennsylvania Emergency Medical Services Protocols",
    publisher: "Pennsylvania Department of Health, Bureau of Emergency Medical Services",
    url: "https://www.health.pa.gov/topics/ems/Pages/Protocols.aspx",
    note: "Basis for Pennsylvania-specific exam logistics, hospital destination criteria, and single-scenario format notes in the Exam Day guide.",
  },
];

export function SourcesView() {
  return (
    <div class="sources-view">
      <h1>Sources &amp; Disclaimer</h1>

      <section class="sources-section">
        <div class="disclaimer-box">
          <strong class="disclaimer-heading">Not medical advice</strong>
          <p>
            This app is a <strong>study aid for the NREMT psychomotor exam only</strong>. Nothing
            here constitutes medical advice, clinical guidance, or a substitute for
            professional training. Always follow your agency's protocols, your
            medical director's orders, and current NREMT guidelines.
          </p>
          <p>
            In an emergency, call 911.
          </p>
        </div>
      </section>

      <section class="sources-section">
        <h2>Sources</h2>
        <p class="sources-intro">
          Skill sheet content is derived from official NREMT materials and standard
          EMT textbooks. No content has been altered for brevity in a way that
          changes clinical meaning.
        </p>
        <ul class="sources-list">
          {SOURCES.map((s) => (
            <li key={s.id} class="source-item">
              <div class="source-title">
                {s.url
                  ? <a href={s.url} target="_blank" rel="noopener noreferrer" class="source-link">{s.title}</a>
                  : <span>{s.title}</span>
                }
              </div>
              <div class="source-publisher">{s.publisher}</div>
              <div class="source-note">{s.note}</div>
            </li>
          ))}
        </ul>
      </section>

      <section class="sources-section">
        <h2>About this app</h2>
        <p>
          Built as an open-source study tool. Contributions and corrections are welcome —
          file an issue or PR at{" "}
          <a
            href="https://github.com/jordan-schnur/emt-skill-station"
            target="_blank"
            rel="noopener noreferrer"
            class="source-link"
          >
            jordan-schnur/emt-skill-station
          </a>
          .
        </p>
        <p class="sources-copyright">© {new Date().getFullYear()} NREMT Skill Sheet Trainer. Not affiliated with NREMT.</p>
      </section>
    </div>
  );
}
