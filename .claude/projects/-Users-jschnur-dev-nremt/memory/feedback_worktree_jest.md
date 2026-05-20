---
name: worktree-jest-config
description: When running Jest tests inside a git worktree created under .claude/worktrees/, remove /.claude/ from testPathIgnorePatterns in the worktree's jest.config.js
metadata:
  type: feedback
---

Remove `/.claude/` from `testPathIgnorePatterns` in `jest.config.js` when working inside a worktree.

**Why:** Worktrees created by EnterWorktree land at `.claude/worktrees/<name>/`. Jest's testPathIgnorePatterns matches against the full absolute path, so `/.claude/` silently skips all test files. The fix is to remove that pattern from the worktree's copy of jest.config.js (the main repo keeps its pattern intact).

**How to apply:** Any time a worktree is created for this project, edit the worktree's jest.config.js and remove the `"/.claude/"` entry from testPathIgnorePatterns before running `npm test`.
