const MODES = [
  {
    name: "Flashcards (SRS)",
    desc: `The core study mode. Cards are shown one at a time; you reveal the answer and rate yourself. <strong>Again</strong> = didn't know it (resurfaces in ~1 min). <strong>Hard / Good / Easy</strong> = schedule for days, a week, or longer. The mastery bar on the home screen tracks your flashcard history. Keyboard: <span class="kbd-help">Space</span> to reveal · <span class="kbd-help">1</span>–<span class="kbd-help">4</span> to grade.`,
  },
  {
    name: "Order Drill",
    desc: `The major sections of the sheet are shuffled. Drag them (or use ↑↓ on mobile) into the correct exam order and submit. A hint reveals the correct order if you're wrong. <strong>3 correct runs in a row</strong> = mastered. Only available for sheets with multiple named sections.`,
  },
  {
    name: "Step Drill",
    desc: `Pick a section, then drag its steps into the correct order. Each section is tracked independently — <strong>3 correct in a row per section</strong> = that section is mastered. Filled dots under each section name show your streak.`,
  },
  {
    name: "Critical Criteria",
    desc: `Drills only the <strong>auto-fail behaviors</strong> — things that immediately fail you on the NREMT exam regardless of everything else. Each criterion is shown directly (no reveal step). Rate yourself: <strong>✗ Would fail</strong> (resurfaces in ~30 s), <strong>~ Close call</strong>, or <strong>✓ Know it cold</strong>. Don't move on until these are reflexes.`,
  },
  {
    name: "What's Next?",
    desc: `Multiple-choice drill. You're shown a step and asked to pick what comes immediately after it from 4 options. <strong>3 correct answers in a row</strong> = mastered. Good for reinforcing sequence under pressure without typing or dragging.`,
  },
  {
    name: "Blank Recall",
    desc: `Type every step you can remember from a blank page, one per line. Order doesn't need to be perfect — fuzzy matching scores you on meaning, not exact wording. After submitting, missed steps are available to drill one by one. Your best score is tracked.`,
  },
  {
    name: "Spoken Script",
    desc: `Shows each step and asks what you'd say aloud to the examiner. Type your verbalization and it's scored by similarity to the expected phrasing. <strong>3 rounds ≥ 80%</strong> = mastered. Practice this last — it bridges memorization and real exam performance.`,
  },
  {
    name: "Full Sheet",
    desc: `The complete reference sheet in one scrollable view — all sections, steps, points, and critical criteria. Click <strong>+ note</strong> next to any step to attach a private study note. Notes also appear in flashcards when you review that card.`,
  },
  {
    name: "Notes",
    desc: `Write free-form notes about the sheet as a whole, or review and edit all your per-step notes in one place. Notes support Markdown: <strong>**bold**</strong>, _italic_, bullet lists. All notes are private and stored in your browser.`,
  },
];

export function GuideView() {
  return (
    <div>
      <h1>Study Guide</h1>
      <p class="guide-intro">
        This app uses spaced repetition and active recall to help you memorize NREMT psychomotor skill sheets. Each sheet has multiple study modes — here's how each one works and when to use it.
      </p>

      <h2>Study modes</h2>
      <div class="guide-modes">
        {MODES.map((m) => (
          <div key={m.name} class="guide-mode">
            <div class="guide-mode-name">{m.name}</div>
            <div class="guide-mode-desc" dangerouslySetInnerHTML={{ __html: m.desc }} />
          </div>
        ))}
      </div>

      <h2>Recommended study sequence</h2>
      <ol class="guide-seq">
        <li><strong>Flashcards</strong> — build familiarity with every step.</li>
        <li><strong>Order Drill</strong> — lock in the section sequence.</li>
        <li><strong>Step Drill</strong> — master step order within each section.</li>
        <li><strong>Critical Criteria</strong> — drill auto-fail behaviors until they're automatic.</li>
        <li><strong>What's Next?</strong> — stress-test your sequence knowledge under pressure.</li>
        <li><strong>Blank Recall</strong> — find remaining gaps; go back to flashcards on weak areas.</li>
        <li><strong>Spoken Script</strong> — practice verbalizing exactly what you'll say in the exam room.</li>
      </ol>

      <div class="guide-tip">
        <strong>Progress &amp; backup: </strong>
        All data is saved in your browser's local storage — it's private and never leaves your device. Use{" "}
        <strong>Backup → Download JSON</strong>
        {" "}before clearing your browser or switching devices, then import that file on the new device to continue where you left off.
      </div>

      <h2>What's coming</h2>
      <ul class="guide-upcoming">
        <li><strong>Timed Simulation</strong> — full-station run with a countdown timer and automatic step-by-step scoring</li>
        <li><strong>Critical Criteria drill</strong> — dedicated flashcard mode for auto-fail behaviors only</li>
        <li><strong>Daily review log</strong> — per-day review counts powering the home screen sparkline</li>
      </ul>
    </div>
  );
}
