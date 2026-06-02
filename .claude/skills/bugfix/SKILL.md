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

## MacroTrack Local App Logs

For this repository, always check aggregated app logs before changing code when the bug involves startup, blank screens, loading forever, navigation, database state, or emulator behavior.

The app emits unified structured logs through `src/lib/logger.ts`. Every line starts with:

```text
[MacroTrack] <iso timestamp> <LEVEL> <scope>: <message> <json context>
```

Primary startup scopes:

- `app`: React app startup, loading timeout, startup failures
- `db`: SQLite open, migration, seed, profile/body record loading

When the app is stuck on `Opening local database`, use this order:

1. Read the terminal that is running `pnpm emulator`; Metro prints React Native console logs there.
2. Search for `[MacroTrack]` and the first `ERROR` or `WARN`.
3. If Metro has no useful logs, read Android logcat with the same marker.
4. Only then state the root-cause hypothesis.

Useful commands from the repo root:

```bash
# Start or reuse emulator + Metro. Keep this running.
pnpm emulator

# In another terminal, read Android logs for the app marker.
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}"
"$ANDROID_SDK_ROOT/platform-tools/adb" logcat -d | grep "\\[MacroTrack\\]" | tail -120

# Stream only new MacroTrack logs while reproducing.
"$ANDROID_SDK_ROOT/platform-tools/adb" logcat -c
"$ANDROID_SDK_ROOT/platform-tools/adb" logcat | grep "\\[MacroTrack\\]"
```

If startup fails, the app should show an on-device `Startup failed` screen with the most recent in-memory log summary and a `Retry startup` button. Treat that visible summary as first-class evidence; copy the exact failing scope/message into the diagnosis.

Expected healthy startup sequence:

```text
[MacroTrack] ... INFO app: startup load started
[MacroTrack] ... INFO db: open macro database started
[MacroTrack] ... INFO db: migration check started
[MacroTrack] ... INFO db: database version read
[MacroTrack] ... INFO db: migration skipped
[MacroTrack] ... INFO db: open macro database completed
[MacroTrack] ... INFO db: get profile completed
[MacroTrack] ... INFO db: get latest body record completed
[MacroTrack] ... INFO app: startup data loaded
```

If that sequence stops, the last emitted line identifies the layer to inspect first. For example:

- stops before `database version read`: SQLite open or PRAGMA execution
- stops during `schema migration`: table/view/trigger creation SQL
- stops during `food seed`, `profile seed`, or `dish seed`: seed data or insert constraints
- logs `has_profile: false` or `has_body_record: false`: seed or query issue after database open

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
