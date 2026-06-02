---
name: bugfix
description: Diagnosis-first bug fixing protocol. Enforces hypothesis confirmation before implementation, blocks speculative fixes that require expensive rebuild cycles. Use when the user reports a bug, error, or unexpected behavior.
argument-hint: "<bug description or paste error message>"
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Agent, AskUserQuestion
disable-model-invocation: false
---

# Bug Fix

Structured debugging protocol that catches wrong-layer diagnoses before they waste a rebuild cycle.

## Phase 1 — Orient (max 5 minutes)

Start from what the user gave you. Check in this order:

1. **Correlation IDs / error messages provided?** → Use them directly. Skip broad searches.
2. **File or layer specified?** → Read that file first. Don't explore adjacent code.
3. **Recent change mentioned?** → Check `git log --oneline -10` for the relevant area.

```bash
# If correlation ID, job ID, or trace ID provided — query New Relic first
doppler run --project materi --config stg -- pnpm observability:nrql -- --nrql "FROM Span SELECT * WHERE materi.correlation_id = '<id>' SINCE 2 hours AGO LIMIT 100"
doppler run --project materi --config stg -- pnpm observability:nrql -- --nrql "FROM Log SELECT * WHERE materi.correlation_id = '<id>' SINCE 2 hours AGO LIMIT 100"
# If file path provided — read it immediately
# If error message provided — grep for it
```

After reading, **stop and diagnose** before touching any code.

## Phase 2 — Diagnose

State your hypothesis explicitly before implementing anything:

```
Root cause hypothesis: <one sentence>
Evidence for this:    <what you observed in the code/logs>
What would disprove:  <what you'd see if this hypothesis is wrong>
Affected layer:       frontend | backend | worker | docker | supabase
```

**If the fix requires a Docker rebuild or more than 2 minutes to validate — ask for confirmation before implementing.**

Use AskUserQuestion:
- "My hypothesis is X. Does that match what you're seeing?"
- "The fix touches Y layer. Should I proceed?"

## Phase 3 — Implement

Only after hypothesis is confirmed:

1. Make the minimal change that addresses the root cause
2. Do NOT add defensive fallbacks — fix the primary path
3. Do NOT suppress errors — surface them clearly
4. Run the relevant check immediately after editing:

```bash
# TypeScript changes:
pnpm typecheck 2>&1 | tail -20

# Python changes (from repo root):
cd agentic_ai && poetry run ruff check . 2>&1 | tail -20

# Frontend logic changes:
pnpm eslint <changed-file> 2>&1 | tail -20
```

## Phase 4 — Verify

Before declaring done:

```bash
# Check nothing else broke
git diff --stat

# Run relevant tests
# Frontend: pnpm vitest run <test-file>
# Backend:  cd agentic_ai && poetry run pytest tests/ -k <test-name>
```

If a regression appears: **stop, re-evaluate the approach from Phase 2.** Do not patch the patch.

## Phase 5 — Commit

Follow conventional commits:
```
fix: <what was wrong and why this fixes it>
```

Never use vague messages like "fix bug" or "update code".

---

## Rules

🔴 **NEVER implement before stating a hypothesis.**
🔴 **NEVER add a fallback or catch-all to make the error go away.**
🔴 **NEVER start a Docker rebuild on a speculative fix.** Confirm first.
🔴 **NEVER patch a regression with another patch** — re-diagnose from scratch.
🟡 If investigation exceeds 5 minutes without a hypothesis, surface a "best guess" and ask the user to validate.
🟡 When multiple bugs are reported, fix them **one at a time** — diagnose, fix, verify, commit, then move to the next.
🔵 The user knows the architecture. If they point you at a layer or file, start there.
