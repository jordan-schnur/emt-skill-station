/**
 * views.js – view renderers. Each renderer returns an HTMLElement.
 *
 * All views accept `(ctx)` where ctx = { state, route, navigate, toast, save }.
 * Views never read/write storage directly; they call ctx.save() to persist.
 */
(function (global) {
  const h = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === "dataset" && typeof v === "object") {
        for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
      } else {
        el.setAttribute(k, v);
      }
    }
    if (!Array.isArray(children)) children = [children];
    for (const child of children) {
      if (child == null || child === false) continue;
      el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  };

  const Views = {};

  // ---------- HELP SYSTEM --------------------------------------------
  function helpIcon(title, bodyHTML) {
    const btn = h("button", {
      class: "help-icon",
      type: "button",
      "aria-label": "Help: " + title,
      title: "Help",
    }, ["?"]);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showHelpModal(title, bodyHTML);
    });
    return btn;
  }

  function showHelpModal(title, bodyHTML) {
    document.querySelector(".help-modal-overlay")?.remove();
    const closeBtn = h("button", { class: "help-modal-close", type: "button", "aria-label": "Close" }, ["✕"]);
    const modal = h("div", { class: "help-modal" }, [
      h("div", { class: "help-modal-header" }, [
        h("strong", {}, [title]),
        closeBtn,
      ]),
      h("div", { class: "help-modal-body", html: bodyHTML }),
    ]);
    const overlay = h("div", { class: "help-modal-overlay" });
    const dismiss = () => overlay.remove();
    closeBtn.addEventListener("click", dismiss);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) dismiss(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { dismiss(); document.removeEventListener("keydown", esc); }
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  const SECORDER_MASTERY_RUNS      = 3;
  const STEPSEQ_MASTERY_RUNS       = 3;
  const WHATNEXT_MASTERY_RUNS      = 3;
  const SPOKENSCRIPT_MASTERY_RUNS  = 3;
  const SPOKENSCRIPT_PASS_RATE     = 0.8;
  const SPOKENSCRIPT_THRESHOLD     = 0.45;

  // ---------- MARKDOWN HELPERS ----------------------------------------

  function renderMarkdownEl(text) {
    const el = document.createElement("div");
    el.className = "md-content";
    if (!text || !text.trim()) return el;
    if (typeof marked !== "undefined") {
      el.innerHTML = marked.parse(text, { breaks: true, gfm: true });
      el.querySelectorAll("script,iframe,object,embed,form").forEach((n) => n.remove());
    } else {
      el.textContent = text;
    }
    return el;
  }

  function createMarkdownEditor({ value = "", placeholder = "", onSave, onCancel, saveLabel = "Save" }) {
    const wrap = h("div", { class: "md-editor" });

    const ta = h("textarea", {
      class: "md-editor-textarea",
      rows: "8",
      placeholder: placeholder || "Write in Markdown…",
    }, []);
    ta.value = value;

    function wrapSel(before, after) {
      if (after === undefined) after = before;
      const s = ta.selectionStart, e = ta.selectionEnd;
      const sel = ta.value.slice(s, e);
      ta.value = ta.value.slice(0, s) + before + sel + after + ta.value.slice(e);
      ta.selectionStart = s + before.length;
      ta.selectionEnd = s + before.length + sel.length;
      ta.focus();
    }

    function linePfx(pfx) {
      const pos = ta.selectionStart;
      const lines = ta.value.split("\n");
      let chars = 0, li = 0;
      for (let i = 0; i < lines.length; i++) {
        if (chars + lines[i].length >= pos) { li = i; break; }
        chars += lines[i].length + 1;
      }
      lines[li] = pfx + lines[li];
      ta.value = lines.join("\n");
      ta.focus();
    }

    ta.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrapSel("**"); }
      if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrapSel("_"); }
    });

    const toolbar = h("div", { class: "md-editor-toolbar" });
    const toolbarDef = [
      { label: "B",      title: "Bold (Ctrl+B)",   action: () => wrapSel("**") },
      { label: "I",      title: "Italic (Ctrl+I)",  action: () => wrapSel("_") },
      { label: "• List", title: "Bullet list",      action: () => linePfx("- ") },
    ];
    for (const btn of toolbarDef) {
      toolbar.appendChild(h("button", {
        class: "md-toolbar-btn",
        type: "button",
        title: btn.title,
        onclick: (e) => { e.preventDefault(); btn.action(); },
      }, [btn.label]));
    }

    const tabRow = h("div", { class: "md-editor-tabs" });
    const writeTab  = h("button", { class: "md-tab active", type: "button", onclick: () => setMode("write") },   ["Write"]);
    const previewTab = h("button", { class: "md-tab",        type: "button", onclick: () => setMode("preview") }, ["Preview"]);
    tabRow.append(writeTab, previewTab);

    const previewPane = h("div", { class: "md-editor-preview", style: "display:none" });

    function setMode(m) {
      if (m === "preview") {
        writeTab.classList.remove("active");
        previewTab.classList.add("active");
        ta.style.display = "none";
        previewPane.style.display = "";
        previewPane.innerHTML = "";
        previewPane.appendChild(renderMarkdownEl(ta.value));
      } else {
        writeTab.classList.add("active");
        previewTab.classList.remove("active");
        ta.style.display = "";
        previewPane.style.display = "none";
        ta.focus();
      }
    }

    const actions = h("div", { class: "md-editor-actions" });
    actions.appendChild(h("button", { class: "btn btn-primary", type: "button", onclick: () => onSave(ta.value) }, [saveLabel]));
    if (onCancel) {
      actions.appendChild(h("button", { class: "btn btn-ghost", type: "button", onclick: onCancel }, ["Cancel"]));
    }

    wrap.append(toolbar, tabRow, ta, previewPane, actions);
    return { el: wrap };
  }

  // ---------- HOME ----------------------------------------------------
  Views.home = (ctx) => {
    const wrap = h("div");
    wrap.append(
      h("h1", {}, ["NREMT Skill Sheet Trainer"]),
      h("p", { class: "subtitle" }, [
        "Pick a skill sheet to study. Cards you struggle with come back sooner; cards you nail go on a longer interval. ",
        helpIcon("How the home screen works",
          `<p><strong>Due pill</strong> — the colored bubble on each sheet shows how many flashcards are due for review right now.</p>
          <p><strong>Mastery bar</strong> — shows what percentage of cards you've rated Good or Easy at least once.</p>
          <p><strong>"all good"</strong> means no cards are currently due. Come back later, or open the sheet and use "Cram all cards" to force a session.</p>
          <p>Click any sheet to open it. Each sheet has multiple study modes available via the tab row at the top.</p>
          <p>See the <strong>Guide</strong> page (top nav) for a full explanation of every study mode.</p>`
        ),
      ])
    );

    const grid = h("div", { class: "sheet-grid" });
    for (const sheet of NREMT_DATA.sheets) {
      grid.appendChild(renderSheetCard(ctx, sheet));
    }
    wrap.appendChild(grid);

    // Roadmap of future modes
    const road = h("div", { class: "roadmap" });
    road.append(
      h("h2", {}, ["Coming next"]),
      h("p", { class: "muted" }, [
        "Open any sheet and use the Order Drill tab to learn sections in sequence. More modes coming:",
      ]),
      h("ul", {}, [
        h("li", {}, [
          h("span", { class: "tag shipped" }, ["✓ live"]),
          "Section Order Drill — drag the major sections of each sheet into the correct exam order",
        ]),
        h("li", {}, [
          h("span", { class: "tag shipped" }, ["✓ live"]),
          "Step Sequence Drill — pick a section, drag its steps into the correct exam order",
        ]),
        h("li", {}, [
          h("span", { class: "tag shipped" }, ["✓ live"]),
          "Critical Criteria Drill — drill only the auto-fail criteria with spaced repetition",
        ]),
        h("li", {}, [
          h("span", { class: "tag" }, ["soon"]),
          "Timed run-through — simulate the 10/15 minute station with a checklist and stopwatch",
        ]),
      ])
    );
    wrap.appendChild(road);
    return wrap;
  };

  function renderSheetCard(ctx, sheet) {
    const due = SRS.dueCount(ctx.state, sheet);
    const mastery = SRS.masteryFor(ctx.state, sheet);
    const pct = Math.round(mastery * 100);
    const noteCount = Notes.countSheetNotes(ctx.state, sheet);
    const secRec = ctx.state.drills && ctx.state.drills.secorder && ctx.state.drills.secorder[sheet.id];
    const secBadge = secRec
      ? (secRec.mastered
          ? h("span", { class: "sec-badge mastered", title: "Section order mastered" }, ["order ✓"])
          : secRec.streak > 0
            ? h("span", { class: "sec-badge progress", title: `Section order streak ${secRec.streak}/${SECORDER_MASTERY_RUNS}` }, [`order ${secRec.streak}/${SECORDER_MASTERY_RUNS}`])
            : null)
      : null;

    return h(
      "div",
      {
        class: "sheet-card",
        onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "study" }),
      },
      [
        h("div", { class: "row" }, [
          h("span", { class: "sheet-id" }, [sheet.id.toUpperCase()]),
          h("span", { class: "due-pill " + (due ? "" : "zero") }, [
            due ? `${due} due` : "all good",
          ]),
        ]),
        h("div", { class: "sheet-title" }, [sheet.title]),
        h("div", { class: "sheet-meta" }, [
          `${sheet.totalPoints} pts · ${sheet.cards.length} cards`,
          sheet.timeLimit ? ` · ${sheet.timeLimit}` : "",
          noteCount ? ` · ${noteCount} note${noteCount === 1 ? "" : "s"}` : "",
        ]),
        h("div", { class: "mastery-bar" }, [
          h("div", { class: "mastery-fill", style: `width: ${pct}%` }),
        ]),
        h("div", { class: "sheet-stats" }, [
          h("span", {}, [`mastery ${pct}%`]),
          secBadge || h("span", {}, [sheet.category]),
        ]),
      ]
    );
  }

  // ---------- SHEET DETAIL --------------------------------------------
  Views.sheet = (ctx) => {
    const sheet = NREMT_DATA.sheets.find((s) => s.id === ctx.route.sheetId);
    if (!sheet) return Views.notFound();

    const wrap = h("div");
    const tab = ctx.route.tab || "study";

    wrap.append(
      h("div", { class: "crumbs" }, [
        h("button", { class: "btn-link", onclick: () => ctx.navigate({ view: "home" }) }, ["← All sheets"]),
      ]),
      h("div", { class: "sheet-header" }, [
        h("div", {}, [
          h("h1", {}, [sheet.title]),
          h("div", { class: "meta" }, [
            `${sheet.id.toUpperCase()} · ${sheet.category} · ${sheet.totalPoints} possible points`,
            sheet.timeLimit ? ` · time limit ${sheet.timeLimit}` : "",
          ]),
        ]),
      ]),
      renderTabs(ctx, sheet, tab),
      tab === "study"    ? Views.study(ctx, sheet)
      : tab === "sheet"  ? Views.reference(ctx, sheet)
      : tab === "notes"  ? Views.notes(ctx, sheet)
      : tab === "order"   ? Views.sectionOrderDrill(ctx, sheet)
      : tab === "steps"   ? Views.stepSeqDrill(ctx, sheet)
      : tab === "critical" ? Views.criticalDrill(ctx, sheet)
      : tab === "whatnext" ? Views.whatNextDrill(ctx, sheet)
      : tab === "recall"  ? Views.blankRecall(ctx, sheet)
      : tab === "script"  ? Views.spokenScript(ctx, sheet)
      : tab === "mnemonics" ? Views.mnemonics(ctx, sheet)
      : Views.notFound()
    );
    return wrap;
  };

  function renderTabs(ctx, sheet, current) {
    const secRec = ctx.state.drills && ctx.state.drills.secorder && ctx.state.drills.secorder[sheet.id];
    const orderLabel = secRec && secRec.mastered
      ? "Order Drill ✓"
      : secRec && secRec.streak > 0
        ? `Order Drill (${secRec.streak}/${SECORDER_MASTERY_RUNS})`
        : "Order Drill";

    const drillableSections = sheet.sections.filter((s) => s.steps.length >= 2);
    const stepseqRecs = ctx.state.drills && ctx.state.drills.stepseq && ctx.state.drills.stepseq[sheet.id];
    const masteredSecCount = stepseqRecs
      ? drillableSections.filter((s) => stepseqRecs[s.name] && stepseqRecs[s.name].mastered).length
      : 0;
    const stepLabel =
      drillableSections.length > 0 && masteredSecCount === drillableSections.length
        ? "Step Drill ✓"
        : masteredSecCount > 0
          ? `Step Drill (${masteredSecCount}/${drillableSections.length})`
          : "Step Drill";

    // Critical Criteria tab label — shows how many criteria have been reviewed at least once
    const criticalCount = (sheet.criticalCriteria || []).length;
    let critKnownCount = 0;
    for (let ci = 0; ci < criticalCount; ci++) {
      const rec = ctx.state.srs[`critical::${sheet.id}::${ci}`];
      if (rec && rec.reps > 0) critKnownCount++;
    }
    const critLabel = criticalCount === 0
      ? "Critical Criteria"
      : critKnownCount === criticalCount
        ? "Critical Criteria ✓"
        : critKnownCount > 0
          ? `Critical Criteria (${critKnownCount}/${criticalCount})`
          : "Critical Criteria";

    const wnRec = ctx.state.drills && ctx.state.drills.whatnext && ctx.state.drills.whatnext[sheet.id];
    const whatNextLabel = wnRec && wnRec.mastered
      ? "What's Next? ✓"
      : wnRec && wnRec.streak > 0
        ? `What's Next? (${wnRec.streak}/${WHATNEXT_MASTERY_RUNS})`
        : "What's Next?";

    const brRec = ctx.state.drills && ctx.state.drills.blankrecall && ctx.state.drills.blankrecall[sheet.id];
    const recallLabel = brRec && brRec.bestPct > 0
      ? `Blank Recall (${brRec.bestPct}%)`
      : "Blank Recall";

    const ssRec = ctx.state.drills && ctx.state.drills.spokenscript && ctx.state.drills.spokenscript[sheet.id];
    const scriptLabel = ssRec && ssRec.mastered
      ? "Spoken Script ✓"
      : ssRec && ssRec.streak > 0
        ? `Spoken Script (${ssRec.streak}/${SPOKENSCRIPT_MASTERY_RUNS})`
        : "Spoken Script";

    const tabs = [
      { id: "study", label: "Flashcards (SRS)" },
      // Only show Order Drill tab for sheets with multiple sections
      ...(sheet.sections.length > 1 ? [{ id: "order", label: orderLabel }] : []),
      { id: "steps", label: stepLabel },
      // { id: "critical", label: critLabel }, // hidden until redesigned
      { id: "whatnext", label: whatNextLabel },
      { id: "recall", label: recallLabel },
      { id: "script", label: scriptLabel },
      { id: "mnemonics", label: "Mnemonics" },
      { id: "sheet", label: "Full sheet" },
      { id: "notes", label: "Notes" },
    ];
    return h(
      "div",
      { class: "tabs" },
      tabs.map((t) =>
        h(
          "button",
          {
            class: current === t.id ? "active" : "",
            onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: t.id }),
          },
          [t.label]
        )
      )
    );
  }

  // ---------- STUDY / FLASHCARDS -------------------------------------
  Views.study = (ctx, sheet) => {
    const queue = SRS.buildQueue(ctx.state, sheet);
    if (!queue.length) {
      return h("div", { class: "empty-state" }, [
        h("div", { class: "big" }, ["✓"]),
        h("p", {}, ["Nothing due right now."]),
        h("p", { class: "muted" }, [
          "Spaced repetition will bring cards back when it's time. Come back later, or open another sheet.",
        ]),
        h("p", {}, [
          h(
            "button",
            { class: "btn-ghost btn", onclick: () => studyAllForced(ctx, sheet) },
            ["Cram all cards anyway →"]
          ),
        ]),
      ]);
    }
    return renderCard(ctx, sheet, queue, 0);
  };

  function studyAllForced(ctx, sheet) {
    const queue = sheet.cards.map((card) => ({
      card,
      rec: SRS.getRecord(ctx.state, card.id),
    }));
    const root = document.getElementById("root");
    root.innerHTML = "";
    root.appendChild(
      h("div", {}, [
        h("div", { class: "crumbs" }, [
          h("button", { class: "btn-link", onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "study" }) }, ["← Back"]),
        ]),
        h("h1", {}, [`Cramming · ${sheet.title}`]),
        renderCard(ctx, sheet, queue, 0, /*cram*/ true),
      ])
    );
  }

  function renderCard(ctx, sheet, queue, index, cram = false) {
    const total = queue.length;
    const pane = h("div", { class: "study-pane" });

    function showAt(i) {
      pane.innerHTML = "";
      if (i >= queue.length) {
        pane.appendChild(
          h("div", { class: "empty-state" }, [
            h("div", { class: "big" }, ["✓"]),
            h("p", {}, ["Session complete — nice work."]),
            h("p", { class: "muted" }, [
              `You reviewed ${queue.length} card${queue.length === 1 ? "" : "s"}.`,
            ]),
            h("p", {}, [
              h("button", { class: "btn btn-primary", onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "study" }) }, ["Continue studying"]),
              " ",
              h("button", { class: "btn", onclick: () => ctx.navigate({ view: "home" }) }, ["Home"]),
            ]),
          ])
        );
        return;
      }
      const { card } = queue[i];
      pane.appendChild(buildFlashcard(ctx, sheet, card, i, total, cram, showAt, queue));
    }

    showAt(index);
    return pane;
  }

  function buildFlashcard(ctx, sheet, card, idx, total, cram, advance, queue) {
    let revealed = false;

    const FLASHCARD_HELP = `<p>Flashcards use <strong>Spaced Repetition (SM-2)</strong> — cards come back based on how well you know them.</p>
      <ul>
      <li><strong>Again</strong> — didn't know it; resurfaces in ~1 min</li>
      <li><strong>Hard</strong> — knew it but with effort; returns in a few days</li>
      <li><strong>Good</strong> — knew it comfortably; returns in about a week</li>
      <li><strong>Easy</strong> — knew it instantly; pushed out much further</li>
      </ul>
      <p>Keyboard: <span class="kbd-help">Space</span> or <span class="kbd-help">Enter</span> to reveal · <span class="kbd-help">1</span>–<span class="kbd-help">4</span> to grade</p>
      <p>"Again" cards are re-queued later in the same session so you see them again before finishing.</p>`;
    const meta = h("div", { class: "study-meta" }, [
      h("span", {}, [`Card ${idx + 1} of ${total}`]),
      h("span", { class: "study-meta-right" }, [
        SRS.describeDue(ctx.state.srs[card.id]),
        " · ease ", (ctx.state.srs[card.id]?.ease ?? 2.5).toFixed(2),
        helpIcon("Flashcards (Spaced Repetition)", FLASHCARD_HELP),
      ]),
    ]);

    const sectionLabel = h("div", { class: "card-section" }, [sheet.id.toUpperCase() + " · " + card.section]);
    const parent = card.parent ? h("div", { class: "card-parent" }, [card.parent]) : null;

    // Look up canonical step + parent BEFORE rendering the prompt so we can
    // upgrade it to a mnemonic-driven active-recall prompt when applicable.
    const canonical = findCanonicalStep(sheet, card);
    const parentStep = findParentStep(sheet, card);
    const mnemonic = mnemonicMatch(parentStep, canonical);

    let prompt;
    if (mnemonic) {
      prompt = h("div", { class: "card-prompt mnemonic-prompt" }, [
        h("div", { class: "mnemonic-label" }, ["Mnemonic"]),
        renderMnemonicLetters(mnemonic.letters, mnemonic.letter),
        h("div", { class: "mnemonic-ask" }, [
          `What does the `,
          h("strong", {}, [mnemonic.letter]),
          ` stand for in this step?`,
        ]),
      ]);
    } else {
      prompt = h("div", { class: "card-prompt" }, [
        card.parent
          ? `Within "${card.parent}" — what's expected?`
          : (idx === 0
              ? `What is the first step in this section?`
              : `What is the next step?`),
      ]);
    }

    const answer = h("div", { class: "card-answer", style: "display:none" }, [card.text]);
    const points = h("div", { class: "card-points", style: "display:none" }, [
      `${card.points} point${card.points === 1 ? "" : "s"}`,
    ]);

    // Look up extra context from the canonical sheet for this card.
    // (canonical already resolved above for mnemonic detection.)
    const extras = h("div", { style: "display:none" });
    if (canonical) {
      if (canonical.mnemonic) {
        extras.appendChild(h("div", { class: "card-mnemonic" }, [
          h("span", { class: "label" }, ["Mnemonic:"]),
          canonical.mnemonic,
        ]));
      }
      if (canonical.examinerNote) {
        extras.appendChild(h("div", { class: "card-examiner" }, [
          "Examiner says: " + canonical.examinerNote,
        ]));
      }
      if (canonical.note) {
        extras.appendChild(h("div", { class: "card-examiner" }, [canonical.note]));
      }
    }

    const userNoteText = Notes.getStepNote(ctx.state, card.id);
    const userNote = h("div", { class: "card-note", style: "display:none" }, []);
    if (userNoteText) {
      userNote.appendChild(h("span", { class: "label" }, ["Your note"]));
      userNote.appendChild(renderMarkdownEl(userNoteText));
    }

    const reveal = h("button", { class: "btn btn-primary", onclick: () => doReveal() }, ["Show answer  ", h("span", { class: "kbd" }, ["space"])]);

    const grades = h("div", { class: "grade-row", style: "display:none" }, [
      h("button", { class: "grade again", onclick: () => doGrade("again") }, ["Again", h("small", {}, ["< 1 min"])]),
      h("button", { class: "grade hard",  onclick: () => doGrade("hard")  }, ["Hard",  h("small", {}, [dueLabel("hard", ctx, card)])]),
      h("button", { class: "grade good",  onclick: () => doGrade("good")  }, ["Good",  h("small", {}, [dueLabel("good", ctx, card)])]),
      h("button", { class: "grade easy",  onclick: () => doGrade("easy")  }, ["Easy",  h("small", {}, [dueLabel("easy", ctx, card)])]),
    ]);

    const actions = h("div", { class: "card-actions" }, [reveal]);

    const noteRow = h("div", { class: "card-actions" }, [
      h("button", { class: "btn-link", onclick: () => openInlineNote(ctx, card, userNote, () => {}) }, [
        userNoteText ? "Edit your note" : "+ Add a note",
      ]),
    ]);

    const cardEl = h("div", { class: "card" }, [
      sectionLabel,
      parent,
      prompt,
      answer,
      points,
      extras,
      userNote,
      actions,
      grades,
      noteRow,
    ]);

    function doReveal() {
      if (revealed) return;
      revealed = true;
      answer.style.display = "";
      points.style.display = "";
      extras.style.display = "";
      if (userNoteText) userNote.style.display = "";
      reveal.style.display = "none";
      grades.style.display = "";
    }

    function doGrade(name) {
      const before = SRS.getRecord(ctx.state, card.id);
      const after = SRS.grade(before, name);
      ctx.state.srs[card.id] = after;
      ctx.state.stats.totalReviews += 1;
      ctx.state.stats.lastReviewedAt = Date.now();
      ctx.save();
      // For "again" we re-queue this card later in the session
      if (name === "again" && !cram) {
        queue.push({ card, rec: after });
      }
      advance(idx + 1);
    }

    // keyboard handlers
    cardEl.tabIndex = 0;
    cardEl.addEventListener("keydown", (e) => {
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        doReveal();
      } else if (revealed) {
        if (e.key === "1") doGrade("again");
        if (e.key === "2") doGrade("hard");
        if (e.key === "3") doGrade("good");
        if (e.key === "4") doGrade("easy");
      }
    });
    setTimeout(() => cardEl.focus(), 0);

    return h("div", {}, [meta, cardEl]);
  }

  function dueLabel(gradeName, ctx, card) {
    const before = SRS.getRecord(ctx.state, card.id);
    const after = SRS.grade({ ...before }, gradeName);
    return SRS.describeDue(after);
  }

  function findCanonicalStep(sheet, card) {
    for (const section of sheet.sections) {
      if (section.name !== card.section) continue;
      const step = section.steps[card.stepIndex];
      if (!step) return null;
      if (card.subIndex == null) return step;
      return (step.substeps || [])[card.subIndex] || null;
    }
    return null;
  }

  function findParentStep(sheet, card) {
    if (card.subIndex == null) return null;
    for (const section of sheet.sections) {
      if (section.name !== card.section) continue;
      return section.steps[card.stepIndex] || null;
    }
    return null;
  }

  /**
   * Given a parent step with a `mnemonic` field (e.g. "OPQRST") and a substep
   * (e.g. "Provocation"), return the matching letter if the substep's first
   * character appears in the mnemonic acronym — otherwise null.
   *
   * Active-recall prompts use this to turn "what's expected?" into "OPQRST —
   * what does the P stand for?", which research consistently identifies as a
   * higher-yield prompt than a generic checklist cue.
   */
  function mnemonicMatch(parentStep, substep) {
    if (!parentStep || !parentStep.mnemonic || !substep || !substep.text) return null;
    const acronym = parentStep.mnemonic.match(/^[A-Z]+/);
    if (!acronym) return null;
    const letters = acronym[0];
    const firstLetter = substep.text.trim().charAt(0).toUpperCase();
    if (!letters.includes(firstLetter)) return null;
    // If the same letter appears twice in the acronym, prefer the first
    // unused index — for OPQRST and SAMPLE this never happens, but it's
    // cheap insurance.
    return { letters, letter: firstLetter };
  }

  /** Render the mnemonic letters with one letter highlighted. */
  function renderMnemonicLetters(letters, activeLetter) {
    const wrap = h("div", { class: "mnemonic-letters" });
    let highlightedOnce = false;
    for (const ch of letters) {
      const isActive = !highlightedOnce && ch === activeLetter;
      if (isActive) highlightedOnce = true;
      wrap.appendChild(
        h("span", { class: isActive ? "mn-letter active" : "mn-letter" }, [ch])
      );
    }
    return wrap;
  }

  function buildFlatSequence(sheet) {
    const seq = [];
    for (const section of sheet.sections) {
      for (const step of section.steps) {
        seq.push({ text: step.text, sectionName: section.name });
        for (const sub of (step.substeps || [])) {
          seq.push({ text: sub.text, sectionName: section.name });
        }
      }
    }
    return seq;
  }

  function enableDragAutoScroll() {
    const ZONE = 80;
    const SPEED = 10;
    function onDragOver(e) {
      const y = e.clientY;
      if (y < ZONE) window.scrollBy(0, -SPEED);
      else if (y > window.innerHeight - ZONE) window.scrollBy(0, SPEED);
    }
    document.addEventListener("dragover", onDragOver);
    return () => document.removeEventListener("dragover", onDragOver);
  }

  // Touch drag-and-drop for .order-item lists (mobile).
  // Attaches touchstart/move/end to listEl; calls onSwap(fromIdx, toIdx) on drop.
  function addTouchDrag(listEl, onSwap) {
    const ZONE = 80, SPEED = 8;
    let ghost = null, srcEl = null, srcIdx = null, targetIdx = null;
    let offsetX = 0, offsetY = 0;

    function items() { return Array.from(listEl.querySelectorAll(".order-item")); }

    listEl.addEventListener("touchstart", (e) => {
      if (e.target.closest("button")) return;
      const item = e.target.closest(".order-item");
      if (!item) return;
      const els = items();
      srcIdx = els.indexOf(item);
      if (srcIdx === -1) return;
      srcEl = item;
      const touch = e.touches[0];
      const rect = item.getBoundingClientRect();
      offsetX = touch.clientX - rect.left;
      offsetY = touch.clientY - rect.top;
      ghost = item.cloneNode(true);
      Object.assign(ghost.style, {
        position: "fixed", left: rect.left + "px", top: rect.top + "px",
        width: rect.width + "px", margin: "0", opacity: "0.85",
        pointerEvents: "none", zIndex: "9999",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)", transform: "scale(1.02)",
      });
      document.body.appendChild(ghost);
      item.classList.add("dragging");
      e.preventDefault();
    }, { passive: false });

    listEl.addEventListener("touchmove", (e) => {
      if (!ghost) return;
      const touch = e.touches[0];
      ghost.style.left = (touch.clientX - offsetX) + "px";
      ghost.style.top  = (touch.clientY - offsetY) + "px";
      ghost.style.visibility = "hidden";
      const under = document.elementFromPoint(touch.clientX, touch.clientY);
      ghost.style.visibility = "";
      const overItem = under && under.closest(".order-item");
      items().forEach((el) => el.classList.remove("drag-over"));
      if (overItem && overItem !== srcEl) {
        const idx = items().indexOf(overItem);
        if (idx !== -1) { overItem.classList.add("drag-over"); targetIdx = idx; }
      } else { targetIdx = null; }
      if (touch.clientY < ZONE) window.scrollBy(0, -SPEED);
      else if (touch.clientY > window.innerHeight - ZONE) window.scrollBy(0, SPEED);
      e.preventDefault();
    }, { passive: false });

    function endDrag() {
      if (!ghost) return;
      ghost.remove(); ghost = null;
      if (srcEl) srcEl.classList.remove("dragging");
      items().forEach((el) => el.classList.remove("drag-over"));
      if (srcIdx !== null && targetIdx !== null && srcIdx !== targetIdx) {
        onSwap(srcIdx, targetIdx);
      }
      srcEl = null; srcIdx = null; targetIdx = null;
    }
    listEl.addEventListener("touchend",   endDrag, { passive: true });
    listEl.addEventListener("touchcancel", endDrag, { passive: true });
  }

  function buildScriptSequence(sheet) {
    const seq = [];
    for (const section of sheet.sections)
      for (const step of section.steps)
        if (step.spokenScript)
          seq.push({ text: step.text, spokenScript: step.spokenScript, sectionName: section.name });
    return seq;
  }

  function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  }

  function jaccardSimilarity(a, b) {
    const setA = new Set(tokenize(a));
    const setB = new Set(tokenize(b));
    if (setA.size === 0 && setB.size === 0) return 1;
    let intersection = 0;
    for (const tok of setA) { if (setB.has(tok)) intersection++; }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  function matchLines(typedLines, expectedSteps, threshold = 0.45) {
    const available = [...typedLines];
    return expectedSteps.map((expected) => {
      let bestScore = 0, bestIdx = -1;
      available.forEach((line, i) => {
        const s = jaccardSimilarity(line, expected.text);
        if (s > bestScore) { bestScore = s; bestIdx = i; }
      });
      if (bestScore >= threshold && bestIdx !== -1) {
        const matched = available.splice(bestIdx, 1)[0];
        return { expected, matched: true, typedLine: matched, score: bestScore };
      }
      return { expected, matched: false, typedLine: null, score: bestScore };
    });
  }

  function openInlineNote(ctx, card, noteEl, onChange) {
    let block;
    const { el } = createMarkdownEditor({
      value: Notes.getStepNote(ctx.state, card.id) || "",
      placeholder: "Your private note for this step…",
      saveLabel: "Save note",
      onSave: (val) => {
        Notes.setStepNote(ctx.state, card.id, val);
        ctx.save();
        ctx.toast(val.trim() ? "Note saved" : "Note removed");
        if (onChange) onChange();
        noteEl.innerHTML = "";
        if (val.trim()) {
          noteEl.style.display = "";
          noteEl.appendChild(h("span", { class: "label" }, ["Your note"]));
          noteEl.appendChild(renderMarkdownEl(val));
        } else {
          noteEl.style.display = "none";
        }
        block.replaceWith(h("div", { class: "card-actions" }, [
          h("button", { class: "btn-link", onclick: () => openInlineNote(ctx, card, noteEl, onChange) }, [
            val.trim() ? "Edit your note" : "+ Add a note",
          ]),
        ]));
      },
      onCancel: () => block.remove(),
    });
    block = h("div", { class: "notes-block" }, [
      h("div", { class: "target" }, [
        "Note on: ",
        h("strong", {}, [card.parent ? `${card.parent} → ${card.text}` : card.text]),
      ]),
      el,
    ]);
    noteEl.parentNode.insertBefore(block, noteEl);
    setTimeout(() => { const t = el.querySelector("textarea"); if (t) t.focus(); }, 0);
  }

  // ---------- REFERENCE SHEET ----------------------------------------
  Views.reference = (ctx, sheet) => {
    const pane = h("div");

    for (const section of sheet.sections) {
      const sectEl = h("div", { class: "ref-section" });
      if (section.header) sectEl.appendChild(h("h3", {}, [section.name]));

      section.steps.forEach((step, stepIdx) => {
        const substeps = step.substeps || [];
        const cardId = substeps.length
          ? null
          : `${sheet.id}::${section.name}::${stepIdx}`;

        sectEl.appendChild(renderRefRow(ctx, sheet, cardId, step.text, step.points, false));

        if (step.examinerNote) {
          sectEl.appendChild(h("div", { class: "examiner-line" }, ["Examiner: " + step.examinerNote]));
        }
        if (step.note) {
          sectEl.appendChild(h("div", { class: "examiner-line" }, [step.note]));
        }
        if (step.mnemonic) {
          sectEl.appendChild(h("div", { class: "examiner-line" }, ["Mnemonic: " + step.mnemonic]));
        }

        if (substeps.length) {
          const subWrap = h("div", { class: "ref-sub" });
          substeps.forEach((sub, subIdx) => {
            const subId = `${sheet.id}::${section.name}::${stepIdx}::${subIdx}`;
            subWrap.appendChild(renderRefRow(ctx, sheet, subId, sub.text, sub.points, true));
          });
          sectEl.appendChild(subWrap);
        }
      });

      pane.appendChild(sectEl);
    }

    // Critical criteria
    pane.appendChild(h("h3", {}, ["Critical Criteria (auto-fail)"]));
    const ul = h("ul", { class: "critical-list" });
    for (const cc of sheet.criticalCriteria) {
      ul.appendChild(h("li", {}, [cc]));
    }
    pane.appendChild(ul);

    return pane;
  };

  function renderRefRow(ctx, sheet, cardId, text, points, isSub) {
    const note = cardId ? Notes.getStepNote(ctx.state, cardId) : "";
    const container = h("div");
    const row = h("div", { class: "ref-row" });
    row.append(
      h("div", { class: "text" }, [text]),
      h("div", { class: "points" }, [points ? String(points) : ""]),
    );
    if (cardId) {
      const btn = h("button", {
        class: "note-btn" + (note ? " has-note" : ""),
        onclick: () => {
          if (container.querySelector(".md-editor")) return;
          let editorEl;
          const { el } = createMarkdownEditor({
            value: Notes.getStepNote(ctx.state, cardId) || "",
            placeholder: "Your private note for this step…",
            saveLabel: "Save note",
            onSave: (val) => {
              Notes.setStepNote(ctx.state, cardId, val);
              ctx.save();
              ctx.toast(val.trim() ? "Note saved" : "Note removed");
              ctx.refresh();
            },
            onCancel: () => editorEl.remove(),
          });
          editorEl = el;
          container.appendChild(el);
        },
      }, [note ? "✎ note" : "+ note"]);
      row.appendChild(btn);
    }
    container.appendChild(row);
    if (note) {
      container.appendChild(
        h("div", { class: "card-note ref-note-display" }, [
          h("span", { class: "label" }, ["Your note"]),
          renderMarkdownEl(note),
        ])
      );
    }
    return container;
  }

  // ---------- NOTES VIEW ---------------------------------------------
  Views.notes = (ctx, sheet) => {
    const pane = h("div");

    pane.appendChild(h("p", { class: "muted" }, [
      "Supports Markdown — use **bold**, _italic_, - lists. Click into the Full sheet tab to attach notes to specific steps.",
    ]));

    // Sheet-level note
    const sheetText = Notes.getSheetNote(ctx.state, sheet.id);
    const { el: sheetEditorEl } = createMarkdownEditor({
      value: sheetText || "",
      placeholder: "Notes about this sheet as a whole…",
      saveLabel: "Save",
      onSave: (val) => {
        Notes.setSheetNote(ctx.state, sheet.id, val);
        ctx.save();
        ctx.toast(val.trim() ? "Note saved" : "Note removed");
      },
    });
    pane.appendChild(h("div", { class: "notes-block" }, [
      h("div", { class: "target" }, [h("strong", {}, ["General note for this sheet"])]),
      sheetEditorEl,
    ]));

    // List of existing per-step notes
    const stepNotes = sheet.cards
      .map((card) => ({ card, note: Notes.getStepNote(ctx.state, card.id) }))
      .filter((x) => x.note);

    pane.appendChild(h("h3", {}, [`Per-step notes (${stepNotes.length})`]));

    if (!stepNotes.length) {
      pane.appendChild(h("p", { class: "muted" }, [
        'None yet. Open the Full sheet tab and click the “+ note” chip next to any row to add one.',
      ]));
    } else {
      for (const { card, note } of stepNotes) {
        const { el: stepEditorEl } = createMarkdownEditor({
          value: note,
          saveLabel: "Save",
          onSave: (val) => {
            Notes.setStepNote(ctx.state, card.id, val);
            ctx.save();
            ctx.toast(val.trim() ? "Note saved" : "Note removed");
            ctx.refresh();
          },
        });
        pane.appendChild(h("div", { class: "notes-block" }, [
          h("div", { class: "target" }, [
            card.section + ": ",
            h("strong", {}, [card.parent ? `${card.parent} → ${card.text}` : card.text]),
          ]),
          stepEditorEl,
        ]));
      }
    }
    return pane;
  };

  // ---------- SECTION ORDER DRILL ------------------------------------
  Views.sectionOrderDrill = (ctx, sheet) => {
    // Ensure drill state bucket exists
    if (!ctx.state.drills) ctx.state.drills = { secorder: {} };
    if (!ctx.state.drills.secorder) ctx.state.drills.secorder = {};

    const correctOrder = sheet.sections.map((s) => s.name);

    // Sheets like BVM / CPR have a single "Sequence" section — no ordering to drill.
    if (correctOrder.length <= 1) {
      return h("div", { class: "empty-state" }, [
        h("div", { class: "big" }, ["—"]),
        h("p", {}, ["This sheet has a single continuous sequence."]),
        h("p", { class: "muted" }, [
          "Section Order Drill works for sheets with multiple named sections (e.g. Trauma Assessment, Medical Assessment). Use the Flashcards tab to study the steps for this sheet.",
        ]),
        h("p", {}, [
          h("button", {
            class: "btn btn-primary",
            onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "study" }),
          }, ["Go to Flashcards →"]),
        ]),
      ]);
    }

    function getMastery() {
      return ctx.state.drills.secorder[sheet.id] || { streak: 0, attempts: 0, mastered: false };
    }

    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      // Avoid giving the user the already-correct order
      if (a.length > 1 && a.every((v, i) => v === arr[i])) return shuffle(arr);
      return a;
    }

    const pane = h("div", { class: "drill-pane" });

    // Local drill state (lives in this closure, not in localStorage)
    let items = shuffle(correctOrder);
    let submitted = false;
    let correctness = []; // per-item boolean

    function render() {
      pane.innerHTML = "";
      const mastery = getMastery();

      // ---- header ----
      const pips = [];
      for (let i = 0; i < SECORDER_MASTERY_RUNS; i++) {
        pips.push(h("span", { class: "streak-pip" + (i < mastery.streak ? " filled" : "") }));
      }

      pane.appendChild(
        h("div", { class: "drill-header" }, [
          h("div", { class: "drill-title-row" }, [
            h("h2", { class: "drill-title" }, ["Section Order Drill"]),
            mastery.mastered
              ? h("span", { class: "mastered-badge" }, ["✓ Mastered"])
              : null,
            helpIcon("Section Order Drill",
              `<p>The major sections of this sheet are shuffled. Drag them into the correct exam order (tap ↑↓ to nudge one step at a time).</p>
              <p>Hit <strong>Check my order</strong> to submit. If you're wrong, the correct order is revealed.</p>
              <p><strong>Mastery</strong> = 3 correct runs in a row. Any wrong answer resets your streak to 0.</p>`
            ),
          ]),
          h("p", { class: "drill-sub muted" }, [
            mastery.mastered
              ? "Keep your skills sharp — drag or use ↑↓ to put the sections back in exam order."
              : `Arrange the sections in the order they appear on the skill sheet. Hit ${SECORDER_MASTERY_RUNS} in a row to master.`,
          ]),
          h("div", { class: "streak-row" }, [
            h("span", { class: "streak-label" }, ["Streak "]),
            ...pips,
            h("span", { class: "muted" }, [
              ` ${mastery.streak}/${SECORDER_MASTERY_RUNS}`,
              mastery.attempts
                ? ` · ${mastery.attempts} attempt${mastery.attempts === 1 ? "" : "s"}`
                : "",
            ]),
          ]),
          h("p", { class: "drill-hint muted" }, ["Drag to reorder · tap ↑↓ to nudge"]),
        ])
      );

      // ---- draggable list ----
      const list = h("div", { class: "order-list" });
      let dragSrcIdx = null;
      let stopAutoScroll = null;

      items.forEach((name, idx) => {
        const isCorrect = submitted ? name === correctOrder[idx] : null;
        const itemClass =
          "order-item" +
          (submitted ? (isCorrect ? " correct" : " wrong") : "");

        const feedbackEl = submitted
          ? h("span", { class: "order-check" }, [
              isCorrect
                ? "✓"
                : `✗ · should be #${correctOrder.indexOf(name) + 1}`,
            ])
          : h("div", { class: "order-arrows" }, [
              h("button", {
                class: "arrow-btn",
                disabled: idx === 0 ? "true" : null,
                "aria-label": "Move up",
                onclick: (e) => {
                  e.stopPropagation();
                  moveItem(idx, -1);
                },
              }, ["↑"]),
              h("button", {
                class: "arrow-btn",
                disabled: idx === items.length - 1 ? "true" : null,
                "aria-label": "Move down",
                onclick: (e) => {
                  e.stopPropagation();
                  moveItem(idx, 1);
                },
              }, ["↓"]),
            ]);

        const item = h("div", { class: itemClass }, [
          h("span", { class: "drag-handle", "aria-hidden": "true" }, ["⠿"]),
          h("span", { class: "order-idx" }, [String(idx + 1)]),
          h("span", { class: "order-name" }, [name]),
          feedbackEl,
        ]);

        if (!submitted) {
          item.setAttribute("draggable", "true");

          item.addEventListener("dragstart", (e) => {
            dragSrcIdx = idx;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(idx));
            stopAutoScroll = enableDragAutoScroll();
            // Delay class add so browser captures pre-drag snapshot
            setTimeout(() => item.classList.add("dragging"), 0);
          });

          item.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            dragSrcIdx = null;
            if (stopAutoScroll) { stopAutoScroll(); stopAutoScroll = null; }
          });

          item.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            list
              .querySelectorAll(".order-item")
              .forEach((el) => el.classList.remove("drag-over"));
            item.classList.add("drag-over");
          });

          item.addEventListener("dragleave", (e) => {
            if (!item.contains(e.relatedTarget)) {
              item.classList.remove("drag-over");
            }
          });

          item.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            item.classList.remove("drag-over");
            const src = dragSrcIdx;
            if (src !== null && src !== idx) {
              const dragged = items.splice(src, 1)[0];
              items.splice(idx, 0, dragged);
              dragSrcIdx = null;
              render();
            }
          });
        }

        list.appendChild(item);
      });

      if (!submitted) {
        addTouchDrag(list, (from, to) => {
          const dragged = items.splice(from, 1)[0];
          items.splice(to, 0, dragged);
          render();
        });
      }

      pane.appendChild(list);

      // ---- actions / result ----
      if (!submitted) {
        pane.appendChild(
          h("div", { class: "drill-actions" }, [
            h("button", { class: "btn btn-primary", onclick: checkOrder }, [
              "Check my order",
            ]),
            h("button", { class: "btn btn-ghost", onclick: reshuffleDrill }, [
              "Reshuffle",
            ]),
          ])
        );
      } else {
        const allCorrect = correctness.every(Boolean);
        const m = getMastery();

        pane.appendChild(
          h("div", { class: "drill-result " + (allCorrect ? "result-pass" : "result-fail") }, [
            h("div", { class: "result-icon" }, [allCorrect ? "✓" : "✗"]),
            allCorrect
              ? h("div", {}, [
                  h("strong", {}, [m.mastered ? "Section order mastered!" : "Correct order!"]),
                  h("p", {}, [
                    m.mastered
                      ? "You've locked in the exam flow for this sheet."
                      : `Streak: ${m.streak} / ${SECORDER_MASTERY_RUNS} — keep it up!`,
                  ]),
                ])
              : h("div", {}, [
                  h("strong", {}, ["Not quite — check corrections above."]),
                  h("p", {}, ["Streak reset to 0. Review the order and try again."]),
                ]),
            h("div", { class: "drill-actions" }, [
              h("button", { class: "btn btn-primary", onclick: reshuffleDrill }, [
                "Try again",
              ]),
              h("button", {
                class: "btn",
                onclick: () =>
                  ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "study" }),
              }, ["Back to flashcards"]),
            ]),
          ])
        );

        // Show correct order as a hint when wrong
        if (!allCorrect) {
          pane.appendChild(
            h("details", { class: "hint-details" }, [
              h("summary", { class: "muted" }, ["Show correct order"]),
              h("ol", { class: "correct-order-list" },
                correctOrder.map((name) => h("li", {}, [name]))
              ),
            ])
          );
        }
      }
    }

    function moveItem(idx, dir) {
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= items.length) return;
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      render();
    }

    function checkOrder() {
      submitted = true;
      correctness = items.map((name, idx) => name === correctOrder[idx]);
      const allCorrect = correctness.every(Boolean);

      if (!ctx.state.drills.secorder[sheet.id]) {
        ctx.state.drills.secorder[sheet.id] = { streak: 0, attempts: 0, mastered: false };
      }
      const rec = ctx.state.drills.secorder[sheet.id];
      rec.attempts += 1;
      if (allCorrect) {
        rec.streak += 1;
        if (rec.streak >= SECORDER_MASTERY_RUNS) rec.mastered = true;
      } else {
        rec.streak = 0;
      }
      ctx.save();
      render();
    }

    function reshuffleDrill() {
      items = shuffle(correctOrder);
      submitted = false;
      correctness = [];
      render();
    }

    render();
    return pane;
  };

  // ---------- STEP SEQUENCE DRILL ------------------------------------
  Views.stepSeqDrill = (ctx, sheet) => {
    // Ensure state buckets exist
    if (!ctx.state.drills) ctx.state.drills = { secorder: {}, stepseq: {} };
    if (!ctx.state.drills.stepseq) ctx.state.drills.stepseq = {};
    if (!ctx.state.drills.stepseq[sheet.id]) ctx.state.drills.stepseq[sheet.id] = {};

    // Only sections with 2+ steps are drillable
    const drillableSections = sheet.sections.filter((s) => s.steps.length >= 2);

    const pane = h("div", { class: "drill-pane" });

    // Local drill state
    let activeSection = drillableSections.length === 1 ? drillableSections[0] : null;
    let items = [];          // current step-text ordering
    let submitted = false;
    let correctness = [];

    function getSectionMastery(sectionName) {
      return ctx.state.drills.stepseq[sheet.id][sectionName]
        || { streak: 0, attempts: 0, mastered: false };
    }

    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      if (a.length > 1 && a.every((v, i) => v === arr[i])) return shuffle(arr);
      return a;
    }

    function startSection(section) {
      activeSection = section;
      items = shuffle(section.steps.map((s) => s.text));
      submitted = false;
      correctness = [];
      render();
    }

    function render() {
      pane.innerHTML = "";
      if (!activeSection) {
        renderPicker();
      } else {
        renderDrill();
      }
    }

    // ---- section picker ----
    function renderPicker() {
      const masteredCount = drillableSections.filter(
        (s) => getSectionMastery(s.name).mastered
      ).length;

      pane.appendChild(
        h("div", { class: "drill-header" }, [
          h("div", { class: "drill-title-row" }, [
            h("h2", { class: "drill-title" }, ["Step Sequence Drill"]),
            masteredCount === drillableSections.length && drillableSections.length > 0
              ? h("span", { class: "mastered-badge" }, ["✓ All Mastered"])
              : null,
            helpIcon("Step Sequence Drill",
              `<p>Pick a section, then drag its steps into the correct exam order.</p>
              <p>Each section is tracked independently — <strong>3 correct in a row per section</strong> = mastered. Sections with fewer than 2 steps are skipped.</p>
              <p>Filled circles below each section name show your current streak toward mastery.</p>`
            ),
          ]),
          h("p", { class: "drill-sub muted" }, [
            `Pick a section. Drag its steps into the correct exam order. ${STEPSEQ_MASTERY_RUNS} correct in a row = section mastered.`,
          ]),
        ])
      );

      if (drillableSections.length === 0) {
        pane.appendChild(h("p", { class: "muted" }, ["No multi-step sections found."]));
        return;
      }

      const list = h("div", { class: "section-picker" });
      for (const section of drillableSections) {
        const m = getSectionMastery(section.name);
        const pips = [];
        for (let i = 0; i < STEPSEQ_MASTERY_RUNS; i++) {
          pips.push(
            h("span", { class: "streak-pip" + (i < m.streak ? " filled" : "") })
          );
        }
        list.appendChild(
          h("div", {
            class: "picker-row" + (m.mastered ? " mastered" : ""),
            onclick: () => startSection(section),
          }, [
            h("div", { class: "picker-info" }, [
              h("div", { class: "picker-name" }, [section.name]),
              h("div", { class: "picker-meta muted" }, [
                `${section.steps.length} steps`,
                m.attempts
                  ? ` · ${m.attempts} attempt${m.attempts === 1 ? "" : "s"}`
                  : "",
              ]),
            ]),
            h("div", { class: "picker-right" }, [
              m.mastered
                ? h("span", { class: "mastered-badge" }, ["✓"])
                : h("div", { class: "streak-row" }, pips),
            ]),
            h("span", { class: "picker-arrow" }, ["→"]),
          ])
        );
      }
      pane.appendChild(list);
    }

    // ---- step ordering drill ----
    function renderDrill() {
      const section = activeSection;
      const correctOrder = section.steps.map((s) => s.text);
      const m = getSectionMastery(section.name);

      const pips = [];
      for (let i = 0; i < STEPSEQ_MASTERY_RUNS; i++) {
        pips.push(h("span", { class: "streak-pip" + (i < m.streak ? " filled" : "") }));
      }

      pane.appendChild(
        h("div", { class: "drill-header" }, [
          drillableSections.length > 1
            ? h("button", {
                class: "btn-link",
                style: "padding: 0 0 8px; display:block;",
                onclick: () => { activeSection = null; render(); },
              }, ["← All sections"])
            : null,
          h("div", { class: "drill-title-row" }, [
            h("h2", { class: "drill-title" }, ["Step Sequence Drill"]),
            m.mastered ? h("span", { class: "mastered-badge" }, ["✓ Mastered"]) : null,
          ]),
          h("div", { class: "card-section" }, [
            sheet.id.toUpperCase() + " · " + section.name,
          ]),
          h("div", { class: "streak-row" }, [
            h("span", { class: "streak-label" }, ["Streak "]),
            ...pips,
            h("span", { class: "muted" }, [
              ` ${m.streak}/${STEPSEQ_MASTERY_RUNS}`,
              m.attempts
                ? ` · ${m.attempts} attempt${m.attempts === 1 ? "" : "s"}`
                : "",
            ]),
          ]),
          h("p", { class: "drill-hint muted" }, [
            "Drag to reorder · tap ↑↓ to nudge",
          ]),
        ])
      );

      const list = h("div", { class: "order-list" });
      let dragSrcIdx = null;
      let stopAutoScroll = null;

      items.forEach((text, idx) => {
        const isCorrect = submitted ? text === correctOrder[idx] : null;
        const itemClass =
          "order-item" + (submitted ? (isCorrect ? " correct" : " wrong") : "");

        const feedbackEl = submitted
          ? h("span", { class: "order-check" }, [
              isCorrect
                ? "✓"
                : `✗ · should be #${correctOrder.indexOf(text) + 1}`,
            ])
          : h("div", { class: "order-arrows" }, [
              h("button", {
                class: "arrow-btn",
                disabled: idx === 0 ? "true" : null,
                "aria-label": "Move up",
                onclick: (e) => { e.stopPropagation(); moveItem(idx, -1); },
              }, ["↑"]),
              h("button", {
                class: "arrow-btn",
                disabled: idx === items.length - 1 ? "true" : null,
                "aria-label": "Move down",
                onclick: (e) => { e.stopPropagation(); moveItem(idx, 1); },
              }, ["↓"]),
            ]);

        const item = h("div", { class: itemClass }, [
          h("span", { class: "drag-handle", "aria-hidden": "true" }, ["⠿"]),
          h("span", { class: "order-idx" }, [String(idx + 1)]),
          h("span", { class: "order-name step-name" }, [text]),
          feedbackEl,
        ]);

        if (!submitted) {
          item.setAttribute("draggable", "true");

          item.addEventListener("dragstart", (e) => {
            dragSrcIdx = idx;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(idx));
            stopAutoScroll = enableDragAutoScroll();
            setTimeout(() => item.classList.add("dragging"), 0);
          });
          item.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            dragSrcIdx = null;
            if (stopAutoScroll) { stopAutoScroll(); stopAutoScroll = null; }
          });
          item.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            list
              .querySelectorAll(".order-item")
              .forEach((el) => el.classList.remove("drag-over"));
            item.classList.add("drag-over");
          });
          item.addEventListener("dragleave", (e) => {
            if (!item.contains(e.relatedTarget)) item.classList.remove("drag-over");
          });
          item.addEventListener("drop", (e) => {
            e.preventDefault();
            e.stopPropagation();
            item.classList.remove("drag-over");
            const src = dragSrcIdx;
            if (src !== null && src !== idx) {
              const dragged = items.splice(src, 1)[0];
              items.splice(idx, 0, dragged);
              dragSrcIdx = null;
              render();
            }
          });
        }

        list.appendChild(item);
      });

      if (!submitted) {
        addTouchDrag(list, (from, to) => {
          const dragged = items.splice(from, 1)[0];
          items.splice(to, 0, dragged);
          render();
        });
      }

      pane.appendChild(list);

      if (!submitted) {
        pane.appendChild(
          h("div", { class: "drill-actions" }, [
            h("button", { class: "btn btn-primary", onclick: checkOrder }, [
              "Check my order",
            ]),
            h("button", { class: "btn btn-ghost", onclick: reshuffleDrill }, [
              "Reshuffle",
            ]),
          ])
        );
      } else {
        const allCorrect = correctness.every(Boolean);
        const m2 = getSectionMastery(section.name);
        pane.appendChild(
          h("div", {
            class: "drill-result " + (allCorrect ? "result-pass" : "result-fail"),
          }, [
            h("div", { class: "result-icon" }, [allCorrect ? "✓" : "✗"]),
            allCorrect
              ? h("div", {}, [
                  h("strong", {}, [m2.mastered ? "Section mastered!" : "Correct order!"]),
                  h("p", {}, [
                    m2.mastered
                      ? "You know this section cold."
                      : `Streak: ${m2.streak} / ${STEPSEQ_MASTERY_RUNS} — keep going!`,
                  ]),
                ])
              : h("div", {}, [
                  h("strong", {}, ["Not quite — check corrections above."]),
                  h("p", {}, [
                    "Streak reset. Try again, or open Full sheet to review.",
                  ]),
                ]),
            h("div", { class: "drill-actions" }, [
              h("button", { class: "btn btn-primary", onclick: reshuffleDrill }, [
                "Try again",
              ]),
              drillableSections.length > 1
                ? h("button", {
                    class: "btn",
                    onclick: () => { activeSection = null; render(); },
                  }, ["Pick another section"])
                : null,
              h("button", {
                class: "btn btn-ghost",
                onclick: () =>
                  ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" }),
              }, ["Full sheet →"]),
            ]),
          ])
        );

        if (!allCorrect) {
          pane.appendChild(
            h("details", { class: "hint-details" }, [
              h("summary", { class: "muted" }, ["Show correct order"]),
              h("ol", { class: "correct-order-list" },
                correctOrder.map((t) => h("li", {}, [t]))
              ),
            ])
          );
          const missedTexts = items.filter((_, idx) => !correctness[idx]);
          if (missedTexts.length > 0) {
            pane.appendChild(
              h("div", { class: "drill-actions" }, [
                h("button", { class: "btn btn-primary", onclick: () => startMiniDrill(missedTexts) }, [
                  `Practice ${missedTexts.length} missed step${missedTexts.length === 1 ? "" : "s"} →`,
                ]),
              ])
            );
          }
        }
      }
    }

    function startMiniDrill(missedTexts) {
      const miniCorrect = activeSection.steps.map((s) => s.text).filter((t) => missedTexts.includes(t));
      let miniItems = shuffle([...missedTexts]);
      let miniSubmitted = false;
      let miniCorrectness = [];
      let dragSrcIdx = null;

      function renderMini() {
        pane.innerHTML = "";
        pane.appendChild(
          h("div", { class: "drill-header" }, [
            h("h2", { class: "drill-title" }, ["Practicing missed steps"]),
            h("div", { class: "card-section" }, [activeSection.name]),
            h("p", { class: "drill-hint muted" }, ["Drag to reorder · tap ↑↓ to nudge"]),
          ])
        );

        const list = h("div", { class: "order-list" });
        miniItems.forEach((text, idx) => {
          let itemClass = "order-item";
          let feedbackEl = h("span", {});
          if (miniSubmitted) {
            itemClass += miniCorrectness[idx] ? " item-correct" : " item-wrong";
            if (!miniCorrectness[idx]) {
              const correctPos = miniCorrect.indexOf(text);
              feedbackEl = h("span", { class: "order-feedback" }, [
                `→ position ${correctPos + 1}`,
              ]);
            }
          }

          const item = h("div", { class: itemClass }, [
            h("span", { class: "drag-handle", "aria-hidden": "true" }, ["⠿"]),
            h("span", { class: "order-idx" }, [String(idx + 1)]),
            h("span", { class: "order-name step-name" }, [text]),
            feedbackEl,
            h("div", { class: "arrow-btns" }, [
              h("button", {
                class: "arrow-btn",
                disabled: idx === 0 ? "true" : null,
                "aria-label": "Move up",
                onclick: (e) => { e.stopPropagation(); miniMove(idx, -1); },
              }, ["↑"]),
              h("button", {
                class: "arrow-btn",
                disabled: idx === miniItems.length - 1 ? "true" : null,
                "aria-label": "Move down",
                onclick: (e) => { e.stopPropagation(); miniMove(idx, 1); },
              }, ["↓"]),
            ]),
          ]);

          if (!miniSubmitted) {
            item.setAttribute("draggable", "true");
            item.addEventListener("dragstart", (e) => {
              dragSrcIdx = idx;
              e.dataTransfer.effectAllowed = "move";
              setTimeout(() => item.classList.add("dragging"), 0);
            });
            item.addEventListener("dragend", () => {
              item.classList.remove("dragging");
              dragSrcIdx = null;
            });
            item.addEventListener("dragover", (e) => {
              e.preventDefault();
              list.querySelectorAll(".order-item").forEach((el) => el.classList.remove("drag-over"));
              item.classList.add("drag-over");
            });
            item.addEventListener("dragleave", (e) => {
              if (!item.contains(e.relatedTarget)) item.classList.remove("drag-over");
            });
            item.addEventListener("drop", (e) => {
              e.preventDefault();
              e.stopPropagation();
              item.classList.remove("drag-over");
              const src = dragSrcIdx;
              if (src !== null && src !== idx) {
                const dragged = miniItems.splice(src, 1)[0];
                miniItems.splice(idx, 0, dragged);
                dragSrcIdx = null;
                renderMini();
              }
            });
          }
          list.appendChild(item);
        });
        if (!miniSubmitted) {
          addTouchDrag(list, (from, to) => {
            const dragged = miniItems.splice(from, 1)[0];
            miniItems.splice(to, 0, dragged);
            renderMini();
          });
        }
        pane.appendChild(list);

        if (!miniSubmitted) {
          pane.appendChild(
            h("div", { class: "drill-actions" }, [
              h("button", { class: "btn btn-primary", onclick: miniCheck }, ["Check my order"]),
            ])
          );
        } else {
          const allOk = miniCorrectness.every(Boolean);
          pane.appendChild(
            h("div", { class: "drill-result " + (allOk ? "result-pass" : "result-fail") }, [
              h("div", { class: "result-icon" }, [allOk ? "✓" : "✗"]),
              h("div", {}, [
                h("strong", {}, [allOk ? "Got them all!" : "Check corrections above."]),
              ]),
            ])
          );
          pane.appendChild(
            h("div", { class: "drill-actions" }, [
              h("button", { class: "btn btn-primary", onclick: reshuffleDrill }, ["Back to full drill"]),
            ])
          );
        }
      }

      function miniMove(idx, dir) {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= miniItems.length) return;
        [miniItems[idx], miniItems[newIdx]] = [miniItems[newIdx], miniItems[idx]];
        renderMini();
      }

      function miniCheck() {
        miniCorrectness = miniItems.map((t, i) => t === miniCorrect[i]);
        miniSubmitted = true;
        renderMini();
      }

      renderMini();
    }

    function moveItem(idx, dir) {
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= items.length) return;
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      render();
    }

    function checkOrder() {
      const correctOrder = activeSection.steps.map((s) => s.text);
      submitted = true;
      correctness = items.map((text, idx) => text === correctOrder[idx]);
      const allCorrect = correctness.every(Boolean);

      if (!ctx.state.drills.stepseq[sheet.id][activeSection.name]) {
        ctx.state.drills.stepseq[sheet.id][activeSection.name] = {
          streak: 0, attempts: 0, mastered: false,
        };
      }
      const rec = ctx.state.drills.stepseq[sheet.id][activeSection.name];
      rec.attempts += 1;
      if (allCorrect) {
        rec.streak += 1;
        if (rec.streak >= STEPSEQ_MASTERY_RUNS) rec.mastered = true;
      } else {
        rec.streak = 0;
      }
      ctx.save();
      render();
    }

    function reshuffleDrill() {
      items = shuffle(activeSection.steps.map((s) => s.text));
      submitted = false;
      correctness = [];
      render();
    }

    // Auto-start single-section sheets
    if (activeSection) {
      items = shuffle(activeSection.steps.map((s) => s.text));
    }

    render();
    return pane;
  };

  // ---------- WHAT'S NEXT? DRILL -------------------------------------
  Views.whatNextDrill = (ctx, sheet) => {
    if (!ctx.state.drills.whatnext) ctx.state.drills.whatnext = {};
    if (!ctx.state.drills.whatnext[sheet.id]) {
      ctx.state.drills.whatnext[sheet.id] = { streak: 0, attempts: 0, mastered: false };
    }

    const seq = buildFlatSequence(sheet);

    if (seq.length < 2) {
      return h("div", { class: "empty-state" }, [
        h("div", { class: "big" }, ["—"]),
        h("p", {}, ["This sheet doesn't have enough steps for this drill."]),
      ]);
    }

    function shuffleArr(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    const pane = h("div", { class: "drill-pane" });
    let currentIdx = 0;
    let choices = [];
    let answered = false;
    let selectedChoice = null;

    function pickRound() {
      currentIdx = Math.floor(Math.random() * (seq.length - 1));
      const correctNext = seq[currentIdx + 1].text;
      const promptText = seq[currentIdx].text;
      const pool = seq.map((s) => s.text).filter((t) => t !== promptText && t !== correctNext);
      const distractors = shuffleArr(pool).slice(0, 3);
      choices = shuffleArr([correctNext, ...distractors]);
      answered = false;
      selectedChoice = null;
    }

    function getRec() {
      return ctx.state.drills.whatnext[sheet.id];
    }

    function render() {
      pane.innerHTML = "";
      const rec = getRec();

      const pips = [];
      for (let i = 0; i < WHATNEXT_MASTERY_RUNS; i++) {
        pips.push(h("span", { class: "streak-pip" + (i < rec.streak ? " filled" : "") }));
      }
      pane.appendChild(
        h("div", { class: "drill-header" }, [
          h("div", { class: "drill-title-row" }, [
            h("h2", { class: "drill-title" }, ["What's Next?"]),
            rec.mastered ? h("span", { class: "mastered-badge" }, ["✓ Mastered"]) : null,
            helpIcon("What's Next? Drill",
              `<p>You're shown a step and must pick what comes immediately after it — choose from 4 options.</p>
              <p><strong>Mastery</strong> = 3 correct answers in a row. Any wrong answer resets your streak.</p>
              <p>Good for reinforcing step sequence under pressure without having to type or drag.</p>`
            ),
          ]),
          h("div", { class: "streak-row" }, [
            h("span", { class: "streak-label" }, ["Streak "]),
            ...pips,
            h("span", { class: "muted" }, [` ${rec.streak}/${WHATNEXT_MASTERY_RUNS}`]),
          ]),
        ])
      );

      pane.appendChild(
        h("div", { class: "whatnext-prompt" }, [
          h("div", { class: "card-section" }, [seq[currentIdx].sectionName]),
          h("div", { class: "whatnext-prompt-text" }, [seq[currentIdx].text]),
          h("div", { class: "whatnext-question" }, ["What comes next?"]),
        ])
      );

      const correctText = seq[currentIdx + 1].text;
      const letters = ["A", "B", "C", "D"];
      const choiceEls = choices.map((text, i) => {
        let cls = "whatnext-choice";
        if (answered) {
          if (text === correctText) cls += " correct";
          else if (text === selectedChoice) cls += " wrong";
          else cls += " dim";
        }
        return h("button", {
          class: cls,
          disabled: answered,
          onclick: () => checkChoice(text),
        }, [
          h("span", { class: "choice-letter" }, [letters[i]]),
          h("span", { class: "choice-text" }, [text]),
        ]);
      });
      pane.appendChild(h("div", { class: "whatnext-choices" }, choiceEls));

      if (answered) {
        const isCorrect = selectedChoice === correctText;
        pane.appendChild(
          h("div", { class: isCorrect ? "drill-result result-pass" : "drill-result result-fail" }, [
            h("div", { class: "result-icon" }, [isCorrect ? "✓" : "✗"]),
            h("p", {}, [isCorrect ? "Correct!" : `The next step is: "${correctText}"`]),
            ...(!isCorrect ? [h("p", { class: "muted" }, [`Section: ${seq[currentIdx + 1].sectionName}`])] : []),
          ])
        );
        pane.appendChild(
          h("div", { class: "drill-actions" }, [
            h("button", { class: "btn btn-primary", onclick: () => nextQuestion() }, ["Next question →"]),
          ])
        );
      }
    }

    function checkChoice(chosen) {
      answered = true;
      selectedChoice = chosen;
      const isCorrect = chosen === seq[currentIdx + 1].text;
      const rec = getRec();
      rec.attempts += 1;
      if (isCorrect) {
        rec.streak += 1;
        if (rec.streak >= WHATNEXT_MASTERY_RUNS) rec.mastered = true;
      } else {
        rec.streak = 0;
      }
      ctx.save();
      render();
    }

    function nextQuestion() {
      pickRound();
      render();
    }

    pickRound();
    render();
    return pane;
  };

  // ---------- BLANK SHEET RECALL ------------------------------------
  Views.blankRecall = (ctx, sheet) => {
    if (!ctx.state.drills.blankrecall) ctx.state.drills.blankrecall = {};

    const expectedSteps = buildFlatSequence(sheet);
    const pane = h("div", { class: "drill-pane" });
    let phase = "input";
    let lastResults = null;
    let textarea = null;
    let missedSteps = [];
    let missedIdx = 0;

    function getOrCreateRec() {
      if (!ctx.state.drills.blankrecall[sheet.id]) {
        ctx.state.drills.blankrecall[sheet.id] = { attempts: 0, lastAttemptAt: null, lastScore: null, bestPct: 0 };
      }
      return ctx.state.drills.blankrecall[sheet.id];
    }

    function render() {
      pane.innerHTML = "";
      if (phase === "input") renderInput();
      else if (phase === "missed") renderMissedCard();
      else renderResults();
    }

    function renderInput() {
      const rec = ctx.state.drills.blankrecall[sheet.id];
      pane.appendChild(
        h("div", { class: "drill-header" }, [
          h("div", { class: "drill-title-row" }, [
            h("h2", {}, ["Blank Sheet Recall"]),
            rec && rec.bestPct > 0
              ? h("span", { class: "mastered-badge" }, [`Best: ${rec.bestPct}%`])
              : null,
            helpIcon("Blank Sheet Recall",
              `<p>Type every step you remember from memory, one per line. Order doesn't need to be perfect.</p>
              <p><strong>Fuzzy matching</strong> — you don't need word-for-word accuracy, just close enough in meaning.</p>
              <p>After submitting, you can drill any missed steps one by one with reveal cards.</p>
              <p>Your best score is tracked. Hit <em>View full sheet</em> first if you want to preview what's being tested.</p>`
            ),
          ]),
        ])
      );
      pane.appendChild(
        h("p", { class: "muted" }, [
          "Write every step from memory, one per line. Word-for-word isn't required — we use fuzzy matching.",
        ])
      );
      textarea = h("textarea", {
        class: "recall-textarea",
        rows: "20",
        placeholder: "Step 1\nStep 2\n...",
      }, []);
      pane.appendChild(textarea);
      pane.appendChild(
        h("div", { class: "drill-actions" }, [
          h("button", { class: "btn btn-primary", onclick: onSubmit }, ["Check my recall"]),
          h("button", {
            class: "btn btn-ghost",
            onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" }),
          }, ["View full sheet →"]),
        ])
      );
      if (rec && rec.attempts > 0) {
        pane.appendChild(
          h("p", { class: "muted small" }, [
            `${rec.attempts} attempt${rec.attempts === 1 ? "" : "s"} · best ${rec.bestPct}%`,
          ])
        );
      }
    }

    function onSubmit() {
      const raw = textarea ? textarea.value : "";
      const typedLines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!typedLines.length) {
        ctx.toast("Type at least one step.");
        return;
      }
      lastResults = matchLines(typedLines, expectedSteps);

      // Detect out-of-order: matched items whose expected index is less than the previous matched item's expected index
      const matchedIndices = [];
      lastResults.forEach((r, i) => {
        if (r.matched) matchedIndices.push({ resultIdx: i, expectedIdx: i });
      });
      // Mark out-of-order: if a matched item's position in expectedSteps is behind a previously matched item
      let lastExpectedIdx = -1;
      lastResults.forEach((r) => {
        if (!r.matched) return;
        const eIdx = expectedSteps.indexOf(r.expected);
        if (eIdx < lastExpectedIdx) {
          r.outOfOrder = true;
        } else {
          lastExpectedIdx = eIdx;
        }
      });

      const rec = getOrCreateRec();
      const matched = lastResults.filter((r) => r.matched).length;
      const total = lastResults.length;
      const pct = Math.round((matched / total) * 100);
      rec.attempts += 1;
      rec.lastAttemptAt = Date.now();
      rec.lastScore = { matched, missed: total - matched, total, pct };
      rec.bestPct = Math.max(rec.bestPct, pct);
      ctx.save();

      phase = "results";
      render();
    }

    function renderMissedCard() {
      const step = missedSteps[missedIdx];
      const total = missedSteps.length;
      let revealed = false;

      pane.appendChild(
        h("div", { class: "drill-header" }, [
          h("h2", {}, ["Missed Step Review"]),
          h("div", { class: "study-meta" }, [
            h("span", {}, [`Step ${missedIdx + 1} of ${total}`]),
          ]),
        ])
      );

      const answer = h("div", { class: "card-answer", style: "display:none" }, [step.text]);

      const nextLabel = missedIdx + 1 < total ? "Next →" : "Back to results";
      const nextBtn = h("button", { class: "btn btn-primary", style: "display:none", onclick: () => {
        if (missedIdx + 1 < total) {
          missedIdx++;
          render();
        } else {
          phase = "results";
          render();
        }
      } }, [nextLabel]);

      const revealBtn = h("button", { class: "btn btn-primary", onclick: () => {
        revealed = true;
        answer.style.display = "";
        revealBtn.style.display = "none";
        nextBtn.style.display = "";
      } }, ["Reveal step"]);

      pane.appendChild(
        h("div", { class: "card" }, [
          h("div", { class: "card-section" }, [step.sectionName]),
          h("div", { class: "card-prompt" }, ["What is this step?"]),
          answer,
          h("div", { class: "card-actions" }, [revealBtn, nextBtn]),
        ])
      );
    }

    function renderResults() {
      const results = lastResults;
      const matched = results.filter((r) => r.matched).length;
      const total = results.length;
      const pct = Math.round((matched / total) * 100);

      const scoreClass = pct >= 80 ? "score-good" : pct >= 50 ? "score-ok" : "score-poor";
      pane.appendChild(
        h("div", { class: "drill-header" }, [
          h("h2", {}, ["Blank Sheet Recall"]),
          h("div", { class: "recall-score " + scoreClass }, [
            `${matched} / ${total} steps recalled (${pct}%)`,
          ]),
        ])
      );

      const listEl = h("div", { class: "recall-results" });
      results.forEach((r) => {
        let icon, cls;
        if (r.matched && r.outOfOrder) { icon = "~"; cls = "recall-ooo"; }
        else if (r.matched)            { icon = "✓"; cls = "recall-match"; }
        else                           { icon = "✗"; cls = "recall-miss"; }

        const row = h("div", { class: "recall-row " + cls }, [
          h("span", { class: "recall-icon" }, [icon]),
          h("span", { class: "recall-step" }, [r.expected.text]),
        ]);
        if (r.matched && r.score < 0.9 && r.typedLine) {
          row.appendChild(h("div", { class: "recall-typed muted small" }, [`you wrote: "${r.typedLine}"`]));
        }
        listEl.appendChild(row);
      });
      pane.appendChild(listEl);

      const missedResults = results.filter((r) => !r.matched);
      if (missedResults.length > 0) {
        pane.appendChild(
          h("div", { class: "drill-actions" }, [
            h("button", { class: "btn btn-primary", onclick: () => {
              missedSteps = missedResults.map((r) => r.expected);
              missedIdx = 0;
              phase = "missed";
              render();
            } }, [
              `Practice ${missedResults.length} missed step${missedResults.length === 1 ? "" : "s"} →`,
            ]),
          ])
        );
      }

      pane.appendChild(
        h("div", { class: "drill-actions" }, [
          h("button", { class: "btn btn-primary", onclick: () => { phase = "input"; render(); } }, ["Try again"]),
          h("button", {
            class: "btn btn-ghost",
            onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" }),
          }, ["View full sheet →"]),
        ])
      );
    }

    render();
    return pane;
  };

  // ---------- CRITICAL FAIL MODE -------------------------------------
  /**
   * Drill all critical criteria for a sheet with SRS scheduling.
   * Each criterion is revealed on demand; the user self-rates:
   *   ✗ Would fail   → "again"  (resurfaces in 30 s)
   *   ~ Close call   → "hard"
   *   ✓ Know it cold → "easy"
   * Card IDs: "critical::<sheetId>::<idx>" stored in state.srs.
   */
  Views.criticalDrill = (ctx, sheet) => {
    const criteria = sheet.criticalCriteria || [];

    if (criteria.length === 0) {
      return h("div", { class: "empty-state" }, [
        h("div", { class: "big" }, ["—"]),
        h("p", {}, ["No critical criteria found for this sheet."]),
        h("p", {}, [
          h("button", {
            class: "btn btn-primary",
            onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" }),
          }, ["View full sheet →"]),
        ]),
      ]);
    }

    const now = Date.now();
    const allCards = criteria.map((text, idx) => ({
      id: `critical::${sheet.id}::${idx}`,
      text,
      idx,
      section: "CRITICAL CRITERIA",
    }));

    const pane = h("div", { class: "study-pane" });

    function buildCritQueue(cram) {
      if (cram) {
        return allCards.map((card) => ({ card, rec: SRS.getRecord(ctx.state, card.id) }));
      }
      const due = [];
      const fresh = [];
      for (const card of allCards) {
        const rec = ctx.state.srs[card.id];
        if (!rec || !rec.due || rec.due <= 0) {
          fresh.push({ card, rec: SRS.defaultRecord() });
        } else if (rec.due <= now) {
          due.push({ card, rec });
        }
        // future-due: not shown until SRS says it's time
      }
      due.sort((a, b) => a.rec.due - b.rec.due);
      return [...due, ...fresh];
    }

    let queue = buildCritQueue(false);

    function startSession(q) {
      queue = q;
      showAt(0);
    }

    function showAt(i) {
      pane.innerHTML = "";

      if (queue.length === 0) {
        // Nothing due: all criteria are scheduled for the future
        pane.appendChild(
          h("div", { class: "empty-state" }, [
            h("div", { class: "big" }, ["✓"]),
            h("p", {}, ["All critical criteria are on schedule."]),
            h("p", { class: "muted" }, ["SRS will bring these back when it's time."]),
            h("p", {}, [
              h("button", {
                class: "btn btn-primary",
                onclick: () => startSession(buildCritQueue(true)),
              }, ["Drill all anyway →"]),
              " ",
              h("button", { class: "btn", onclick: () => ctx.navigate({ view: "home" }) }, ["Home"]),
            ]),
          ])
        );
        return;
      }

      if (i >= queue.length) {
        pane.appendChild(
          h("div", { class: "empty-state" }, [
            h("div", { class: "big" }, ["✓"]),
            h("p", {}, ["Critical criteria session complete."]),
            h("p", { class: "muted" }, [
              `Reviewed ${queue.length} criterion${queue.length === 1 ? "" : "ia"}.`,
            ]),
            h("p", {}, [
              h("button", {
                class: "btn btn-primary",
                onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "critical" }),
              }, ["Go again"]),
              " ",
              h("button", { class: "btn", onclick: () => ctx.navigate({ view: "home" }) }, ["Home"]),
            ]),
          ])
        );
        return;
      }

      pane.appendChild(buildCritCard(i));
    }

    function buildCritCard(i) {
      const { card } = queue[i];

      const CRIT_HELP = `<p><strong>Critical criteria</strong> are the auto-fail behaviors — doing or failing to do any one of these immediately fails you on the NREMT exam, regardless of everything else.</p>
        <p>Each criterion is shown immediately (no reveal needed). Rate yourself:</p>
        <ul>
        <li><strong>✗ Would fail</strong> — you'd have missed this; resurfaces in ~30 seconds</li>
        <li><strong>~ Close call</strong> — you'd probably catch it, but not automatically; returns sooner</li>
        <li><strong>✓ Know it cold</strong> — automatic; scheduled further out</li>
        </ul>
        <p>Don't advance to a real exam until every criterion is a reflex, not a memory.</p>`;
      const meta = h("div", { class: "study-meta" }, [
        h("span", {}, [`Criterion ${i + 1} of ${queue.length}`]),
        h("span", { class: "study-meta-right" }, [
          SRS.describeDue(ctx.state.srs[card.id]),
          helpIcon("Critical Criteria Drill", CRIT_HELP),
        ]),
      ]);

      const sheetLabel = h("div", { class: "card-section" }, [
        sheet.id.toUpperCase() + " · CRITICAL CRITERIA",
      ]);

      const critBadge = h("div", { class: "crit-badge" }, ["⚠ Auto-fail if missed"]);

      // Show criterion text immediately — user rates whether they'd catch it
      const criterionText = h("div", { class: "card-answer crit-answer" }, [card.text]);

      const prompt = h("div", { class: "card-prompt" }, [
        "Would you catch this in an exam?",
      ]);

      // 3-button rating shown directly — no reveal step needed
      const grades = h("div", { class: "grade-row crit-grade-row" }, [
        h("button", { class: "grade again", onclick: () => doGrade("again") }, [
          "✗ Would fail", h("small", {}, ["< 30 sec"]),
        ]),
        h("button", { class: "grade hard", onclick: () => doGrade("hard") }, [
          "~ Close call", h("small", {}, [dueLabel("hard", ctx, card)]),
        ]),
        h("button", { class: "grade easy", onclick: () => doGrade("easy") }, [
          "✓ Know it cold", h("small", {}, [dueLabel("easy", ctx, card)]),
        ]),
      ]);

      const cardEl = h("div", { class: "card crit-card" }, [
        sheetLabel,
        critBadge,
        criterionText,
        prompt,
        grades,
      ]);

      function doGrade(name) {
        const before = SRS.getRecord(ctx.state, card.id);
        const after = SRS.grade(before, name);
        // Critical criteria resurface faster on "again" — 30 s instead of 1 min
        if (name === "again") {
          after.due = Date.now() + 30 * 1000;
        }
        ctx.state.srs[card.id] = after;
        ctx.state.stats.totalReviews += 1;
        ctx.state.stats.lastReviewedAt = Date.now();
        ctx.save();
        if (name === "again") {
          queue.push({ card, rec: after });
        }
        showAt(i + 1);
      }

      // Keyboard: space/enter to reveal; 1/2/3 to grade
      cardEl.tabIndex = 0;
      // Keyboard: 1/2/3 to grade directly (no reveal step)
      cardEl.addEventListener("keydown", (e) => {
        if (e.key === "1") doGrade("again");
        if (e.key === "2") doGrade("hard");
        if (e.key === "3") doGrade("easy");
      });
      setTimeout(() => cardEl.focus(), 0);

      return h("div", {}, [meta, cardEl]);
    }

    showAt(0);
    return pane;
  };

  // ---------- STATS ---------------------------------------------------
  Views.stats = (ctx) => {
    const state = ctx.state;
    const now = Date.now();
    const data = NREMT_DATA;

    // Aggregates
    let reviewed = 0, dueNow = 0, totalMastery = 0;
    for (const sheet of data.sheets) {
      totalMastery += SRS.masteryFor(state, sheet);
      for (const card of sheet.cards) {
        const rec = state.srs[card.id];
        if (rec && rec.reps) reviewed++;
        if (!rec || rec.due <= now) dueNow++;
      }
    }
    const overallPct = data.sheets.length
      ? Math.round((totalMastery / data.sheets.length) * 100)
      : 0;
    const total = data.totalCards;

    const streak = state.stats.dailyStreak || 0;
    const longestStreak = state.stats.longestStreak || 0;

    const hasAchievements = typeof Achievements !== "undefined";
    const allAchs = hasAchievements ? Achievements.getAll(state) : [];
    const unlockedCount = allAchs.filter((a) => a.unlockedAt).length;

    const wrap = h("div");

    // ---- Hero banner ----
    const heroIcon = streak >= 7 ? "🔥" : streak >= 3 ? "🔥" : streak >= 1 ? "📅" : "📅";
    wrap.appendChild(h("div", { class: "stats-hero" }, [
      h("div", { class: "hero-block" }, [
        h("div", { class: "hero-icon-big" }, [heroIcon]),
        h("div", { class: "hero-num" }, [String(streak)]),
        h("div", { class: "hero-label" }, ["day streak"]),
      ]),
      h("div", { class: "hero-block hero-center" }, [
        h("div", { class: "hero-num hero-num-big" }, [overallPct + "%"]),
        h("div", { class: "hero-label" }, ["overall mastery"]),
        h("div", { class: "hero-bar-wrap" }, [
          h("div", { class: "hero-bar" }, [
            h("div", { class: "hero-bar-fill", style: `width:${overallPct}%` }),
          ]),
        ]),
      ]),
      hasAchievements ? h("div", { class: "hero-block" }, [
        h("div", { class: "hero-icon-big" }, ["🏅"]),
        h("div", { class: "hero-num" }, [unlockedCount + "/" + allAchs.length]),
        h("div", { class: "hero-label" }, ["achievements"]),
      ]) : null,
    ]));

    // ---- Key numbers ----
    wrap.appendChild(h("div", { class: "stat-grid" }, [
      statCard("📝", state.stats.totalReviews, "Total Reviews"),
      statCard("📖", reviewed + " / " + total, "Cards Studied"),
      statCard(dueNow > 0 ? "⚠️" : "✅", dueNow > 0 ? dueNow : "None", "Due Now", dueNow > 0 ? "stat-card-warn" : ""),
      statCard("🗓️", longestStreak + (longestStreak === 1 ? " day" : " days"), "Best Streak"),
    ]));

    // ---- Achievements ----
    if (hasAchievements) {
      wrap.appendChild(h("h2", {}, [
        "Achievements ",
        h("span", { class: "ach-count-badge" }, [`${unlockedCount}/${allAchs.length}`]),
      ]));

      const achGrid = h("div", { class: "ach-grid" });
      for (const ach of allAchs) {
        const unlocked = !!ach.unlockedAt;
        achGrid.appendChild(h("div", { class: "ach-card" + (unlocked ? " ach-unlocked" : " ach-locked") }, [
          h("div", { class: "ach-icon" }, [ach.icon]),
          h("div", { class: "ach-body" }, [
            h("div", { class: "ach-name" }, [ach.name]),
            h("div", { class: "ach-desc" }, [unlocked ? ach.desc : "???"]),
            unlocked ? h("div", { class: "ach-date" }, [
              "Unlocked " + new Date(ach.unlockedAt).toLocaleDateString(),
            ]) : null,
          ]),
          unlocked ? h("div", { class: "ach-check" }, ["✓"]) : null,
        ]));
      }
      wrap.appendChild(achGrid);
    }

    // ---- Sheet progress ----
    wrap.appendChild(h("h2", {}, ["Progress by Sheet"]));
    const drillDefs = [
      { key: "secorder",    label: "Order" },
      { key: "stepseq",     label: "Steps" },
      { key: "whatnext",    label: "Next?" },
      { key: "blankrecall", label: "Recall", isPct: true },
      { key: "spokenscript", label: "Spoken" },
    ];

    const sheetList = h("div", { class: "sheet-progress-list" });
    for (const sheet of data.sheets) {
      const mastery = SRS.masteryFor(state, sheet);
      const pct = Math.round(mastery * 100);
      const due = SRS.dueCount(state, sheet);
      const notesCount = Notes.countSheetNotes(state, sheet);

      const drillBadges = drillDefs.map((d) => {
        const rec = (state.drills[d.key] || {})[sheet.id];
        let cls = "drill-badge drill-none";
        let label = d.label;
        if (d.isPct) {
          if (rec && rec.attempts > 0) {
            const bp = Math.round(rec.bestPct || 0);
            cls = bp >= 80 ? "drill-badge drill-good" : bp >= 40 ? "drill-badge drill-mid" : "drill-badge drill-low";
            label = d.label + " " + bp + "%";
          }
        } else {
          if (rec && rec.mastered) {
            cls = "drill-badge drill-good";
            label = d.label + " ✓";
          } else if (rec && rec.streak > 0) {
            cls = "drill-badge drill-mid";
            label = d.label + " " + rec.streak + "/3";
          }
        }
        return h("span", { class: cls }, [label]);
      });

      sheetList.appendChild(h("div", { class: "sheet-progress-card" }, [
        h("div", { class: "spc-header" }, [
          h("button", {
            class: "btn-link spc-title",
            onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "study" }),
          }, [sheet.title]),
          h("div", { class: "spc-meta" }, [
            due > 0
              ? h("span", { class: "spc-due" }, [due + " due"])
              : h("span", { class: "spc-ok" }, ["all good"]),
            notesCount > 0
              ? h("span", { class: "spc-notes" }, [notesCount + " note" + (notesCount !== 1 ? "s" : "")])
              : null,
          ]),
        ]),
        h("div", { class: "spc-bar-row" }, [
          h("div", { class: "spc-bar" }, [
            h("div", { class: "spc-fill", style: `width:${pct}%` }),
          ]),
          h("span", { class: "spc-pct" }, [pct + "%"]),
        ]),
        h("div", { class: "spc-drills" }, drillBadges),
      ]));
    }
    wrap.appendChild(sheetList);

    return wrap;
  };

  function statCard(icon, num, label, extraClass) {
    return h("div", { class: "stat-card" + (extraClass ? " " + extraClass : "") }, [
      h("div", { class: "stat-card-icon" }, [icon]),
      h("div", { class: "num" }, [String(num)]),
      h("div", { class: "label" }, [label]),
    ]);
  }

  // ---------- SETTINGS / BACKUP --------------------------------------
  Views.settings = (ctx) => {
    const wrap = h("div");
    wrap.append(
      h("h1", {}, ["Backup & Settings"]),
      h("p", { class: "muted" }, [
        "Progress + notes live in this browser's local storage. Export a JSON file to back them up or move them to another browser.",
      ]),
    );

    const fileInput = h("input", { type: "file", accept: "application/json", style: "display:none" });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const next = await Storage.importFromFile(file);
        Object.assign(ctx.state, next);
        ctx.save();
        ctx.toast("Import successful");
        ctx.refresh();
      } catch (err) {
        alert("Couldn't import that file: " + err.message);
      }
    });

    wrap.appendChild(h("div", { class: "settings-section" }, [
      h("h3", {}, ["Export progress"]),
      h("p", { class: "muted" }, ["Downloads a nremt-progress-YYYY-MM-DD.json file you can keep in this folder."]),
      h("div", { class: "settings-row" }, [
        h("button", { class: "btn btn-primary", onclick: () => Storage.exportToFile(ctx.state) }, ["Download JSON"]),
      ]),
    ]));

    wrap.appendChild(h("div", { class: "settings-section" }, [
      h("h3", {}, ["Import progress"]),
      h("p", { class: "muted" }, ["Replaces current progress + notes with the contents of a previously exported file."]),
      h("div", { class: "settings-row" }, [
        h("button", { class: "btn", onclick: () => fileInput.click() }, ["Choose JSON file…"]),
        fileInput,
      ]),
    ]));

    wrap.appendChild(h("div", { class: "settings-section" }, [
      h("h3", {}, ["Reset everything"]),
      h("p", { class: "muted" }, ["Erases all SRS progress and notes. There's no undo — export first if you might want them."]),
      h("div", { class: "settings-row" }, [
        h("button", { class: "btn", onclick: () => {
          if (!confirm("Erase ALL local progress and notes?")) return;
          Storage.reset();
          Object.assign(ctx.state, {
            version: 1, srs: {}, notes: { step: {}, sheet: {} },
            stats: { totalReviews: 0, lastReviewedAt: null },
            drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {} },
          });
          ctx.toast("Reset complete");
          ctx.refresh();
        } }, ["Reset"]),
      ]),
    ]));

    return wrap;
  };

  // ---------- SPOKEN SCRIPT DRILL ------------------------------------
  Views.spokenScript = (ctx, sheet) => {
    if (!ctx.state.drills.spokenscript) ctx.state.drills.spokenscript = {};

    const steps = buildScriptSequence(sheet);
    const pane = h("div", { class: "drill-pane" });
    let phase = "practicing";
    let stepIdx = 0;
    let results = [];       // { step, typed, matched, score }
    let checkedCurrent = false;

    function getRec() {
      if (!ctx.state.drills.spokenscript[sheet.id]) {
        ctx.state.drills.spokenscript[sheet.id] = { streak: 0, mastered: false, attempts: 0, lastScore: null };
      }
      return ctx.state.drills.spokenscript[sheet.id];
    }

    function render() {
      pane.innerHTML = "";
      if (steps.length === 0) {
        renderFallback();
      } else if (phase === "practicing") {
        renderPractice();
      } else {
        renderResults();
      }
    }

    function renderFallback() {
      pane.appendChild(h("div", { class: "drill-header" }, [h("h2", {}, ["Spoken Script"])]));
      pane.appendChild(h("div", { class: "empty-state" }, [
        h("p", {}, ["No spoken scripts available for this sheet."]),
        h("p", { class: "muted" }, ["Run: python3 preprocess.py --generate-scripts"]),
      ]));
    }

    function renderPractice() {
      const step = steps[stepIdx];
      const rec = getRec();
      const headerRow = h("div", { class: "drill-header" }, [
        h("div", { class: "drill-title-row" }, [
          h("h2", {}, ["Spoken Script"]),
          rec.mastered
            ? h("span", { class: "mastered-badge" }, ["✓ Mastered"])
            : rec.streak > 0
              ? h("span", { class: "muted small" }, [`Streak: ${rec.streak}/${SPOKENSCRIPT_MASTERY_RUNS}`])
              : null,
          helpIcon("Spoken Script",
            `<p>Each step shows the action. Type what you'd say aloud to the examiner during that step — not just the action, but the verbalization.</p>
            <p>Scored by similarity to the expected script — close phrasing counts, word-for-word isn't required.</p>
            <p><strong>Mastery</strong> = 3 rounds where you score ≥ 80% across all steps in this sheet.</p>
            <p>Practice this last — it bridges memorization and actual exam performance.</p>`
          ),
        ]),
      ]);
      pane.appendChild(headerRow);

      const progress = h("p", { class: "muted small" }, [
        `Step ${stepIdx + 1} of ${steps.length}`,
      ]);
      pane.appendChild(progress);

      const cueEl = h("div", { class: "script-cue" }, [
        h("span", { class: "section-chip" }, [step.sectionName]),
        h("p", { class: "cue-text" }, [step.text]),
      ]);
      pane.appendChild(cueEl);

      const prompt = h("p", { class: "script-prompt" }, ["What would you say aloud?"]);
      pane.appendChild(prompt);

      const input = h("input", {
        type: "text",
        class: "script-input",
        placeholder: "Type your verbalization…",
        autocomplete: "off",
        autocorrect: "off",
        spellcheck: "false",
      }, []);

      let feedbackEl = null;

      function showFeedback(matched, typed, expected) {
        if (feedbackEl) feedbackEl.remove();
        feedbackEl = h("div", { class: matched ? "script-feedback correct" : "script-feedback wrong" }, [
          h("span", {}, [matched ? "✓ Good" : "✗ Not quite"]),
          matched ? null : h("p", { class: "expected-script" }, [`Expected: "${expected}"`]),
        ]);
        actionsEl.before(feedbackEl);
        checkBtn.disabled = true;
        skipBtn.disabled = true;
        nextBtn.style.display = "";
      }

      function onCheck() {
        if (checkedCurrent) return;
        checkedCurrent = true;
        const typed = input.value.trim();
        const score = jaccardSimilarity(typed, step.spokenScript);
        const matched = score >= SPOKENSCRIPT_THRESHOLD && typed.length > 0;
        results.push({ step, typed, matched, score });
        showFeedback(matched, typed, step.spokenScript);
      }

      function onSkip() {
        if (checkedCurrent) return;
        checkedCurrent = true;
        results.push({ step, typed: "", matched: false, score: 0, skipped: true });
        if (stepIdx + 1 < steps.length) {
          stepIdx++;
          checkedCurrent = false;
          render();
        } else {
          finishRun();
        }
      }

      function onNext() {
        if (stepIdx + 1 < steps.length) {
          stepIdx++;
          checkedCurrent = false;
          render();
        } else {
          finishRun();
        }
      }

      input.onkeydown = (e) => { if (e.key === "Enter" && !checkedCurrent) onCheck(); };

      const checkBtn = h("button", { class: "btn btn-primary", onclick: onCheck }, ["Check"]);
      const skipBtn = h("button", { class: "btn btn-ghost", onclick: onSkip }, ["Skip"]);
      const nextBtn = h("button", { class: "btn btn-primary", onclick: onNext, style: "display:none" }, ["Next →"]);

      const actionsEl = h("div", { class: "drill-actions" }, [checkBtn, skipBtn, nextBtn]);
      pane.appendChild(input);
      pane.appendChild(actionsEl);

      requestAnimationFrame(() => input.focus());
    }

    function finishRun() {
      const correctCount = results.filter((r) => r.matched).length;
      const pct = steps.length > 0 ? correctCount / steps.length : 0;
      const rec = getRec();
      rec.attempts++;
      rec.lastScore = { correct: correctCount, total: steps.length, pct: Math.round(pct * 100) };
      if (!rec.mastered) {
        rec.streak = pct >= SPOKENSCRIPT_PASS_RATE ? rec.streak + 1 : 0;
        rec.mastered = rec.streak >= SPOKENSCRIPT_MASTERY_RUNS;
      }
      ctx.save();
      phase = "results";
      render();
    }

    function renderResults() {
      const rec = getRec();
      const correctCount = results.filter((r) => r.matched).length;

      pane.appendChild(h("div", { class: "drill-header" }, [
        h("h2", {}, ["Spoken Script — Results"]),
        rec.mastered
          ? h("span", { class: "mastered-badge" }, ["✓ Mastered"])
          : null,
      ]));

      pane.appendChild(h("p", { class: "recall-score" }, [
        `${correctCount} / ${steps.length} correct`,
        ` (${Math.round((correctCount / steps.length) * 100)}%)`,
      ]));

      const pips = [];
      for (let i = 0; i < SPOKENSCRIPT_MASTERY_RUNS; i++) {
        pips.push(h("span", { class: "streak-pip" + (i < rec.streak ? " filled" : "") }));
      }
      pane.appendChild(h("div", { class: "streak-pips" }, pips));

      const grid = h("div", { class: "recall-results" });
      for (const r of results) {
        const icon = r.skipped ? "—" : r.matched ? "✓" : "✗";
        const cls = r.skipped ? "recall-row skipped" : r.matched ? "recall-row matched" : "recall-row missed";
        const detail = r.matched
          ? h("span", { class: "muted small" }, [r.typed])
          : h("div", {}, [
              r.typed ? h("div", { class: "muted small" }, [`You: "${r.typed}"`]) : null,
              h("div", { class: "expected-script small" }, [`Expected: "${r.step.spokenScript}"`]),
            ]);
        grid.appendChild(
          h("div", { class: cls }, [
            h("span", { class: "recall-icon" }, [icon]),
            h("div", { class: "recall-text" }, [
              h("strong", {}, [r.step.sectionName + ": " + r.step.text]),
              detail,
            ]),
          ])
        );
      }
      pane.appendChild(grid);

      pane.appendChild(
        h("div", { class: "drill-actions" }, [
          h("button", { class: "btn btn-primary", onclick: () => {
            phase = "practicing";
            stepIdx = 0;
            results = [];
            checkedCurrent = false;
            render();
          }}, ["Try again"]),
        ])
      );
    }

    render();
    return pane;
  };

  // ---------- GUIDE --------------------------------------------------
  Views.guide = () => {
    const wrap = h("div");
    wrap.appendChild(h("h1", {}, ["Study Guide"]));
    wrap.appendChild(h("p", { class: "guide-intro" }, [
      "This app uses spaced repetition and active recall to help you memorize NREMT psychomotor skill sheets. Each sheet has multiple study modes — here's how each one works and when to use it.",
    ]));

    wrap.appendChild(h("h2", {}, ["Study modes"]));

    const modes = [
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

    const modeList = h("div", { class: "guide-modes" });
    for (const m of modes) {
      modeList.appendChild(h("div", { class: "guide-mode" }, [
        h("div", { class: "guide-mode-name" }, [m.name]),
        h("div", { class: "guide-mode-desc", html: m.desc }),
      ]));
    }
    wrap.appendChild(modeList);

    wrap.appendChild(h("h2", {}, ["Recommended study sequence"]));
    wrap.appendChild(h("ol", { class: "guide-seq" }, [
      h("li", {}, [h("strong", {}, ["Flashcards"]), " — build familiarity with every step."]),
      h("li", {}, [h("strong", {}, ["Order Drill"]), " — lock in the section sequence."]),
      h("li", {}, [h("strong", {}, ["Step Drill"]), " — master step order within each section."]),
      h("li", {}, [h("strong", {}, ["Critical Criteria"]), " — drill auto-fail behaviors until they're automatic."]),
      h("li", {}, [h("strong", {}, ["What's Next?"]), " — stress-test your sequence knowledge under pressure."]),
      h("li", {}, [h("strong", {}, ["Blank Recall"]), " — find remaining gaps; go back to flashcards on weak areas."]),
      h("li", {}, [h("strong", {}, ["Spoken Script"]), " — practice verbalizing exactly what you'll say in the exam room."]),
    ]));

    wrap.appendChild(h("div", { class: "guide-tip" }, [
      h("strong", {}, ["Progress & backup: "]),
      "All data is saved in your browser's local storage — it's private and never leaves your device. Use ",
      h("strong", {}, ["Backup → Download JSON"]),
      " before clearing your browser or switching devices, then import that file on the new device to continue where you left off.",
    ]));

    return wrap;
  };

  // ---------- MNEMONICS ----------------------------------------------
  Views.mnemonics = (ctx, sheet) => {
    const defaults = (window.NREMT_MNEMONICS || {})[sheet.id] || { sections: null, steps: {} };
    const overrides = (ctx.state.mnemonics || {})[sheet.id] || {};

    function getVal(key, sectionName) {
      if (key === "sections") {
        return overrides.sections !== undefined ? overrides.sections : defaults.sections;
      }
      const stepOverrides = overrides.steps || {};
      const stepDefaults  = defaults.steps  || {};
      return stepOverrides[sectionName] !== undefined
        ? stepOverrides[sectionName]
        : (stepDefaults[sectionName] || "");
    }

    function saveVal(key, sectionName, val) {
      if (!ctx.state.mnemonics) ctx.state.mnemonics = {};
      if (!ctx.state.mnemonics[sheet.id]) ctx.state.mnemonics[sheet.id] = {};
      const entry = ctx.state.mnemonics[sheet.id];
      if (key === "sections") {
        entry.sections = val;
      } else {
        if (!entry.steps) entry.steps = {};
        entry.steps[sectionName] = val;
      }
      ctx.save();
    }

    function resetVal(key, sectionName) {
      const entry = (ctx.state.mnemonics || {})[sheet.id];
      if (!entry) return;
      if (key === "sections") {
        delete entry.sections;
      } else if (entry.steps) {
        delete entry.steps[sectionName];
      }
      ctx.save();
      ctx.refresh();
    }

    function renderMnemonicCard(label, key, sectionName, stepList) {
      const currentVal = getVal(key, sectionName);
      const isCustom = key === "sections"
        ? overrides.sections !== undefined
        : (overrides.steps || {})[sectionName] !== undefined;

      const card = h("div", { class: "mnemonic-card" });

      // Header row
      const hdr = h("div", { class: "mnemonic-card-header" }, [
        h("div", { class: "mnemonic-card-label" }, [label]),
      ]);
      if (isCustom) {
        const resetBtn = h("button", { class: "btn-ghost btn btn-sm", type: "button" }, ["Reset to default"]);
        resetBtn.addEventListener("click", () => resetVal(key, sectionName));
        hdr.appendChild(resetBtn);
      }
      card.appendChild(hdr);

      // Step list (collapsed by default, toggle to show)
      if (stepList && stepList.length) {
        const details = h("details", { class: "mnemonic-steps-details" });
        details.appendChild(h("summary", { class: "mnemonic-steps-toggle" }, [`${stepList.length} steps`]));
        const ol = h("ol", { class: "mnemonic-steps-list" });
        for (const s of stepList) ol.appendChild(h("li", {}, [s]));
        details.appendChild(ol);
        card.appendChild(details);
      }

      // Display + edit area
      const displayWrap = h("div", { class: "mnemonic-display-wrap" });

      let editing = false;
      let ta, saveBtn, cancelBtn, editBtn;

      function showDisplay() {
        displayWrap.innerHTML = "";
        const text = getVal(key, sectionName);
        const display = h("div", { class: "mnemonic-display" + (text ? "" : " mnemonic-empty") },
          [text || "No mnemonic yet."]
        );
        editBtn = h("button", { class: "btn btn-sm btn-secondary", type: "button" }, ["Edit"]);
        editBtn.addEventListener("click", () => showEditor());
        displayWrap.append(display, editBtn);
      }

      function showEditor() {
        displayWrap.innerHTML = "";
        ta = h("textarea", {
          class: "mnemonic-textarea",
          rows: "3",
          placeholder: "Type your mnemonic…",
        }, []);
        ta.value = getVal(key, sectionName);

        saveBtn = h("button", { class: "btn btn-sm btn-primary", type: "button" }, ["Save"]);
        cancelBtn = h("button", { class: "btn btn-sm btn-ghost", type: "button" }, ["Cancel"]);
        saveBtn.addEventListener("click", () => {
          saveVal(key, sectionName, ta.value.trim());
          ctx.toast("Mnemonic saved");
          showDisplay();
        });
        cancelBtn.addEventListener("click", () => showDisplay());

        const actions = h("div", { class: "mnemonic-editor-actions" }, [saveBtn, cancelBtn]);
        displayWrap.append(ta, actions);
        ta.focus();
      }

      showDisplay();
      card.appendChild(displayWrap);
      return card;
    }

    const pane = h("div", { class: "mnemonics-pane" });

    pane.appendChild(h("p", { class: "muted" }, [
      "AI-generated memory aids for each section and its steps. Edit any mnemonic to make it your own.",
    ]));

    // Section-order mnemonic (only if sheet has multiple header sections)
    const headerSections = sheet.sections.filter((s) => s.header);
    if (headerSections.length > 1) {
      pane.appendChild(h("h3", {}, ["Section order"]));
      const sectionNames = headerSections.map((s) => s.name);
      pane.appendChild(renderMnemonicCard(
        "Remember the order of all sections",
        "sections",
        null,
        sectionNames
      ));
    }

    // Per-section step mnemonics
    pane.appendChild(h("h3", {}, ["Steps within each section"]));
    for (const sec of sheet.sections) {
      if (sec.steps.length < 2) continue;
      const stepTexts = sec.steps.map((s) => s.text);
      pane.appendChild(renderMnemonicCard(
        sec.name,
        "steps",
        sec.name,
        stepTexts
      ));
    }

    return pane;
  };

  // ---------- NOT FOUND ----------------------------------------------
  Views.notFound = () =>
    h("div", { class: "empty-state" }, [
      h("div", { class: "big" }, ["?"]),
      h("p", {}, ["Nothing here."]),
    ]);

  // Export h() as part of Views for convenience
  Views.h = h;

  global.Views = Views;
  global.h = h;
  global.buildFlatSequence = buildFlatSequence;
  global.buildScriptSequence = buildScriptSequence;
  global.jaccardSimilarity = jaccardSimilarity;
  global.matchLines = matchLines;
  global.renderMarkdownEl = renderMarkdownEl;
  global.createMarkdownEditor = createMarkdownEditor;
})(window);
