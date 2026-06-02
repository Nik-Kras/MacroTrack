---
name: resolve-conflicts
description: Resolve merge conflicts in a PR by analysing what each branch changed vs the merge base, presenting a clear per-conflict comparison, and letting the user decide via AskUserQuestion. Use when the user says "resolve conflicts", "fix conflicts", "merge conflicts", or references a PR with conflicts.
argument-hint: "[PR number]"
allowed-tools: Bash, Read, Grep, Glob, Edit, AskUserQuestion, Agent
disable-model-invocation: false
---

# Resolve PR Merge Conflicts

Interactively resolve merge conflicts by comparing each branch's changes against the merge base, presenting them clearly to the user, and applying the user's chosen resolution.

## Prerequisites

- You must be in the repository (or a worktree for it).
- The branch for the PR must be checked out.

## Workflow

### Phase 1: Setup

1. If a PR number is provided via `$ARGUMENTS`, fetch PR metadata to confirm the head branch, base branch, and that the PR is in a CONFLICTING state:
   ```bash
   gh pr view <PR_NUMBER> --json title,headRefName,baseRefName,mergeable,url
   ```
2. Fetch the latest base branch (usually `staging` per project rules, but use whatever `baseRefName` the PR targets):
   ```bash
   git fetch origin <baseRefName>
   ```
3. Attempt the merge to surface conflicts:
   ```bash
   git merge origin/<baseRefName> --no-commit --no-ff 2>&1 || true
   ```
4. Record the list of conflicting files from the output (lines containing `CONFLICT`).
5. Find the merge base commit — this is the common ancestor before either branch diverged:
   ```bash
   git merge-base HEAD origin/<baseRefName>
   ```

### Phase 2: Analyse each conflict

For EVERY conflicting file, do the following:

1. **Locate conflict markers** — find all `<<<<<<<`, `=======`, `>>>>>>>` lines with their line numbers.
2. **Read the conflict regions** — read each conflict block with enough surrounding context (5-10 lines before/after) to understand the section.
3. **Read the merge base version** — use `git show <merge_base>:<file_path>` to find the corresponding section in the original file. Search by unique text anchors (section headers, function names, distinctive strings) near the conflict, since line numbers will differ between versions.

For each individual conflict region, determine:

- **What BASE had** — the original text before either branch touched it.
- **What OUR branch changed** — compare HEAD side (`<<<<<<< HEAD` ... `=======`) against BASE. Identify what was added, removed, or modified. Be specific: "added X", "rewrote Y to add Z", "unchanged from base".
- **What STAGING changed** — compare staging side (`=======` ... `>>>>>>> origin/...`) against BASE. Same level of detail.

### Phase 3: Present and ask

For each conflict, present a clear comparison to the user using this structure:

```
### Conflict N/M: `filename:lines` — short description

**BASE (original):**
<brief summary or quote of what was there>

**OUR branch changed:**
- <bullet describing each change vs base, or "unchanged from base">

**STAGING changed:**
- <bullet describing each change vs base, or "unchanged from base">
```

Then use `AskUserQuestion` to ask the user what to keep. Group up to 4 conflicts per AskUserQuestion call (the tool's limit). Each question should have options like:

- **Merge both** — when changes from both sides are complementary and can coexist. Explain exactly what the merged result includes. This is recommended when both sides add non-overlapping improvements.
- **Keep ours (HEAD)** — keep only our branch's version. Describe what is kept and what is lost.
- **Keep staging** — keep only staging's version. Describe what is kept and what is lost.

The user can always pick "Other" to provide custom instructions.

Important guidelines for the AskUserQuestion:
- Use `preview` fields on options when the conflict involves code or text that benefits from visual comparison.
- Be specific in descriptions about what each option gains and loses.
- If one option is clearly better (e.g., merge both when changes are complementary), mark it as "(Recommended)".
- Never group unrelated conflicts into the same question — each question = one conflict region.

### Phase 4: Apply resolutions

For each conflict, based on the user's answer:

1. Use the `Edit` tool to replace the entire conflict block (from `<<<<<<< HEAD` through `>>>>>>> origin/...`) with the resolved text.
2. When "Merge both" is chosen, carefully combine the content:
   - Preserve the ordering that makes logical sense (e.g., staging's rewrite of an existing section first, then our additions after).
   - Do not duplicate content that both branches share.
   - Integrate small additions from one side into the other side's rewritten version when appropriate.
3. When "Keep ours" or "Keep staging" is chosen, use exactly that side's text (without conflict markers).

### Phase 5: Verify

After all conflicts are resolved:

1. Verify no conflict markers remain:
   ```bash
   grep -rn '<<<<<<<\|=======\|>>>>>>>' <list of conflicted files>
   ```
2. Report a summary table of all resolutions:
   ```
   | Conflict | Resolution |
   |---|---|
   | **1** description | What was kept/merged |
   | **2** description | What was kept/merged |
   ```
3. Remind the user they can now stage and commit.

## Rules

- 🔴 RULE: NEVER auto-resolve conflicts without asking the user. Every conflict must go through AskUserQuestion.
- 🔴 RULE: Always compare against the merge base, not just HEAD vs staging. Without the base, you cannot tell who changed what — you can only see that the two sides differ.
- 🔴 RULE: Search for base content by text anchors, not by line numbers. Line numbers shift between the base and the conflicting file.
- 🔴 RULE: Present conflicts one at a time (or up to 4 per AskUserQuestion call). Never lump all conflicts into a single question.
- 🔴 RULE: When merging both sides, do not duplicate content that appears in both. Deduplicate intelligently.
- 🟡 STANDARD: When both sides made complementary, non-overlapping changes, recommend "Merge both" as the default option.
- 🟡 STANDARD: When one side only has cosmetic or trivial changes and the other has substantive ones, note this in the description to help the user decide.
- 🔵 GUIDELINE: If a file has many conflicts (>4), process them in batches of up to 4 questions per AskUserQuestion call to avoid overwhelming the user.
