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
  const SECORDER_MASTERY_RUNS = 3;
  const STEPSEQ_MASTERY_RUNS  = 3;

  // ---------- HOME ----------------------------------------------------
  Views.home = (ctx) => {
    const wrap = h("div");
    wrap.append(
      h("h1", {}, ["NREMT Skill Sheet Trainer"]),
      h("p", { class: "subtitle" }, [
        "Pick a skill sheet to study. Cards you struggle with come back sooner; cards you nail go on a longer interval.",
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
          h("span", { class: "tag" }, ["soon"]),
          "Critical Fail Mode — drill only the auto-fail criteria with spaced repetition",
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
      tab === "study"   ? Views.study(ctx, sheet)
      : tab === "sheet" ? Views.reference(ctx, sheet)
      : tab === "notes" ? Views.notes(ctx, sheet)
      : tab === "order" ? Views.sectionOrderDrill(ctx, sheet)
      : tab === "steps" ? Views.stepSeqDrill(ctx, sheet)
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

    const tabs = [
      { id: "study", label: "Flashcards (SRS)" },
      // Only show Order Drill tab for sheets with multiple sections
      ...(sheet.sections.length > 1 ? [{ id: "order", label: orderLabel }] : []),
      { id: "steps", label: stepLabel },
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

    const meta = h("div", { class: "study-meta" }, [
      h("span", {}, [`Card ${idx + 1} of ${total}`]),
      h("span", {}, [
        SRS.describeDue(ctx.state.srs[card.id]),
        " · ease ", (ctx.state.srs[card.id]?.ease ?? 2.5).toFixed(2),
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
      userNote.append(h("span", { class: "label" }, ["Your note"]), document.createTextNode(userNoteText));
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

  function openInlineNote(ctx, card, noteEl, onChange) {
    const existing = Notes.getStepNote(ctx.state, card.id);
    const ta = h("textarea", { rows: 4, placeholder: "Your private note for this step…" }, []);
    ta.value = existing;
    const block = h("div", { class: "notes-block" }, [
      h("div", { class: "target" }, [
        "Note on: ",
        h("strong", {}, [card.parent ? `${card.parent} → ${card.text}` : card.text]),
      ]),
      ta,
      h("div", { class: "row" }, [
        h("span", {}, ["Saved to this browser. Use Backup to export."]),
        h("button", { class: "btn", onclick: () => {
          Notes.setStepNote(ctx.state, card.id, ta.value);
          ctx.save();
          ctx.toast(ta.value.trim() ? "Note saved" : "Note removed");
          if (onChange) onChange();
          // refresh noteEl
          noteEl.innerHTML = "";
          if (ta.value.trim()) {
            noteEl.style.display = "";
            noteEl.append(h("span", { class: "label" }, ["Your note"]), document.createTextNode(ta.value));
          } else {
            noteEl.style.display = "none";
          }
          block.replaceWith(h("div", { class: "card-actions" }, [
            h("button", { class: "btn-link", onclick: () => openInlineNote(ctx, card, noteEl, onChange) }, [
              ta.value.trim() ? "Edit your note" : "+ Add a note",
            ]),
          ]));
        } }, ["Save note"]),
      ]),
    ]);
    // Insert the editor right above the existing note display
    noteEl.parentNode.insertBefore(block, noteEl);
    ta.focus();
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
      const btn = h(
        "button",
        {
          class: "note-btn" + (note ? " has-note" : ""),
          onclick: () => promptNote(ctx, sheet, cardId, text, btn),
        },
        [note ? "✎ note" : "+ note"]
      );
      row.appendChild(btn);
    }
    container.appendChild(row);
    if (note) {
      container.appendChild(
        h("div", { class: "card-note", style: "margin: 4px 12px 12px" }, [
          h("span", { class: "label" }, ["Your note"]),
          document.createTextNode(note),
        ])
      );
    }
    return container;
  }

  function promptNote(ctx, sheet, cardId, label, btn) {
    const current = Notes.getStepNote(ctx.state, cardId);
    const next = prompt(`Note for: ${label}\n\n(Leave empty to remove the note.)`, current);
    if (next === null) return; // cancelled
    Notes.setStepNote(ctx.state, cardId, next);
    ctx.save();
    ctx.toast(next && next.trim() ? "Note saved" : "Note removed");
    ctx.refresh();
  }

  // ---------- NOTES VIEW ---------------------------------------------
  Views.notes = (ctx, sheet) => {
    const pane = h("div");

    pane.appendChild(h("p", { class: "muted" }, [
      "Add a general note for this sheet, or click into the Full sheet tab to attach notes to specific steps. Everything is stored in your browser — use Backup to download a JSON copy.",
    ]));

    // Sheet-level note
    const sheetText = Notes.getSheetNote(ctx.state, sheet.id);
    const sheetTa = h("textarea", { rows: 6, placeholder: "Notes about this sheet as a whole…" }, []);
    sheetTa.value = sheetText;
    const sheetBlock = h("div", { class: "notes-block" }, [
      h("div", { class: "target" }, [h("strong", {}, ["General note for this sheet"])]),
      sheetTa,
      h("div", { class: "row" }, [
        h("span", {}, [sheetText ? "Edit or clear below." : "Empty."]),
        h("button", { class: "btn", onclick: () => {
          Notes.setSheetNote(ctx.state, sheet.id, sheetTa.value);
          ctx.save();
          ctx.toast(sheetTa.value.trim() ? "Note saved" : "Note removed");
        } }, ["Save"]),
      ]),
    ]);
    pane.appendChild(sheetBlock);

    // List of existing per-step notes
    const stepNotes = sheet.cards
      .map((card) => ({ card, note: Notes.getStepNote(ctx.state, card.id) }))
      .filter((x) => x.note);

    pane.appendChild(h("h3", {}, [`Per-step notes (${stepNotes.length})`]));

    if (!stepNotes.length) {
      pane.appendChild(h("p", { class: "muted" }, [
        "None yet. Open the Full sheet tab and click the “+ note” chip next to any row to add one.",
      ]));
    } else {
      for (const { card, note } of stepNotes) {
        const ta = h("textarea", { rows: 3 }, []);
        ta.value = note;
        pane.appendChild(h("div", { class: "notes-block" }, [
          h("div", { class: "target" }, [
            card.section + ": ",
            h("strong", {}, [card.parent ? `${card.parent} → ${card.text}` : card.text]),
          ]),
          ta,
          h("div", { class: "row" }, [
            h("span", {}, [""]),
            h("button", { class: "btn", onclick: () => {
              Notes.setStepNote(ctx.state, card.id, ta.value);
              ctx.save();
              ctx.toast(ta.value.trim() ? "Note saved" : "Note removed");
              ctx.refresh();
            } }, ["Save"]),
          ]),
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
          h("p", { class: "drill-hint muted" }, ["Drag on desktop · tap ↑↓ on mobile"]),
        ])
      );

      // ---- draggable list ----
      const list = h("div", { class: "order-list" });
      let dragSrcIdx = null;

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
            // Delay class add so browser captures pre-drag snapshot
            setTimeout(() => item.classList.add("dragging"), 0);
          });

          item.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            dragSrcIdx = null;
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
            "Drag on desktop · tap ↑↓ on mobile",
          ]),
        ])
      );

      const list = h("div", { class: "order-list" });
      let dragSrcIdx = null;

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
            setTimeout(() => item.classList.add("dragging"), 0);
          });
          item.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            dragSrcIdx = null;
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

  // ---------- STATS ---------------------------------------------------
  Views.stats = (ctx) => {
    const total = NREMT_DATA.totalCards;
    let reviewed = 0;
    let dueNow = 0;
    const now = Date.now();
    for (const sheet of NREMT_DATA.sheets) {
      for (const card of sheet.cards) {
        const rec = ctx.state.srs[card.id];
        if (rec && rec.reps) reviewed += 1;
        if (!rec || rec.due <= now) dueNow += 1;
      }
    }

    const wrap = h("div");
    wrap.append(
      h("h1", {}, ["Stats"]),
      h("p", { class: "muted" }, ["Local progress across all sheets."]),
      h("div", { class: "stat-grid" }, [
        statCard(ctx.state.stats.totalReviews, "Total reviews"),
        statCard(reviewed + " / " + total, "Cards studied"),
        statCard(dueNow, "Due now"),
        statCard(NREMT_DATA.sheets.length, "Skill sheets"),
      ]),
    );

    const table = h("table", { class: "stat-table" }, [
      h("thead", {}, [h("tr", {}, [
        h("th", {}, ["Sheet"]),
        h("th", {}, ["Mastery"]),
        h("th", {}, ["Due"]),
        h("th", {}, ["Cards"]),
        h("th", {}, ["Notes"]),
      ])]),
    ]);
    const tbody = h("tbody");
    for (const sheet of NREMT_DATA.sheets) {
      tbody.appendChild(
        h("tr", {}, [
          h("td", {}, [
            h("button", {
              class: "btn-link",
              onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "study" }),
            }, [sheet.title]),
          ]),
          h("td", {}, [Math.round(SRS.masteryFor(ctx.state, sheet) * 100) + "%"]),
          h("td", { class: "due" }, [String(SRS.dueCount(ctx.state, sheet))]),
          h("td", {}, [String(sheet.cards.length)]),
          h("td", {}, [String(Notes.countSheetNotes(ctx.state, sheet))]),
        ])
      );
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  };

  function statCard(num, label) {
    return h("div", { class: "stat-card" }, [
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
          });
          ctx.toast("Reset complete");
          ctx.refresh();
        } }, ["Reset"]),
      ]),
    ]));

    return wrap;
  };

  // ---------- NOT FOUND ----------------------------------------------
  Views.notFound = () =>
    h("div", { class: "empty-state" }, [
      h("div", { class: "big" }, ["?"]),
      h("p", {}, ["Nothing here."]),
    ]);

  global.Views = Views;
  global.h = h;
})(window);
