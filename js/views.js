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
        "Flashcards + spaced repetition is the first study mode. These are next:",
      ]),
      h("ul", {}, [
        h("li", {}, [
          h("span", { class: "tag" }, ["soon"]),
          "Step-ordering drills — drag shuffled steps back into the correct sequence",
        ]),
        h("li", {}, [
          h("span", { class: "tag" }, ["soon"]),
          "Section recall — given a section header (e.g. PRIMARY SURVEY), list every step from memory and self-grade",
        ]),
        h("li", {}, [
          h("span", { class: "tag" }, ["soon"]),
          "Critical Criteria quiz — multiple choice / true-false on the auto-fail criteria for each sheet",
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
          h("span", {}, [sheet.category]),
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
      : Views.notFound()
    );
    return wrap;
  };

  function renderTabs(ctx, sheet, current) {
    const tabs = [
      { id: "study", label: "Flashcards (SRS)" },
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
