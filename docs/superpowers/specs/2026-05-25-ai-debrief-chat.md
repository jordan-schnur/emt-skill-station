# AI Debrief Chat + Scenario Uniqueness — Design Spec
**Date:** 2026-05-25  
**Status:** Approved

## Changes

### 1. Duplicate scenario fix
Add a random nonce to the scenario generation user message so Claude sees a different input every call. Also pass `temperature: 1.0` for scenario generation (roleplay calls stay at default ~1.0 already).

### 2. AI debrief chat
When a session moves to `'debrief'`, immediately call Claude with a coaching prompt and store the response in `session.debriefMessages`. The debrief screen shows static score + breakdown at top, then an "AI Coach" chat thread below where the user can ask follow-up questions.

## State change
Add `debriefMessages: ExaminerMessage[]` to `ExaminerSession` (initialized `[]`).

## New lib function
`buildDebriefSystemPrompt(session, sheet)` — coaching character, full context (scenario, Big5 results, violations, exam transcript).

## Layout
Score tiles → Big5/crit breakdown → `── AI Coach ──` divider → chat thread (auto-scrolls) → composer ("Ask a follow-up…") → Retry + Back buttons.
