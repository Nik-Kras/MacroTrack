---
name: worktree
description: Create and manage git worktrees for parallel feature development with Claude Code. Branches are created from the base branch; PRs target it.
argument-hint: "<feature-topic> [--remove] [--list] [--status]"
disable-model-invocation: false
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion
---

Guide the user through git worktree operations for parallel Claude Code development.
All feature branches are created from the base branch (`origin/main` by default).
Worktrees are created as sibling directories to the repo root.

## Project Constants

Resolve paths and the base branch dynamically at runtime — never hardcode
machine-specific paths:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREE_BASE="$(dirname "$REPO_ROOT")"
# Base branch: prefer the repo's default branch, fall back to main.
BASE_BRANCH="$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')"
BASE_BRANCH="${BASE_BRANCH:-main}"
```

Worktrees are created as sibling directories to the repo root under `WORKTREE_BASE`.

---

## Argument Parsing

`$ARGUMENTS` is a natural-language topic, optionally followed by a flag.

**Parse rules:**
1. Check for flags: `--remove`, `--list`, `--status`
2. If `--list` or `--status` — run that operation (no topic needed)
3. Everything else in `$ARGUMENTS` (minus the flag) is the **feature topic**
4. If no flag is present, the default operation is **guided setup** (create a branch + worktree from the base branch)

**Examples:**
- `/worktree macro charts` → topic="macro charts", operation=guided setup
- `/worktree macro charts --remove` → topic="macro charts", operation=remove
- `/worktree --list` → operation=list all worktrees
- `/worktree --status` → operation=status check

---

## Naming Convention

Kebab-case the topic to derive a slug. The branch is `feat/<slug>` and the
worktree directory is `wt-<slug>` (a sibling under `$WORKTREE_BASE`).

For the **local management** operations (`--list`, `--status`, `--remove`) the only
naming assumption is the `wt-` directory prefix. Never assume the branch name from
the directory — read each worktree's real branch from git instead:

```bash
git -C "<worktree-path>" rev-parse --abbrev-ref HEAD
```

To resolve a topic to a worktree for `--remove`, kebab-case the topic and match it
against on-disk `wt-*` directories (`wt-<slug>` or any `wt-*<slug>*`); if several
match, list them and ask which one.

---

## Operations

### Guided Setup (default — no flag)

Create a fresh branch from the base branch and check it out in a new worktree.

**Step 1: Derive names and confirm**

Kebab-case the topic into `<slug>`. Compute `BRANCH="feat/<slug>"` and
`WT="$WORKTREE_BASE/wt-<slug>"`. Show both to the user and confirm before creating.

**Step 2: Fetch the base branch and create the worktree**

```bash
git fetch origin "$BASE_BRANCH"
git worktree add -b "$BRANCH" "$WT" "origin/$BASE_BRANCH"
```

If the branch already exists, attach the worktree to it instead:

```bash
git worktree add "$WT" "$BRANCH"
```

**Step 3: Navigate into the worktree and hand off**

```bash
cd "$WT" && pwd
```

**If `pwd` shows the worktree path**, output:

```
You are in the worktree, have fun!

  Branch:    <BRANCH>
  Worktree:  <WT>/

  Note: You may need to run dependency installs (npm install / pnpm install) in the new worktree.
```

**If `pwd` does NOT match the worktree path** (shell cwd was reset), output:

```
The worktree is ready! However, the shell did not stay in the new directory.

To get started, run:

  cd <WT>

Then launch a new Claude Code session there.

  Branch:    <BRANCH>
  Worktree:  <WT>/

  Note: You may need to run dependency installs (npm install / pnpm install) in the new worktree.
```

---

### `--list` — List All Worktrees

```bash
git worktree list
```

Also show worktree directories (flag any `wt-*` dirs that are NOT registered worktrees as orphans):
```bash
ls -d "$WORKTREE_BASE"/wt-* 2>/dev/null || echo "No worktree directories found"
```

If a GitHub remote is configured, check PRs (any state — open, closed, merged) for each worktree branch. Use `--state all` so completed work surfaces in the list too:
```bash
gh pr list --state all --json headRefName,number,title,url,state,isDraft,mergedAt --limit 200
```

Match PRs to worktree branches by `headRefName`. If a branch has multiple PRs, prefer the most recent (highest number).

Present as a table with the PR's lifecycle state visible:
| Worktree | Branch | PR | State |
|----------|--------|----|-------|

State legend:
- ✅ MERGED `<date>` — PR merged into the base branch (worktree is a cleanup candidate)
- 🟡 OPEN — still in progress (annotate `(draft)` if `isDraft: true`)
- ❌ CLOSED — closed without merging (check before removing — may have been abandoned intentionally)
- — — no PR found for this branch yet

After the table, call out cleanup candidates: any worktree whose PR is MERGED, plus orphan `wt-*` directories on disk that aren't registered worktrees. Suggest `/worktree <name> --remove` for each.

---

### `--status` — Status Check

For each worktree found via `git worktree list`:

```bash
git -C <worktree-path> status --short
git -C <worktree-path> log "origin/$BASE_BRANCH..HEAD" --oneline
```

If a GitHub remote is configured, fetch PR state across all lifecycle states (open/closed/merged) so the summary distinguishes "still in progress" from "already shipped":

```bash
gh pr list --state all --json headRefName,number,state,mergedAt --limit 200
```

Present a summary:
| Worktree | Branch | Uncommitted | Unpushed Commits | PR |
|----------|--------|-------------|------------------|----|

Use the same state legend as `--list` (✅ MERGED / 🟡 OPEN / ❌ CLOSED / —) in the PR column.

---

### `--remove` — Remove Worktree

1. Resolve the topic to a worktree directory (`wt-<slug>` / `wt-*<slug>*`; if
   several match, ask which). Then read that worktree's **actual branch** — do not
   assume `feat/<slug>`:
   ```bash
   WT="$WORKTREE_BASE/wt-<slug>"
   BRANCH="$(git -C "$WT" rev-parse --abbrev-ref HEAD)"
   ```

2. Check for uncommitted changes:
   ```bash
   git -C "$WT" status --short
   ```

3. Check for unpushed commits:
   ```bash
   git -C "$WT" log "origin/$BRANCH..HEAD" --oneline 2>/dev/null
   ```

4. If there are uncommitted changes or unpushed commits, **STOP and warn the user**. Show exactly what would be lost. Ask for confirmation.

5. If a GitHub remote is configured, check if a PR exists and its state (include closed/merged so we don't miss history):
   ```bash
   gh pr list --state all --head "$BRANCH" --json number,state,url,mergedAt
   ```
   - If PR is OPEN, warn the user before removing.
   - If PR is MERGED, removal is safe — note this to the user.
   - If PR is CLOSED without merging, confirm the work was abandoned intentionally before removing.

6. If clean (or user confirmed), remove:
   ```bash
   git worktree remove "$WT"
   ```

7. Ask if user wants to delete the local branch too:
   ```bash
   git branch -d "$BRANCH"
   ```

8. Confirm:
   ```bash
   git worktree list
   ```

---

## Quick Reference

When `$ARGUMENTS` is empty, show:

```
/worktree — Parallel Development with Git Worktrees

Usage:
  /worktree <topic>              Create branch + worktree from the base branch
  /worktree <topic> --remove     Remove worktree (with safety checks)
  /worktree --list               Show all active worktrees
  /worktree --status             Check state of all worktrees

Examples:
  /worktree macro charts         → feat/macro-charts branch in wt-macro-charts worktree
  /worktree weight trends        → feat/weight-trends branch in wt-weight-trends worktree
  /worktree --list               → show all worktrees and their PRs

All branches are created from the base branch (origin/main by default).
```

---

## Safety Rules

- 🔴 NEVER force-delete worktrees with uncommitted or unpushed work without explicit user confirmation
- 🔴 NEVER run `git worktree remove --force` without user approval
- 🟡 Warn about dependency installation needs (npm/pnpm) for new worktrees
- 🔵 Use `wt-` prefix for worktree directory names for easy identification
