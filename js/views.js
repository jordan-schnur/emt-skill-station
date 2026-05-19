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

  function showConfirmModal({ title, body, confirmLabel = "Confirm", onConfirm }) {
    document.querySelector(".help-modal-overlay")?.remove();
    const cancelBtn = h("button", { class: "btn", type: "button" }, ["Cancel"]);
    const confirmBtn = h("button", { class: "btn btn-danger", type: "button" }, [confirmLabel]);
    const modal = h("div", { class: "help-modal" }, [
      h("div", { class: "help-modal-header" }, [
        h("strong", {}, [title]),
      ]),
      h("div", { class: "help-modal-body" }, [
        h("p", { style: "margin-top:0" }, [body]),
        h("div", { class: "confirm-modal-actions" }, [cancelBtn, confirmBtn]),
      ]),
    ]);
    const overlay = h("div", { class: "help-modal-overlay" });
    const dismiss = () => overlay.remove();
    cancelBtn.addEventListener("click", dismiss);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) dismiss(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { dismiss(); document.removeEventListener("keydown", esc); }
    });
    confirmBtn.addEventListener("click", () => { dismiss(); onConfirm(); });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function relativeTime(isoStr) {
    if (!isoStr) return "unknown";
    const diff = Math.round((Date.now() - new Date(isoStr)) / 1000);
    if (diff < 60)      return "just now";
    if (diff < 3600)    return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400)   return `${Math.round(diff / 3600)}h ago`;
    if (diff < 604800)  return `${Math.round(diff / 86400)}d ago`;
    if (diff < 2592000) return `${Math.round(diff / 604800)}w ago`;
    if (diff < 31536000) return `${Math.round(diff / 2592000)}mo ago`;
    return `${Math.round(diff / 31536000)}y ago`;
  }

  function showConflictModal({ localUpdatedAt, cloudUpdatedAt, onKeepLocal, onUseCloud }) {
    document.querySelector(".help-modal-overlay")?.remove();
    const cancelBtn  = h("button", { class: "btn",         type: "button" }, ["Cancel"]);
    const localBtn   = h("button", { class: "btn btn-primary", type: "button" }, ["Keep my local version"]);
    const cloudBtn   = h("button", { class: "btn",         type: "button" }, ["Use cloud version"]);
    const modal = h("div", { class: "help-modal" }, [
      h("div", { class: "help-modal-header" }, [h("strong", {}, ["Sync conflict"])]),
      h("div", { class: "help-modal-body" }, [
        h("p", { style: "margin-top:0" }, ["Both your local data and the cloud have been updated independently. Which version do you want to keep?"]),
        h("div", { class: "conflict-versions" }, [
          h("div", { class: "conflict-card" }, [
            h("div", { class: "conflict-label" }, ["This device"]),
            h("div", { class: "conflict-time" }, [localUpdatedAt ? relativeTime(localUpdatedAt) : "No local data"]),
          ]),
          h("div", { class: "conflict-vs" }, ["vs"]),
          h("div", { class: "conflict-card" }, [
            h("div", { class: "conflict-label" }, ["Cloud"]),
            h("div", { class: "conflict-time" }, [cloudUpdatedAt ? relativeTime(cloudUpdatedAt) : "No cloud data"]),
          ]),
        ]),
        h("p", { class: "muted", style: "font-size:12px;margin-bottom:0" }, ["The losing version will be permanently overwritten."]),
        h("div", { class: "confirm-modal-actions" }, [cancelBtn, cloudBtn, localBtn]),
      ]),
    ]);
    const overlay = h("div", { class: "help-modal-overlay" });
    const dismiss = () => overlay.remove();
    cancelBtn.addEventListener("click", dismiss);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) dismiss(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { dismiss(); document.removeEventListener("keydown", esc); }
    });
    localBtn.addEventListener("click", () => { dismiss(); onKeepLocal(); });
    cloudBtn.addEventListener("click", () => { dismiss(); onUseCloud(); });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
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
        "Pick a skill sheet to study. Use the drills to master section order, step sequences, and more.",
        helpIcon("How the home screen works",
          `<p>Click any sheet to open it. Each sheet has multiple study modes available via the tab row at the top.</p>
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
          h("span", { class: "tag" }, ["soon"]),
          "Timed run-through — simulate the 10/15 minute station with a checklist and stopwatch",
        ]),
      ])
    );
    wrap.appendChild(road);
    return wrap;
  };

  function renderSheetCard(ctx, sheet) {
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
        onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" }),
      },
      [
        h("div", { class: "row" }, [
          h("span", { class: "sheet-id" }, [sheet.id.toUpperCase()]),
        ]),
        h("div", { class: "sheet-title" }, [sheet.title]),
        h("div", { class: "sheet-meta" }, [
          `${sheet.totalPoints} pts`,
          sheet.timeLimit ? ` · ${sheet.timeLimit}` : "",
          noteCount ? ` · ${noteCount} note${noteCount === 1 ? "" : "s"}` : "",
        ]),
        h("div", { class: "sheet-stats" }, [
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
    const tab = ctx.route.tab || "sheet";

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
      tab === "sheet"    ? Views.reference(ctx, sheet)
      : tab === "notes"  ? Views.notes(ctx, sheet)
      : tab === "order"   ? Views.sectionOrderDrill(ctx, sheet)
      : tab === "steps"   ? Views.stepSeqDrill(ctx, sheet)
      : tab === "whatnext" ? Views.whatNextDrill(ctx, sheet)
      : tab === "recall"  ? Views.blankRecall(ctx, sheet)
      : tab === "script"  ? Views.spokenScript(ctx, sheet)
      : tab === "mnemonics" ? Views.mnemonics(ctx, sheet)
      : tab === "chat"      ? Views.chat(ctx, sheet)
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
      // Only show Order Drill tab for sheets with multiple sections
      ...(sheet.sections.length > 1 ? [{ id: "order", label: orderLabel }] : []),
      { id: "steps", label: stepLabel },
      { id: "whatnext", label: whatNextLabel },
      { id: "recall", label: recallLabel },
      { id: "script", label: scriptLabel },
      { id: "mnemonics", label: "Mnemonics" },
      { id: "sheet", label: "Full sheet" },
      { id: "notes", label: "Notes" },
      { id: "chat", label: "Chat" },
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

      if (section.header) {
        const stepCount = section.steps.length;
        const details = h("details", { open: true });
        details.appendChild(h("summary", { class: "ref-section-summary" }, [
          h("span", { class: "ref-section-name" }, [section.name]),
          h("span", { class: "ref-section-count" }, [`${stepCount} step${stepCount !== 1 ? "s" : ""}`]),
        ]));

        section.steps.forEach((step, stepIdx) => {
          const substeps = step.substeps || [];
          const cardId = substeps.length ? null : `${sheet.id}::${section.name}::${stepIdx}`;
          details.appendChild(renderRefRow(ctx, sheet, cardId, step.text, step.points, false));
          if (step.examinerNote) details.appendChild(h("div", { class: "examiner-line" }, ["Examiner: " + step.examinerNote]));
          if (step.note)         details.appendChild(h("div", { class: "examiner-line" }, [step.note]));
          if (step.mnemonic)     details.appendChild(h("div", { class: "examiner-line" }, ["Mnemonic: " + step.mnemonic]));
          if (substeps.length) {
            const subWrap = h("div", { class: "ref-sub" });
            substeps.forEach((sub, subIdx) => {
              subWrap.appendChild(renderRefRow(ctx, sheet, `${sheet.id}::${section.name}::${stepIdx}::${subIdx}`, sub.text, sub.points, true));
            });
            details.appendChild(subWrap);
          }
        });

        sectEl.appendChild(details);
      } else {
        section.steps.forEach((step, stepIdx) => {
          const substeps = step.substeps || [];
          const cardId = substeps.length ? null : `${sheet.id}::${section.name}::${stepIdx}`;
          sectEl.appendChild(renderRefRow(ctx, sheet, cardId, step.text, step.points, false));
          if (step.examinerNote) sectEl.appendChild(h("div", { class: "examiner-line" }, ["Examiner: " + step.examinerNote]));
          if (step.note)         sectEl.appendChild(h("div", { class: "examiner-line" }, [step.note]));
          if (step.mnemonic)     sectEl.appendChild(h("div", { class: "examiner-line" }, ["Mnemonic: " + step.mnemonic]));
          if (substeps.length) {
            const subWrap = h("div", { class: "ref-sub" });
            substeps.forEach((sub, subIdx) => {
              subWrap.appendChild(renderRefRow(ctx, sheet, `${sheet.id}::${section.name}::${stepIdx}::${subIdx}`, sub.text, sub.points, true));
            });
            sectEl.appendChild(subWrap);
          }
        });
      }

      pane.appendChild(sectEl);
    }

    // Critical criteria — also collapsible
    const ccDetails = h("details", { open: true, class: "ref-section" });
    ccDetails.appendChild(h("summary", { class: "ref-section-summary ref-section-summary--critical" }, [
      h("span", { class: "ref-section-name" }, ["Critical Criteria"]),
      h("span", { class: "ref-section-count" }, ["auto-fail"]),
    ]));
    const ul = h("ul", { class: "critical-list" });
    for (const cc of sheet.criticalCriteria) ul.appendChild(h("li", {}, [cc]));
    ccDetails.appendChild(ul);
    pane.appendChild(ccDetails);

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
          "Section Order Drill works for sheets with multiple named sections (e.g. Trauma Assessment, Medical Assessment). Use the Full Sheet tab to review the steps for this sheet.",
        ]),
        h("p", {}, [
          h("button", {
            class: "btn btn-primary",
            onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" }),
          }, ["View Full Sheet →"]),
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
                  ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" }),
              }, ["View full sheet"]),
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
      ctx.state.stats.totalReviews = (ctx.state.stats.totalReviews || 0) + 1;
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
      ctx.state.stats.totalReviews = (ctx.state.stats.totalReviews || 0) + 1;
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
      ctx.state.stats.totalReviews = (ctx.state.stats.totalReviews || 0) + 1;
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
      ctx.state.stats.totalReviews = (ctx.state.stats.totalReviews || 0) + 1;
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

  // ---------- STATS ---------------------------------------------------
  Views.stats = (ctx) => {
    const state = ctx.state;
    const data = NREMT_DATA;
    const sheetCount = data.sheets.length;

    const streak = state.stats.dailyStreak || 0;
    const longestStreak = state.stats.longestStreak || 0;
    const totalReviews = state.stats.totalReviews || 0;
    const totalNotes = Object.keys((state.notes && state.notes.step) || {}).length;

    const hasAchievements = typeof Achievements !== "undefined";
    const allAchs = hasAchievements ? Achievements.getAll(state) : [];
    const unlockedCount = allAchs.filter((a) => a.unlockedAt).length;

    // Compute per-drill mastery counts
    const drillSummary = [
      {
        key: "secorder",
        label: "Section Order",
        icon: "🔢",
        mastered: data.sheets.filter((sh) => {
          const rec = (state.drills.secorder || {})[sh.id];
          return rec && rec.mastered;
        }).length,
      },
      {
        key: "stepseq",
        label: "Step Sequence",
        icon: "👣",
        mastered: data.sheets.filter((sh) => {
          const sheetRec = (state.drills.stepseq || {})[sh.id] || {};
          const drillable = sh.sections ? sh.sections.filter((s) => s.steps && s.steps.length >= 2) : [];
          return drillable.length > 0 && drillable.every((s) => sheetRec[s.name] && sheetRec[s.name].mastered);
        }).length,
      },
      {
        key: "whatnext",
        label: "What's Next?",
        icon: "➡️",
        mastered: data.sheets.filter((sh) => {
          const rec = (state.drills.whatnext || {})[sh.id];
          return rec && rec.mastered;
        }).length,
      },
      {
        key: "blankrecall",
        label: "Blank Recall ≥80%",
        icon: "🧠",
        mastered: data.sheets.filter((sh) => {
          const rec = (state.drills.blankrecall || {})[sh.id];
          return rec && (rec.bestPct || 0) >= 80;
        }).length,
        isPct: true,
      },
      {
        key: "spokenscript",
        label: "Spoken Script",
        icon: "🎤",
        mastered: data.sheets.filter((sh) => {
          const rec = (state.drills.spokenscript || {})[sh.id];
          return rec && rec.mastered;
        }).length,
      },
    ];

    // Sheets with all 5 drills mastered/good
    const sheetsComplete = data.sheets.filter((sh) => {
      return drillSummary.every((d) => {
        if (d.key === "secorder") {
          const rec = (state.drills.secorder || {})[sh.id];
          const hasMultiple = sh.sections && sh.sections.filter((s) => s.header).length > 1;
          return !hasMultiple || (rec && rec.mastered);
        }
        if (d.key === "stepseq") {
          const sheetRec = (state.drills.stepseq || {})[sh.id] || {};
          const drillable = sh.sections ? sh.sections.filter((s) => s.steps && s.steps.length >= 2) : [];
          return drillable.length === 0 || drillable.every((s) => sheetRec[s.name] && sheetRec[s.name].mastered);
        }
        if (d.key === "blankrecall") {
          const rec = (state.drills.blankrecall || {})[sh.id];
          return rec && (rec.bestPct || 0) >= 80;
        }
        const rec = (state.drills[d.key] || {})[sh.id];
        return rec && rec.mastered;
      });
    }).length;

    const wrap = h("div");

    // ---- Hero banner ----
    const streakIcon = streak >= 7 ? "🔥" : "📅";
    wrap.appendChild(h("div", { class: "stats-hero" }, [
      h("div", { class: "hero-block" }, [
        h("div", { class: "hero-icon-big" }, [streakIcon]),
        h("div", { class: "hero-num" }, [String(streak)]),
        h("div", { class: "hero-label" }, ["day streak"]),
      ]),
      hasAchievements ? h("div", { class: "hero-block" }, [
        h("div", { class: "hero-icon-big" }, ["🏅"]),
        h("div", { class: "hero-num" }, [`${unlockedCount}/${allAchs.length}`]),
        h("div", { class: "hero-label" }, ["achievements"]),
      ]) : null,
      h("div", { class: "hero-block" }, [
        h("div", { class: "hero-icon-big" }, ["📝"]),
        h("div", { class: "hero-num" }, [String(totalNotes)]),
        h("div", { class: "hero-label" }, ["notes written"]),
      ]),
      h("div", { class: "hero-block" }, [
        h("div", { class: "hero-icon-big" }, ["✅"]),
        h("div", { class: "hero-num" }, [`${sheetsComplete}/${sheetCount}`]),
        h("div", { class: "hero-label" }, ["sheets complete"]),
      ]),
    ]));

    // ---- Key numbers ----
    const medQuiz = (state.drills || {}).medcondquiz;
    const medStatCards = [
      statCard("🏋️", totalReviews, "Drill Attempts"),
      statCard("📖", data.totalCards, "Total Cards"),
      statCard("🗓️", longestStreak + (longestStreak === 1 ? " day" : " days"), "Best Streak"),
    ];
    if (medQuiz && medQuiz.sessionCount >= 1) {
      medStatCards.push(statCard("🩺", Math.round((medQuiz.bestScore || 0) * 100) + "%", "Med Quiz Best"));
    }
    wrap.appendChild(h("div", { class: "stat-grid" }, medStatCards));

    // ---- Drill mastery overview ----
    wrap.appendChild(h("h2", {}, ["Drill Mastery"]));
    const drillTable = h("div", { class: "drill-mastery-table" });
    for (const d of drillSummary) {
      const pct = sheetCount > 0 ? (d.mastered / sheetCount) * 100 : 0;
      const barCls = pct >= 80 ? "drill-bar-fill good" : pct >= 40 ? "drill-bar-fill mid" : "drill-bar-fill";
      drillTable.appendChild(h("div", { class: "drill-mastery-row" }, [
        h("div", { class: "drill-mastery-label" }, [
          h("span", { class: "drill-mastery-icon" }, [d.icon]),
          h("span", {}, [d.label]),
        ]),
        h("div", { class: "drill-mastery-bar-wrap" }, [
          h("div", { class: "drill-mastery-bar" }, [
            h("div", { class: barCls, style: `width:${pct}%` }),
          ]),
        ]),
        h("div", { class: "drill-mastery-count" }, [`${d.mastered}/${sheetCount}`]),
      ]));
    }
    wrap.appendChild(drillTable);

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
      const notesCount = Notes.countSheetNotes(state, sheet);

      const drillBadges = drillDefs.map((d) => {
        let rec;
        let cls = "drill-badge drill-none";
        let label = d.label;

        if (d.key === "stepseq") {
          // stepseq: check if all drillable sections mastered
          const sheetRec = (state.drills.stepseq || {})[sheet.id] || {};
          const drillable = sheet.sections ? sheet.sections.filter((s) => s.steps && s.steps.length >= 2) : [];
          if (drillable.length > 0) {
            const masteredCount = drillable.filter((s) => sheetRec[s.name] && sheetRec[s.name].mastered).length;
            const anyStarted = drillable.some((s) => sheetRec[s.name] && (sheetRec[s.name].attempts || 0) > 0);
            if (masteredCount === drillable.length) {
              cls = "drill-badge drill-good";
              label = d.label + " ✓";
            } else if (anyStarted) {
              cls = "drill-badge drill-mid";
              label = d.label + " " + masteredCount + "/" + drillable.length;
            }
          }
        } else if (d.isPct) {
          rec = (state.drills[d.key] || {})[sheet.id];
          if (rec && rec.attempts > 0) {
            const bp = Math.round(rec.bestPct || 0);
            cls = bp >= 80 ? "drill-badge drill-good" : bp >= 40 ? "drill-badge drill-mid" : "drill-badge drill-low";
            label = d.label + " " + bp + "%";
          }
        } else {
          rec = (state.drills[d.key] || {})[sheet.id];
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
            onclick: () => ctx.navigate({ view: "sheet", sheetId: sheet.id, tab: "sheet" }),
          }, [sheet.title]),
          h("div", { class: "spc-meta" }, [
            notesCount > 0
              ? h("span", { class: "spc-notes" }, [notesCount + " note" + (notesCount !== 1 ? "s" : "")])
              : null,
          ]),
        ]),
        h("div", { class: "spc-drills" }, drillBadges),
      ]));
    }
    wrap.appendChild(sheetList);

    // ---- Medical Conditions Quiz progress ----
    if (medQuiz && medQuiz.sessionCount >= 1) {
      wrap.appendChild(h("h2", {}, ["Medical Conditions Quiz"]));
      const acc = medQuiz.totalAttempts > 0
        ? Math.round((medQuiz.totalCorrect / medQuiz.totalAttempts) * 100)
        : 0;
      wrap.appendChild(h("div", { class: "stat-grid" }, [
        statCard("🩺", medQuiz.sessionCount, "Sessions"),
        statCard("🎯", Math.round((medQuiz.bestScore || 0) * 100) + "%", "Best Score"),
        statCard("📊", acc + "%", "Overall Accuracy"),
        statCard("📝", medQuiz.totalAttempts, "Questions Answered"),
      ]));
      wrap.appendChild(h("button", {
        class: "btn btn-primary",
        type: "button",
        onclick: () => ctx.navigate({ view: "medconditions", tab: "quiz" }),
      }, ["Take Medical Conditions Quiz →"]));
    } else {
      wrap.appendChild(h("div", { class: "medcond-stats-cta" }, [
        h("p", {}, ["Haven't tried the Medical Conditions Quiz yet?"]),
        h("button", {
          class: "btn btn-primary",
          type: "button",
          onclick: () => ctx.navigate({ view: "medconditions", tab: "quiz" }),
        }, ["Try Medical Conditions Quiz →"]),
      ]));
    }

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
        "Progress + notes live in this browser's local storage. Sign in with Google to sync across devices, or export a JSON backup.",
      ]),
    );

    // ---- cloud sync section ----
    const cloudSection = h("div", { class: "settings-section" });
    function renderCloudSection() {
      cloudSection.innerHTML = "";
      const synced = typeof CloudSync !== "undefined";
      const ready = synced && CloudSync.isAuthReady();
      const user = synced ? CloudSync.getUser() : null;

      if (!ready) {
        cloudSection.append(
          h("h3", {}, ["Cloud sync"]),
          h("div", { class: "sync-loading" }, [
            h("div", { class: "sync-spinner" }),
            h("span", { class: "muted" }, ["Checking sign-in…"]),
          ]),
        );
        return;
      }

      if (!user) {
        cloudSection.append(
          h("h3", {}, ["Cloud sync"]),
          h("p", { class: "muted" }, ["Sign in with Google to automatically sync your progress across all your devices."]),
          h("div", { class: "settings-row" }, [
            h("button", {
              class: "btn btn-google",
              onclick: async () => {
                try {
                  await CloudSync.signIn();
                } catch (err) {
                  if (err.code !== "auth/popup-closed-by-user") ctx.toast("Sign-in failed");
                }
              },
            }, [
              h("img", { src: "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg", alt: "", width: "18", height: "18", "aria-hidden": "true" }),
              "Sign in with Google",
            ]),
          ]),
        );
        return;
      }

      let syncLabel = "Not yet synced";
      if (ctx.state.lastSyncedAt) {
        syncLabel = `Synced ${relativeTime(ctx.state.lastSyncedAt)}`;
      }

      cloudSection.append(
        h("h3", {}, ["Cloud sync"]),
        h("div", { class: "sync-user" }, [
          user.photoURL
            ? h("img", { src: user.photoURL, alt: "", width: "28", height: "28", class: "sync-avatar", referrerpolicy: "no-referrer" })
            : h("div", { class: "sync-avatar-placeholder" }, [user.displayName ? user.displayName[0] : "?"]),
          h("div", { class: "sync-user-info" }, [
            h("div", {}, [user.displayName || "Signed in"]),
            h("div", { class: "muted", style: "font-size:12px" }, [user.email]),
          ]),
        ]),
        h("p", { class: "muted", style: "margin-top:8px;margin-bottom:10px" }, [syncLabel]),
        h("div", { class: "settings-row" }, [
          h("button", {
            class: "btn btn-primary",
            onclick: async (e) => {
              const btn = e.currentTarget;
              btn.disabled = true;
              btn.textContent = "Checking…";
              try {
                const meta = await CloudSync.downloadWithMeta();
                const localTime = ctx.state.updatedAt ? new Date(ctx.state.updatedAt) : new Date(0);
                const cloudTime = meta?.state?.updatedAt ? new Date(meta.state.updatedAt) : new Date(0);
                const hasConflict = meta?.state && cloudTime > localTime;

                if (hasConflict) {
                  btn.disabled = false;
                  btn.textContent = "Sync now";
                  showConflictModal({
                    localUpdatedAt: ctx.state.updatedAt,
                    cloudUpdatedAt: meta.state?.updatedAt,
                    onKeepLocal: async () => {
                      ctx.state.updatedAt = new Date().toISOString();
                      ctx.state.lastSyncedAt = ctx.state.updatedAt;
                      Storage.save(ctx.state);
                      await CloudSync.upload(ctx.state);
                      ctx.toast("Local version pushed to cloud");
                      renderCloudSection();
                    },
                    onUseCloud: () => {
                      Object.assign(ctx.state, meta.state);
                      ctx.state.lastSyncedAt = new Date().toISOString();
                      Storage.save(ctx.state);
                      ctx.toast("Cloud version restored locally");
                      ctx.refresh();
                    },
                  });
                } else {
                  ctx.state.updatedAt = new Date().toISOString();
                  ctx.state.lastSyncedAt = ctx.state.updatedAt;
                  Storage.save(ctx.state);
                  await CloudSync.upload(ctx.state);
                  ctx.toast("Synced to cloud");
                  renderCloudSection();
                }
              } catch (err) {
                ctx.toast("Sync failed");
                btn.disabled = false;
                btn.textContent = "Sync now";
              }
            },
          }, ["Sync now"]),
          h("button", {
            class: "btn",
            onclick: async () => {
              await CloudSync.signOut();
              ctx.toast("Signed out");
              renderCloudSection();
            },
          }, ["Sign out"]),
          h("button", {
            class: "btn btn-danger",
            onclick: () => showConfirmModal({
              title: "Clear all data?",
              body: "This permanently deletes all your SRS progress, notes, and drill history — both locally and from the cloud. This cannot be undone.",
              confirmLabel: "Delete everything",
              onConfirm: async () => {
                try {
                  await CloudSync.clearCloud();
                } catch (err) {
                  console.error("Failed to clear cloud data", err);
                }
                Storage.reset();
                const fresh = {
                  version: 1, srs: {}, notes: { step: {}, sheet: {} },
                  stats: { totalReviews: 0, lastReviewedAt: null, dailyStreak: 0, longestStreak: 0, lastStreakDay: null },
                  drills: { secorder: {}, stepseq: {}, whatnext: {}, blankrecall: {}, spokenscript: {} },
                  achievements: {}, mnemonics: {},
                };
                Object.assign(ctx.state, fresh);
                ctx.toast("All data deleted");
                ctx.refresh();
              },
            }),
          }, ["Clear all data"]),
        ]),
      );
    }
    renderCloudSection();
    wrap.appendChild(cloudSection);

    // ---- JSON export/import ----
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
      h("p", { class: "muted" }, ["Downloads a nremt-progress-YYYY-MM-DD.json file you can keep as a local backup."]),
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

    // ---- AI Chat config ----
    const aiSection = h("div", { class: "settings-section" });
    function renderAISection() {
      aiSection.innerHTML = "";
      const cfg = ChatStore.getConfig();

      const providerSel = h("select", { class: "ai-select" }, [
        h("option", { value: "openai",    selected: cfg.provider === "openai"    ? "" : null }, ["OpenAI"]),
        h("option", { value: "anthropic", selected: cfg.provider === "anthropic" ? "" : null }, ["Anthropic"]),
      ]);

      const keyInput = h("input", {
        type: "password",
        class: "ai-key-input",
        placeholder: cfg.provider === "anthropic" ? "sk-ant-…" : "sk-…",
        value: cfg.apiKey || "",
        autocomplete: "off",
      });

      // Update placeholder when provider changes
      providerSel.addEventListener("change", () => {
        keyInput.placeholder = providerSel.value === "anthropic" ? "sk-ant-…" : "sk-…";
        modelRow.style.display = "none";
        modelSel.innerHTML = "";
        saveBtn.disabled = true;
      });

      // Model row (hidden until fetched)
      const modelSel = h("select", { class: "ai-select" });
      const modelRow = h("div", { class: "ai-model-row", style: "display:none" }, [
        h("label", { class: "ai-config-label" }, ["Model"]),
        modelSel,
      ]);

      // If we already have a saved model, show it without requiring a re-fetch
      if (cfg.apiKey && cfg.model) {
        const opt = h("option", { value: cfg.model }, [cfg.model]);
        opt.selected = true;
        modelSel.appendChild(opt);
        modelRow.style.display = "";
      }

      const fetchBtn = h("button", { class: "btn", type: "button" }, ["Fetch models"]);
      const saveBtn  = h("button", { class: "btn btn-primary", type: "button" }, ["Save"]);
      const clearBtn = h("button", { class: "btn btn-danger",  type: "button" }, ["Clear key"]);

      // Save is only usable once a model is selected
      saveBtn.disabled = !(cfg.apiKey && cfg.model);
      modelSel.addEventListener("change", () => { saveBtn.disabled = !modelSel.value; });

      fetchBtn.addEventListener("click", async () => {
        const key = keyInput.value.trim();
        if (!key) { ctx.toast("Enter an API key first"); return; }
        fetchBtn.disabled = true;
        fetchBtn.textContent = "Fetching…";
        try {
          const models = await ChatStore.fetchModels(providerSel.value, key);
          modelSel.innerHTML = "";
          if (!models.length) throw new Error("No models returned");
          for (const m of models) {
            const opt = h("option", { value: m.id }, [m.label]);
            if (m.id === cfg.model) opt.selected = true;
            modelSel.appendChild(opt);
          }
          modelRow.style.display = "";
          saveBtn.disabled = false;
          ctx.toast(`${models.length} models loaded`);
        } catch (err) {
          ctx.toast("Failed: " + err.message);
        }
        fetchBtn.disabled = false;
        fetchBtn.textContent = "Fetch models";
      });

      saveBtn.addEventListener("click", () => {
        ChatStore.saveConfig({
          provider: providerSel.value,
          model: modelSel.value,
          apiKey: keyInput.value.trim(),
        });
        ctx.toast("AI Chat settings saved");
        renderAISection();
      });

      clearBtn.addEventListener("click", () => {
        ChatStore.clearConfig();
        ctx.toast("API key cleared");
        renderAISection();
      });

      aiSection.append(
        h("h3", {}, ["AI Chat"]),
        h("p", { class: "muted" }, ["Configure the chatbot for context-aware study help and examiner simulation. Your API key is stored locally only and is never synced to the cloud."]),
        h("div", { class: "ai-config-grid" }, [
          h("label", { class: "ai-config-label" }, ["Provider"]),
          providerSel,
          h("label", { class: "ai-config-label" }, ["API key"]),
          keyInput,
        ]),
        h("div", { class: "settings-row", style: "margin-top:10px" }, [fetchBtn]),
        modelRow,
        h("div", { class: "settings-row", style: "margin-top:10px" }, [saveBtn, clearBtn]),
      );
    }
    renderAISection();
    wrap.appendChild(aiSection);

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
      ctx.state.stats.totalReviews = (ctx.state.stats.totalReviews || 0) + 1;
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
        editBtn = h("button", { class: "btn btn-sm btn-secondary", type: "button" }, ["Edit"]);
        editBtn.addEventListener("click", () => showEditor());

        const text = getVal(key, sectionName);
        if (!text) {
          displayWrap.append(
            h("div", { class: "mnemonic-display mnemonic-empty" }, ["No mnemonic yet."]),
            editBtn,
          );
          return;
        }

        // Split sentence into words (strip punctuation, keep order)
        const words = text.trim().split(/\s+/).map((w) => w.replace(/[^a-zA-Z]/g, "")).filter(Boolean);
        const canBreakdown = stepList && stepList.length > 0 && words.length === stepList.length;

        // Full sentence
        displayWrap.appendChild(h("div", { class: "mnemonic-sentence" }, [text]));

        if (canBreakdown) {
          // Acronym strip: S · P · H · S · R
          const acronym = words.map((w) => w[0].toUpperCase()).join(" · ");
          displayWrap.appendChild(h("div", { class: "mnemonic-acronym" }, [acronym]));

          // Word-by-word breakdown
          const table = h("div", { class: "mnemonic-breakdown" });
          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const step = stepList[i].length > 72 ? stepList[i].slice(0, 70) + "…" : stepList[i];
            table.appendChild(h("div", { class: "mnemonic-row" }, [
              h("span", { class: "mnemonic-word" }, [
                h("strong", { class: "mnemonic-letter" }, [word[0].toUpperCase()]),
                word.slice(1).toLowerCase(),
              ]),
              h("span", { class: "mnemonic-arrow" }, ["→"]),
              h("span", { class: "mnemonic-step-label" }, [step]),
            ]));
          }
          displayWrap.appendChild(table);
        }

        displayWrap.appendChild(editBtn);
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

  // ---------- AI CHAT ------------------------------------------------

  function relativeTimeChat(isoStr) {
    if (!isoStr) return "";
    const diff = Math.round((Date.now() - new Date(isoStr)) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return new Date(isoStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function sheetNameById(sheetId) {
    if (!sheetId) return null;
    const s = (typeof NREMT_DATA !== "undefined") && NREMT_DATA.sheets.find((x) => x.id === sheetId);
    return s ? s.title : sheetId;
  }

  Views.chat = (ctx, sheetCtx) => {
    const wrap = h("div", { class: "chat-view" });

    // If a specific chatId is in the route, render the detail view
    if (ctx.route.chatId) {
      const sheet = sheetCtx || (ctx.route.sheetId
        ? NREMT_DATA.sheets.find((s) => s.id === ctx.route.sheetId)
        : null);
      wrap.appendChild(renderChatDetail(ctx, ctx.route.chatId, sheet, sheetCtx));
      return wrap;
    }

    // --- Chat list view ---
    const cfg = ChatStore.getConfig();
    const hasKey = !!(cfg && cfg.apiKey);

    if (!hasKey) {
      wrap.appendChild(h("div", { class: "chat-no-key" }, [
        h("div", { class: "big" }, ["🔑"]),
        h("p", {}, ["No API key configured."]),
        h("p", { class: "muted" }, ["Add an OpenAI or Anthropic API key in Backup & Settings → AI Chat to get started."]),
        h("button", { class: "btn btn-primary", onclick: () => ctx.navigate({ view: "settings" }) }, ["Go to Settings"]),
      ]));
      return wrap;
    }

    const allChats = ChatStore.listChats(ctx.state);
    // Filter to sheet-specific chats when called from a sheet tab
    const sheetId = sheetCtx ? sheetCtx.id : null;
    const displayChats = sheetId
      ? allChats.filter((c) => c.sheetId === sheetId)
      : allChats;

    wrap.appendChild(h("div", { class: "chat-list-header" }, [
      h("h2", {}, [sheetCtx ? `Chat — ${sheetCtx.title}` : "AI Chat"]),
      buildNewChatBtn(ctx, sheetCtx),
    ]));

    if (displayChats.length === 0) {
      wrap.appendChild(h("div", { class: "empty-state" }, [
        h("p", {}, ["No conversations yet."]),
        h("p", { class: "muted" }, [
          sheetCtx
            ? "Start a new chat to ask questions or run an examiner simulation for this sheet."
            : "Start a new chat to ask questions about any skill sheet.",
        ]),
      ]));
    } else {
      const list = h("div", { class: "chat-list" });
      for (const chat of displayChats) {
        const modeBadge = h("span", { class: `chat-mode-badge chat-mode-${chat.mode}` }, [
          chat.mode === "examiner" ? "Examiner" : "Chat",
        ]);
        const sheetBadge = chat.sheetId
          ? h("span", { class: "chat-sheet-badge" }, [sheetNameById(chat.sheetId)])
          : null;
        const deleteBtn = h("button", {
          class: "chat-delete-btn",
          type: "button",
          title: "Delete conversation",
          onclick: (e) => {
            e.stopPropagation();
            showConfirmModal({
              title: "Delete conversation?",
              body: "This removes the chat history permanently.",
              confirmLabel: "Delete",
              onConfirm: () => {
                ChatStore.deleteChat(ctx.state, chat.id);
                ctx.save();
                ctx.refresh();
              },
            });
          },
        }, ["✕"]);
        const row = h("div", { class: "chat-list-row" }, [
          h("div", { class: "chat-list-meta" }, [modeBadge, sheetBadge].filter(Boolean)),
          h("div", { class: "chat-list-title" }, [
            chat.title || h("em", { class: "muted" }, ["(no messages yet)"]),
          ]),
          h("div", { class: "chat-list-time muted" }, [relativeTimeChat(chat.updatedAt)]),
          deleteBtn,
        ]);
        row.addEventListener("click", () => {
          if (sheetCtx) {
            ctx.navigate({ view: "sheet", sheetId: sheetCtx.id, tab: "chat", chatId: chat.id });
          } else {
            ctx.navigate({ view: "chat", chatId: chat.id });
          }
        });
        list.appendChild(row);
      }
      wrap.appendChild(list);
    }
    return wrap;
  };

  function buildNewChatBtn(ctx, sheetCtx) {
    const btn = h("button", { class: "btn btn-primary chat-new-btn", type: "button" }, ["+ New chat"]);
    btn.addEventListener("click", () => showNewChatModal(ctx, sheetCtx));
    return btn;
  }

  function showNewChatModal(ctx, sheetCtx) {
    document.querySelector(".help-modal-overlay")?.remove();

    const modeOptions = [
      { id: "chat",     label: "Chat", desc: "Ask questions and get study help." },
      { id: "examiner", label: "Examiner", desc: "Role-play as a candidate; the AI acts as your psychomotor examiner." },
    ];

    let selectedMode = "chat";
    let selectedSheet = sheetCtx ? sheetCtx.id : null;

    const modeWrap = h("div", { class: "new-chat-mode-grid" });
    function renderModeButtons() {
      modeWrap.innerHTML = "";
      for (const mo of modeOptions) {
        const btn = h("button", {
          class: `new-chat-mode-btn${selectedMode === mo.id ? " active" : ""}`,
          type: "button",
        }, [
          h("strong", {}, [mo.label]),
          h("span", { class: "muted", style: "font-size:12px;display:block" }, [mo.desc]),
        ]);
        btn.addEventListener("click", () => { selectedMode = mo.id; renderModeButtons(); });
        modeWrap.appendChild(btn);
      }
    }
    renderModeButtons();

    // Sheet picker (only shown in global chat, not when opened from a sheet tab)
    const sheetPickerWrap = h("div");
    if (!sheetCtx) {
      const sheetSel = h("select", { class: "ai-select", style: "width:100%;margin-top:4px" }, [
        h("option", { value: "" }, ["— No sheet context —"]),
        ...NREMT_DATA.sheets.map((s) =>
          h("option", { value: s.id }, [s.title])
        ),
      ]);
      sheetSel.value = selectedSheet || "";
      sheetSel.addEventListener("change", () => { selectedSheet = sheetSel.value || null; });
      sheetPickerWrap.append(
        h("label", { class: "ai-config-label", style: "margin-top:12px;display:block" }, ["Sheet context (optional)"]),
        sheetSel,
      );
    }

    const startBtn = h("button", { class: "btn btn-primary", type: "button" }, ["Start chat"]);
    const cancelBtn = h("button", { class: "btn", type: "button" }, ["Cancel"]);

    const modal = h("div", { class: "help-modal" }, [
      h("div", { class: "help-modal-header" }, [h("strong", {}, ["New conversation"])]),
      h("div", { class: "help-modal-body" }, [
        h("p", { style: "margin-top:0;margin-bottom:8px" }, ["Choose a mode:"]),
        modeWrap,
        sheetPickerWrap,
        h("div", { class: "confirm-modal-actions", style: "margin-top:16px" }, [cancelBtn, startBtn]),
      ]),
    ]);
    const overlay = h("div", { class: "help-modal-overlay" });
    const dismiss = () => overlay.remove();
    cancelBtn.addEventListener("click", dismiss);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) dismiss(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { dismiss(); document.removeEventListener("keydown", esc); }
    });
    startBtn.addEventListener("click", () => {
      dismiss();
      const sheet = selectedSheet
        ? NREMT_DATA.sheets.find((s) => s.id === selectedSheet)
        : sheetCtx || null;
      const chatId = ChatStore.createChat(ctx.state, {
        mode: selectedMode,
        sheetId: sheet ? sheet.id : null,
      });
      ctx.save();
      if (sheetCtx) {
        ctx.navigate({ view: "sheet", sheetId: sheetCtx.id, tab: "chat", chatId });
      } else {
        ctx.navigate({ view: "chat", chatId });
      }
    });
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function renderChatDetail(ctx, chatId, sheet, sheetCtx) {
    const chat = ChatStore.getChat(ctx.state, chatId);
    if (!chat) {
      return h("div", { class: "empty-state" }, [h("p", {}, ["Conversation not found."])]);
    }

    const resolvedSheet = sheet ||
      (chat.sheetId ? NREMT_DATA.sheets.find((s) => s.id === chat.sheetId) : null);

    const wrap = h("div", { class: "chat-detail" });

    // Header
    const backBtn = h("button", {
      class: "btn-link chat-back-btn",
      type: "button",
      onclick: () => {
        if (sheetCtx) {
          ctx.navigate({ view: "sheet", sheetId: sheetCtx.id, tab: "chat" });
        } else {
          ctx.navigate({ view: "chat" });
        }
      },
    }, ["← Back"]);

    const modeBadge = h("span", { class: `chat-mode-badge chat-mode-${chat.mode}` }, [
      chat.mode === "examiner" ? "Examiner" : "Chat",
    ]);
    const sheetBadge = resolvedSheet
      ? h("span", { class: "chat-sheet-badge" }, [resolvedSheet.title])
      : null;

    wrap.appendChild(h("div", { class: "chat-detail-header" }, [
      backBtn,
      h("div", { class: "chat-detail-badges" }, [modeBadge, sheetBadge].filter(Boolean)),
    ]));

    // Message thread
    const thread = h("div", { class: "chat-thread" });
    function renderMessages() {
      thread.innerHTML = "";
      if (chat.messages.length === 0) {
        thread.appendChild(h("div", { class: "chat-empty-thread muted" }, [
          chat.mode === "examiner"
            ? `Type "ready" or describe your first action to begin the ${resolvedSheet ? resolvedSheet.title : "skill"} station.`
            : "Ask anything about this skill sheet, or request a practice question.",
        ]));
      }
      for (const msg of chat.messages) {
        const bubble = h("div", { class: `chat-bubble chat-bubble-${msg.role}` });
        if (typeof marked !== "undefined") {
          bubble.innerHTML = marked.parse(msg.content);
        } else {
          bubble.textContent = msg.content;
        }
        thread.appendChild(bubble);
      }
      // Scroll to bottom
      thread.scrollTop = thread.scrollHeight;
    }
    renderMessages();
    wrap.appendChild(thread);

    // Input area
    let sending = false;
    const textarea = h("textarea", {
      class: "chat-input",
      placeholder: "Type a message…",
      rows: "2",
      autocomplete: "off",
      autocorrect: "on",
      autocapitalize: "sentences",
    });
    const sendBtn = h("button", { class: "btn btn-primary chat-send-btn", type: "button" }, ["Send"]);

    async function doSend() {
      const text = textarea.value.trim();
      if (!text || sending) return;
      sending = true;
      textarea.value = "";
      sendBtn.disabled = true;
      sendBtn.textContent = "…";

      ChatStore.addMessage(ctx.state, chatId, { role: "user", content: text });
      renderMessages();

      try {
        const cfg = ChatStore.getConfig();
        const notes = resolvedSheet
          ? (ctx.state.notes && ctx.state.notes.sheet && ctx.state.notes.sheet[resolvedSheet.id]) || ""
          : "";
        const systemPrompt = ChatStore.buildSystemPrompt(chat.mode, resolvedSheet, notes);
        const reply = await ChatStore.sendMessage(chat.messages, systemPrompt, cfg);
        ChatStore.addMessage(ctx.state, chatId, { role: "assistant", content: reply });
        ctx.save();
        renderMessages();
      } catch (err) {
        ChatStore.addMessage(ctx.state, chatId, {
          role: "assistant",
          content: `_Error: ${err.message}_`,
        });
        ctx.save();
        renderMessages();
      }
      sending = false;
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
      textarea.focus();
    }

    sendBtn.addEventListener("click", doSend);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });

    wrap.appendChild(h("div", { class: "chat-input-row" }, [textarea, sendBtn]));

    wrap.appendChild(h("div", { class: "chat-input-hint muted" }, ["Enter to send · Shift+Enter for new line"]));

    return wrap;
  }

  // ---------- EMS CLINICAL MNEMONICS ----------------------------------

  // Minimal SM-2 implementation, self-contained because window.SRS was removed.
  const _emsSrsDAY = 24 * 60 * 60 * 1000;
  const _emsSrsDefaultRecord = () => ({
    ease: 2.5, interval: 0, reps: 0, due: 0,
    lastGrade: null, lapses: 0, lastReviewed: null,
  });
  function _emsSrsGrade(record, gradeName, now = Date.now()) {
    const rec = { ...record };
    rec.lastGrade = gradeName;
    rec.lastReviewed = now;
    if (gradeName === "again") {
      rec.lapses += 1; rec.reps = 0; rec.interval = 0;
      rec.ease = Math.max(1.3, rec.ease - 0.2);
      rec.due = now + 60 * 1000;
      return rec;
    }
    if (rec.reps === 0)      rec.interval = 1;
    else if (rec.reps === 1) rec.interval = 6;
    else {
      const mult = gradeName === "hard" ? 1.2 : gradeName === "easy" ? rec.ease * 1.3 : rec.ease;
      rec.interval = rec.interval * mult;
    }
    if (gradeName === "hard") rec.ease = Math.max(1.3, rec.ease - 0.15);
    if (gradeName === "easy") rec.ease = rec.ease + 0.15;
    if (rec.interval > 365 * 4) rec.interval = 365 * 4;
    rec.reps += 1;
    rec.due = now + rec.interval * _emsSrsDAY;
    return rec;
  }
  function _emsSrsDescribeDue(rec, now = Date.now()) {
    if (!rec || !rec.due) return "new";
    const diff = rec.due - now;
    if (diff <= 0) return "due now";
    const days = diff / _emsSrsDAY;
    if (days < 1) return `due in ${Math.round(diff / (60 * 60 * 1000))}h`;
    if (days < 30) return `due in ${Math.round(days)}d`;
    return `due in ${Math.round(days / 30)}mo`;
  }

  /**
   * renderReferenceLibrary(ctx, config) – reusable renderer for any reference library
   * that follows the EMS_CLINICAL_MNEMONICS data shape.
   *
   * config: { data, srsKey, cardIdPrefix, title, subtitle }
   *
   * Adding a new library (e.g. BLS diagnoses):
   *   1. Create js/<library>.js with the same shape → window.<LIBRARY_NAME>
   *   2. Add a route in app.js
   *   3. Call renderReferenceLibrary(ctx, { data: window.<LIBRARY_NAME>, srsKey: "...", ... })
   */
  function renderReferenceLibrary(ctx, config) {
    const { data, srsKey, cardIdPrefix, title, subtitle } = config;
    const tab = (ctx.route && ctx.route.tab) || "browse";

    const wrap = h("div", { class: "ems-mnemonics" });

    // ── Back crumb (for quiz mode) ──────────────────────────────────────
    if (tab === "quiz") {
      wrap.appendChild(h("div", { class: "crumbs" }, [
        h("button", {
          class: "btn-link",
          onclick: () => ctx.navigate({ view: ctx.route.view, tab: "browse" }),
        }, ["← Back to " + title]),
      ]));
      return renderQuizMode(wrap, ctx, config);
    }

    // ── Browse header ───────────────────────────────────────────────────
    wrap.append(
      h("h1", {}, [title]),
      h("p", { class: "subtitle" }, [subtitle || "Tap a card to expand. Use Quiz mode to drill with spaced repetition."]),
    );

    // ── Category filter ─────────────────────────────────────────────────
    const categories = ["All", ...Array.from(new Set(data.map((m) => m.category)))];
    let activeCategory = "All";

    const grid = h("div", { class: "ems-mnemonic-grid" });

    function renderGrid() {
      grid.innerHTML = "";
      const filtered = activeCategory === "All"
        ? data
        : data.filter((m) => m.category === activeCategory);
      for (const mnemonic of filtered) {
        grid.appendChild(renderMnemonicCard(ctx, mnemonic, srsKey, cardIdPrefix));
      }
    }

    const filterRow = h("div", { class: "ems-filter-row" });
    for (const cat of categories) {
      const btn = h("button", {
        class: "ems-filter-chip" + (cat === activeCategory ? " active" : ""),
        type: "button",
        onclick: () => {
          activeCategory = cat;
          for (const b of filterRow.querySelectorAll(".ems-filter-chip")) {
            b.classList.toggle("active", b.textContent === cat);
          }
          renderGrid();
        },
      }, [cat]);
      filterRow.appendChild(btn);
    }

    // ── Due count for quiz CTA ──────────────────────────────────────────
    const srsStore = ctx.state[srsKey] || {};
    const now = Date.now();
    const dueCount = data.filter((m) => {
      const rec = srsStore[cardIdPrefix + "::" + m.id];
      return !rec || rec.due <= now;
    }).length;

    const quizBtn = h("button", {
      class: "btn btn-primary ems-quiz-btn",
      type: "button",
      onclick: () => ctx.navigate({ view: ctx.route.view, tab: "quiz" }),
    }, [
      dueCount > 0
        ? `Quiz — ${dueCount} card${dueCount === 1 ? "" : "s"} due`
        : "Quiz — all caught up",
    ]);

    wrap.append(filterRow, quizBtn, grid);
    renderGrid();
    return wrap;
  }

  function renderMnemonicCard(ctx, mnemonic, srsKey, cardIdPrefix) {
    const srsStore = ctx.state[srsKey] || {};
    const cardId = cardIdPrefix + "::" + mnemonic.id;
    const rec = srsStore[cardId];
    const dueStr = rec ? _emsSrsDescribeDue(rec) : "new";

    const body = h("div", { class: "ems-card-body", style: "display:none" });

    if (mnemonic.note) {
      body.appendChild(h("div", { class: "ems-card-note" }, [mnemonic.note]));
    }

    const table = h("div", { class: "ems-letter-table" });
    for (const item of mnemonic.letters) {
      if (item.stand === "(connector)") continue;
      table.appendChild(h("div", { class: "ems-letter-row" }, [
        h("span", { class: "ems-letter-badge" }, [item.letter]),
        h("div", { class: "ems-letter-content" }, [
          h("strong", {}, [item.stand]),
          item.detail ? h("div", { class: "ems-letter-detail muted" }, [item.detail]) : null,
        ]),
      ]));
    }
    body.appendChild(table);

    let expanded = false;
    const card = h("div", { class: "ems-card", onclick: () => {
      expanded = !expanded;
      body.style.display = expanded ? "" : "none";
      card.classList.toggle("expanded", expanded);
    }}, [
      h("div", { class: "ems-card-header" }, [
        h("div", { class: "ems-card-left" }, [
          h("span", { class: "ems-acronym" }, [mnemonic.acronym]),
          h("span", { class: "ems-card-title" }, [mnemonic.title]),
        ]),
        h("div", { class: "ems-card-right" }, [
          h("span", { class: "ems-category-tag" }, [mnemonic.category]),
          h("span", { class: "ems-due-badge" + ((!rec || rec.due <= Date.now()) ? " due" : "") }, [dueStr]),
          h("span", { class: "ems-expand-icon" }, ["▾"]),
        ]),
      ]),
      body,
    ]);

    return card;
  }

  function renderQuizMode(wrap, ctx, config) {
    const { data, srsKey, cardIdPrefix, title } = config;
    const srsStore = ctx.state[srsKey] || {};
    const now = Date.now();

    // Build queue: due first (oldest-due first), then new cards
    const due = [];
    const fresh = [];
    for (const m of data) {
      const id = cardIdPrefix + "::" + m.id;
      const rec = srsStore[id];
      if (!rec || rec.due <= 0) {
        fresh.push({ m, rec: _emsSrsDefaultRecord() });
      } else if (rec.due <= now) {
        due.push({ m, rec });
      }
    }
    due.sort((a, b) => a.rec.due - b.rec.due);
    const queue = [...due, ...fresh];

    if (queue.length === 0) {
      wrap.appendChild(h("div", { class: "empty-state" }, [
        h("div", { class: "big" }, ["✓"]),
        h("p", {}, ["All caught up! Come back later."]),
        h("button", {
          class: "btn",
          onclick: () => ctx.navigate({ view: ctx.route.view, tab: "browse" }),
        }, ["← Browse mnemonics"]),
      ]));
      return wrap;
    }

    let currentIdx = 0;
    let revealed = false;

    const counterEl   = h("span", { class: "ems-quiz-counter" }, []);
    const frontEl     = h("div", { class: "ems-quiz-front" });
    const backEl      = h("div", { class: "ems-quiz-back", style: "display:none" });
    const revealBtn   = h("button", { class: "btn btn-primary ems-reveal-btn", type: "button" }, ["Reveal"]);
    const gradeRow    = h("div", { class: "ems-grade-row", style: "display:none" });
    const cardEl      = h("div", { class: "ems-quiz-card" }, [frontEl, backEl, revealBtn, gradeRow]);

    for (const [grade, label, cls] of [
      ["again", "Again", "btn-danger"],
      ["hard",  "Hard",  ""],
      ["good",  "Good",  "btn-primary"],
      ["easy",  "Easy",  ""],
    ]) {
      gradeRow.appendChild(h("button", {
        class: "btn " + cls,
        type: "button",
        onclick: () => applyGrade(grade),
      }, [label]));
    }

    function applyGrade(gradeName) {
      const { m, rec } = queue[currentIdx];
      const cardId = cardIdPrefix + "::" + m.id;
      if (!ctx.state[srsKey]) ctx.state[srsKey] = {};
      ctx.state[srsKey][cardId] = _emsSrsGrade(rec, gradeName);
      ctx.save();

      if (gradeName === "again") {
        // Requeue at end so user sees it again this session
        queue.push({ m, rec: ctx.state[srsKey][cardId] });
      }

      currentIdx++;
      if (currentIdx >= queue.length) {
        // Done
        wrap.innerHTML = "";
        wrap.appendChild(h("div", { class: "crumbs" }, [
          h("button", {
            class: "btn-link",
            onclick: () => ctx.navigate({ view: ctx.route.view, tab: "browse" }),
          }, ["← Back to " + title]),
        ]));
        wrap.appendChild(h("div", { class: "empty-state" }, [
          h("div", { class: "big" }, ["✓"]),
          h("p", {}, ["Session complete!"]),
          h("button", {
            class: "btn",
            onclick: () => ctx.navigate({ view: ctx.route.view, tab: "browse" }),
          }, ["← Browse mnemonics"]),
        ]));
      } else {
        renderCard();
      }
    }

    function renderCard() {
      revealed = false;
      const { m } = queue[currentIdx];
      const remaining = queue.length - currentIdx;
      counterEl.textContent = `${remaining} card${remaining === 1 ? "" : "s"} remaining`;

      frontEl.innerHTML = "";
      frontEl.append(
        h("div", { class: "ems-quiz-acronym" }, [m.acronym]),
        h("div", { class: "ems-quiz-category" }, [m.category]),
        h("div", { class: "ems-quiz-prompt muted" }, ["What does each letter stand for?"]),
      );

      backEl.innerHTML = "";
      backEl.style.display = "none";
      if (m.note) {
        backEl.appendChild(h("div", { class: "ems-card-note" }, [m.note]));
      }
      const tbl = h("div", { class: "ems-letter-table" });
      for (const item of m.letters) {
        if (item.stand === "(connector)") continue;
        tbl.appendChild(h("div", { class: "ems-letter-row" }, [
          h("span", { class: "ems-letter-badge" }, [item.letter]),
          h("div", { class: "ems-letter-content" }, [
            h("strong", {}, [item.stand]),
            item.detail ? h("div", { class: "ems-letter-detail muted" }, [item.detail]) : null,
          ]),
        ]));
      }
      backEl.appendChild(tbl);

      revealBtn.style.display = "";
      gradeRow.style.display = "none";
    }

    revealBtn.addEventListener("click", () => {
      revealed = true;
      backEl.style.display = "";
      revealBtn.style.display = "none";
      gradeRow.style.display = "";
    });

    renderCard();

    wrap.append(
      h("div", { class: "ems-quiz-header" }, [counterEl]),
      cardEl,
    );
    return wrap;
  }

  Views.emsMnemonics = (ctx) => {
    const data = (typeof EMS_CLINICAL_MNEMONICS !== "undefined")
      ? EMS_CLINICAL_MNEMONICS
      : [];
    return renderReferenceLibrary(ctx, {
      data,
      srsKey: "emsSrs",
      cardIdPrefix: "ems",
      title: "EMS Mnemonics & Acronyms",
      subtitle: "Clinical assessment and treatment acronyms used throughout EMS. Tap a card to expand, or use Quiz mode for spaced repetition.",
    });
  };

  // ---------- MEDICAL CONDITIONS ----------------------------------------
  Views.medConditions = (ctx) => {
    const conditions = (typeof MEDICAL_CONDITIONS !== "undefined") ? MEDICAL_CONDITIONS : [];
    const tab = (ctx.route && ctx.route.tab) || "browse";
    const wrap = h("div", { class: "medcond-wrap" });

    // ── Tab strip ────────────────────────────────────────────────────────
    const tabs = [
      { id: "browse", label: "Browse" },
      { id: "compare", label: "Compare" },
      { id: "quiz", label: "Quiz" },
    ];
    const tabStrip = h("div", { class: "medcond-tab-strip" });
    for (const t of tabs) {
      tabStrip.appendChild(h("button", {
        class: "medcond-tab-btn" + (tab === t.id ? " active" : ""),
        type: "button",
        onclick: () => ctx.navigate({ view: "medconditions", tab: t.id }),
      }, [t.label]));
    }
    wrap.appendChild(tabStrip);

    if (tab === "browse") {
      _medCondBrowse(wrap, ctx, conditions);
    } else if (tab === "compare") {
      _medCondCompare(wrap, ctx, conditions);
    } else if (tab === "quiz") {
      _medCondQuiz(wrap, ctx, conditions);
    }

    return wrap;
  };

  function _medCondBrowse(wrap, ctx, conditions) {
    const header = h("div", { class: "medcond-header" });
    header.appendChild(h("h1", {}, ["Medical Conditions Reference"]));
    header.appendChild(h("p", { class: "subtitle" }, [
      "Signs, symptoms, and distinguishing features for common EMT medical emergencies. Click a condition to expand.",
    ]));
    wrap.appendChild(header);

    const categories = ["All", ...Array.from(new Set(conditions.map((c) => c.category)))];
    let activeCat = "All";

    const filterRow = h("div", { class: "medcond-filter-row" });
    const grid = h("div", { class: "medcond-grid" });

    function renderGrid() {
      grid.innerHTML = "";
      const filtered = activeCat === "All" ? conditions : conditions.filter((c) => c.category === activeCat);
      for (const cond of filtered) {
        grid.appendChild(_medCondCard(cond));
      }
    }

    for (const cat of categories) {
      filterRow.appendChild(h("button", {
        class: "medcond-filter-chip" + (cat === activeCat ? " active" : ""),
        type: "button",
        onclick: (e) => {
          activeCat = cat;
          for (const b of filterRow.querySelectorAll(".medcond-filter-chip")) {
            b.classList.toggle("active", b.textContent === cat);
          }
          renderGrid();
        },
      }, [cat]));
    }

    wrap.appendChild(filterRow);
    renderGrid();
    wrap.appendChild(grid);
  }

  function _medCondCard(cond) {
    const body = h("div", { class: "medcond-card-body" });
    body.style.display = "none";

    const sections = [
      { label: "Key Signs & Symptoms", items: cond.signs, cls: "medcond-signs" },
      { label: "Distinguishing Features", items: cond.distinguishing, cls: "medcond-distinguishing" },
      { label: "Critical Findings", items: cond.criticalFindings, cls: "medcond-critical" },
      { label: "EMT Treatment Priority", items: cond.treatment, cls: "medcond-treatment" },
    ];

    for (const sec of sections) {
      if (!sec.items || !sec.items.length) continue;
      const secEl = h("div", { class: "medcond-section " + sec.cls });
      secEl.appendChild(h("div", { class: "medcond-section-label" }, [sec.label]));
      const list = h("ul", { class: "medcond-list" });
      for (const item of sec.items) {
        list.appendChild(h("li", {}, [item]));
      }
      secEl.appendChild(list);
      body.appendChild(secEl);
    }

    if (cond.onset) {
      body.appendChild(h("div", { class: "medcond-onset" }, [
        h("strong", {}, ["Onset: "]),
        cond.onset,
      ]));
    }

    let expanded = false;
    const card = h("div", { class: "medcond-card" }, [
      h("div", {
        class: "medcond-card-header",
        onclick: () => {
          expanded = !expanded;
          body.style.display = expanded ? "" : "none";
          card.classList.toggle("expanded", expanded);
        },
      }, [
        h("div", { class: "medcond-card-left" }, [
          h("span", { class: "medcond-name" }, [cond.name]),
          h("span", { class: "medcond-key-diff" }, [cond.keyDifferentiator]),
        ]),
        h("div", { class: "medcond-card-right" }, [
          h("span", { class: "medcond-cat-badge" }, [cond.category]),
          h("span", { class: "medcond-expand-icon" }, ["▾"]),
        ]),
      ]),
      body,
    ]);
    return card;
  }

  function _medCondCompare(wrap, ctx, conditions) {
    wrap.appendChild(h("h1", {}, ["Side-by-Side Comparison"]));
    wrap.appendChild(h("p", { class: "subtitle" }, [
      "Select a group to compare commonly confused conditions.",
    ]));

    const compareGroups = {
      diabetic:        { label: "Diabetic Emergencies", dimensions: ["onset", "skin", "breath", "respirations", "keySign", "history"] },
      cardiac_dyspnea: { label: "Cardiac (AMI vs CHF)", dimensions: ["onset", "dyspnea", "skin", "edema", "keySign", "history"] },
      obstructive:     { label: "Asthma vs COPD", dimensions: ["onset", "breathSounds", "skin", "cough", "keySign", "smokingHistory", "reversibility"] },
      pulmonary_acute: { label: "PE vs Pneumothorax vs Pneumonia", dimensions: ["onset", "breathSounds", "fever", "cough", "keySign", "breathSoundsSymmetry"] },
      neuro:           { label: "Stroke / TIA / Seizure", dimensions: ["onset", "symptomDuration", "FASTexam", "headache", "keySign", "urgency"] },
      allergic:        { label: "Allergic Reaction vs Anaphylaxis", dimensions: ["onset", "airway", "bloodPressure", "skinFindings", "shockSigns", "keySign", "epinephrine"] },
      shock:           { label: "Shock Types", dimensions: ["cause", "heartRate", "skin", "lungsounds", "JVD", "keySign"] },
    };

    const dimLabels = {
      onset: "Onset",
      skin: "Skin",
      breath: "Breath Odor",
      respirations: "Respirations",
      keySign: "Key Finding",
      history: "History",
      dyspnea: "Dyspnea",
      edema: "Peripheral Edema",
      breathSounds: "Breath Sounds",
      cough: "Cough",
      smokingHistory: "Smoking History",
      reversibility: "Reversibility",
      fever: "Fever",
      breathSoundsSymmetry: "Breath Sound Symmetry",
      symptomDuration: "Duration",
      FASTexam: "FAST Exam",
      headache: "Headache",
      urgency: "Urgency",
      airway: "Airway",
      bloodPressure: "Blood Pressure",
      skinFindings: "Skin Findings",
      shockSigns: "Shock Signs",
      epinephrine: "Epinephrine",
      cause: "Cause",
      heartRate: "Heart Rate",
      lungsounds: "Lung Sounds",
      JVD: "JVD",
    };

    const groupIds = Object.keys(compareGroups);
    let activeGroup = groupIds[0];

    const groupRow = h("div", { class: "medcond-group-row" });
    const tableWrap = h("div", { class: "medcond-compare-wrap" });

    function renderTable() {
      tableWrap.innerHTML = "";
      const group = compareGroups[activeGroup];
      const groupConditions = conditions.filter((c) => c.compareGroup === activeGroup);
      if (!groupConditions.length) {
        tableWrap.appendChild(h("p", { class: "muted" }, ["No conditions in this group."]));
        return;
      }

      const table = h("div", {
        class: "medcond-compare-table",
        style: `--cols: ${groupConditions.length + 1}`,
      });

      // Header row
      table.appendChild(h("div", { class: "medcond-th medcond-dim-label" }, [""]));
      for (const cond of groupConditions) {
        table.appendChild(h("div", { class: "medcond-th" }, [cond.name]));
      }

      // Data rows
      for (const dim of group.dimensions) {
        const label = dimLabels[dim] || dim;
        table.appendChild(h("div", { class: "medcond-td medcond-dim-label" }, [label]));
        for (const cond of groupConditions) {
          const val = (cond.compareDimensions || {})[dim] || "—";
          const isKey = dim === "keySign";
          table.appendChild(h("div", { class: "medcond-td" + (isKey ? " medcond-key-row" : "") }, [val]));
        }
      }

      tableWrap.appendChild(table);
    }

    for (const gid of groupIds) {
      groupRow.appendChild(h("button", {
        class: "medcond-group-chip" + (gid === activeGroup ? " active" : ""),
        type: "button",
        onclick: (e) => {
          activeGroup = gid;
          for (const b of groupRow.querySelectorAll(".medcond-group-chip")) {
            b.classList.toggle("active", b.dataset.gid === gid);
          }
          renderTable();
        },
        dataset: { gid },
      }, [compareGroups[gid].label]));
    }

    renderTable();
    wrap.append(groupRow, tableWrap);
  }

  function _medCondQuiz(wrap, ctx, conditions) {
    if (!conditions.length) {
      wrap.appendChild(h("p", { class: "muted" }, ["No conditions data loaded."]));
      return;
    }

    const QUESTIONS_PER_SESSION = 10;
    const questions = _buildMedCondQuestions(conditions, QUESTIONS_PER_SESSION);

    if (!questions.length) {
      wrap.appendChild(h("p", { class: "muted" }, ["Could not build quiz questions."]));
      return;
    }

    let currentIdx = 0;
    let correct = 0;
    let answered = false;

    const counterEl = h("div", { class: "medcond-quiz-counter" }, []);
    const questionEl = h("div", { class: "medcond-quiz-question" });
    const optionsEl = h("div", { class: "medcond-quiz-options" });
    const feedbackEl = h("div", { class: "medcond-quiz-feedback", style: "display:none" });
    const nextBtn = h("button", {
      class: "btn btn-primary medcond-quiz-next",
      type: "button",
      style: "display:none",
    }, ["Next →"]);

    nextBtn.addEventListener("click", () => {
      currentIdx++;
      if (currentIdx >= questions.length) {
        showResults();
      } else {
        renderQuestion();
      }
    });

    function renderQuestion() {
      answered = false;
      const q = questions[currentIdx];
      counterEl.textContent = `Question ${currentIdx + 1} of ${questions.length}`;

      questionEl.innerHTML = "";
      questionEl.appendChild(h("div", { class: "medcond-quiz-label muted" }, ["Which condition does this describe?"]));
      questionEl.appendChild(h("div", { class: "medcond-quiz-clue" }, [q.clue]));
      if (q.category) {
        questionEl.appendChild(h("div", { class: "medcond-quiz-hint muted" }, ["Category: " + q.category]));
      }

      optionsEl.innerHTML = "";
      feedbackEl.style.display = "none";
      nextBtn.style.display = "none";

      for (const opt of q.options) {
        const btn = h("button", {
          class: "medcond-option btn",
          type: "button",
          onclick: () => {
            if (answered) return;
            answered = true;
            const isCorrect = opt === q.answer;
            if (isCorrect) correct++;

            for (const b of optionsEl.querySelectorAll(".medcond-option")) {
              b.disabled = true;
              if (b.textContent === q.answer) b.classList.add("correct");
              else if (b.textContent === opt && !isCorrect) b.classList.add("wrong");
            }

            feedbackEl.innerHTML = "";
            if (isCorrect) {
              feedbackEl.appendChild(h("div", { class: "medcond-feedback-correct" }, ["Correct!"]));
            } else {
              feedbackEl.appendChild(h("div", { class: "medcond-feedback-wrong" }, [
                "Incorrect — the answer is ",
                h("strong", {}, [q.answer]),
              ]));
            }
            if (q.explanation) {
              feedbackEl.appendChild(h("div", { class: "medcond-feedback-detail muted" }, [q.explanation]));
            }
            feedbackEl.style.display = "";
            nextBtn.style.display = "";
          },
        }, [opt]);
        optionsEl.appendChild(btn);
      }
    }

    function showResults() {
      const score = correct / questions.length;
      const pct = Math.round(score * 100);

      if (!ctx.state.drills) ctx.state.drills = {};
      const prev = ctx.state.drills.medcondquiz || {};
      ctx.state.drills.medcondquiz = {
        sessionCount: (prev.sessionCount || 0) + 1,
        bestScore: Math.max(prev.bestScore || 0, score),
        lastScore: score,
        totalAttempts: (prev.totalAttempts || 0) + questions.length,
        totalCorrect: (prev.totalCorrect || 0) + correct,
      };
      ctx.save();

      wrap.innerHTML = "";
      wrap.appendChild(h("div", { class: "medcond-tab-strip" }, [
        ...[
          { id: "browse", label: "Browse" },
          { id: "compare", label: "Compare" },
          { id: "quiz", label: "Quiz" },
        ].map((t) => h("button", {
          class: "medcond-tab-btn" + (t.id === "quiz" ? " active" : ""),
          type: "button",
          onclick: () => ctx.navigate({ view: "medconditions", tab: t.id }),
        }, [t.label])),
      ]));

      const grade = pct >= 90 ? "Excellent!" : pct >= 70 ? "Good job!" : pct >= 50 ? "Keep studying!" : "Keep at it!";
      const gradeClass = pct >= 90 ? "medcond-grade-great" : pct >= 70 ? "medcond-grade-good" : "medcond-grade-low";

      wrap.appendChild(h("div", { class: "medcond-results" }, [
        h("div", { class: "medcond-results-icon" }, [pct >= 70 ? "🏥" : "📋"]),
        h("div", { class: "medcond-results-score " + gradeClass }, [pct + "%"]),
        h("div", { class: "medcond-results-grade" }, [grade]),
        h("div", { class: "medcond-results-detail" }, [correct + " / " + questions.length + " correct"]),
        h("button", {
          class: "btn btn-primary",
          type: "button",
          onclick: () => ctx.navigate({ view: "medconditions", tab: "quiz" }),
        }, ["Try Again"]),
        h("button", {
          class: "btn",
          type: "button",
          onclick: () => ctx.navigate({ view: "medconditions", tab: "browse" }),
        }, ["Browse Conditions"]),
      ]));
    }

    renderQuestion();
    wrap.append(
      h("div", { class: "medcond-quiz-header" }, [counterEl]),
      h("div", { class: "medcond-quiz-card" }, [questionEl, optionsEl, feedbackEl, nextBtn]),
    );
  }

  function _buildMedCondQuestions(conditions, count) {
    const questions = [];
    const shuffled = [...conditions].sort(() => Math.random() - 0.5);

    for (const cond of shuffled) {
      if (questions.length >= count) break;
      const clue = cond.keyDifferentiator;
      if (!clue) continue;

      const sameGroup = conditions.filter((c) => c.compareGroup === cond.compareGroup && c.id !== cond.id);
      const otherGroup = conditions.filter((c) => c.compareGroup !== cond.compareGroup);

      const distractors = [];
      for (const d of [...sameGroup, ...otherGroup.sort(() => Math.random() - 0.5)]) {
        if (distractors.length >= 3) break;
        if (!distractors.find((x) => x.id === d.id)) distractors.push(d);
      }

      if (distractors.length < 3) continue;

      const options = [cond.name, ...distractors.map((d) => d.name)].sort(() => Math.random() - 0.5);
      questions.push({
        answer: cond.name,
        clue,
        category: cond.category,
        options,
        explanation: cond.distinguishing && cond.distinguishing[0] ? cond.distinguishing[0] : null,
      });
    }

    return questions;
  }

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
