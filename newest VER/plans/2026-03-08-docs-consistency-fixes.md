# Docs & Skills Consistency Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 4 inconsistencies found in the Smartlog skills/docs audit: FormCode convention, codebase skill duplication, OpenAI YAML documentation, and team/delivery-team decision tree.

**Architecture:** Pure documentation and text edits — no code changes, no schema changes, no backend/frontend impact.

**Tech Stack:** Markdown files, YAML files

---

## Task 1: Fix FormCode Convention in `ai-prompting-guide.md`

**Files:**
- Modify: `docs/playbooks/dev/ai-prompting-guide.md` (lines ~445, ~623–640)

**Canonical rule** (from `backend/templates/dynamic-query.md`):
> Schema is 3 chars. Table is **variable length** (abbreviated). Type is 1 char. Order is 2 digits.

**Step 1:** Fix line 445 — change `[SCHEMA][TABLE4][G/S][XX]` to `[SCHEMA][TABLE][TYPE][ORDER]`

Old:
```
**FormCodes** (theo convention `[SCHEMA][TABLE4][G/S][XX]`):
```
New:
```
**FormCodes** (theo convention `[SCHEMA][TABLE][G|S][SEQ]`):
```

**Step 2:** Fix lines 623–630 — remove "fixed 4 chars" constraint on TABLE

Old:
```
Format: [SCHEMA_3][TABLE_4][G|S][SEQ_2]
...
Table part (4 chars, viết tắt tên bảng):
```
New:
```
Format: [SCHEMA_3][TABLE][G|S][SEQ_2]
...
Table part (viết tắt tên bảng, độ dài thay đổi):
```

**Step 3:** Verify by searching that no other place says TABLE is fixed 4 chars.

---

## Task 2: Remove Duplicates from Codebase Skill

**Files:**
- Modify: `.claude/skills/codebase/SKILL.md`
- Delete: `.claude/skills/codebase/references/commands.md`
- Delete: `.claude/skills/codebase/references/agent-team.md`

**Goal:** `commands.md` and `agent-team.md` duplicate content already in CLAUDE.md. Remove them and update the SKILL.md index to redirect to CLAUDE.md.

**Step 1:** Update SKILL.md — remove `commands.md` and `agent-team.md` rows, add note about CLAUDE.md.

Old table in SKILL.md:
```
| Quick commands | `references/commands.md` |
| Workflow and task management principles | `references/workflow.md` |
| Skill/team map | `references/agent-team.md` |
```

New table:
```
| Workflow and task management principles | `references/workflow.md` |
| Quick commands (build/run/test) | See `CLAUDE.md` → Quick Commands section |
| Skill/team map and parallel rules | See `CLAUDE.md` → Skill Invocation section |
```

**Step 2:** Delete `references/commands.md` (canonical source is CLAUDE.md)

**Step 3:** Delete `references/agent-team.md` (canonical source is CLAUDE.md)

---

## Task 3: Document Purpose of `agents/openai.yaml` Files

**Files:**
- Modify: `CLAUDE.md` → Project Structure section

**What they are:** Each skill has an `agents/openai.yaml` file containing `interface:` config with `display_name`, `short_description`, and `default_prompt`. These are **interface configs for external agent platforms** (e.g., OpenAI Custom GPTs, Copilot Studio) that want to expose this skill as a named agent. They are NOT used by Claude Code directly.

**Step 1:** Add a note in CLAUDE.md's Project Structure block, under `.claude/skills/`:

Add below the skills list:
```
    └── <skill>/agents/openai.yaml  # Interface config for external agent platforms (display name, default prompt)
```

**Step 2:** Add a comment line to each `agents/openai.yaml` file:
```yaml
# Interface config for external agent platforms (e.g., OpenAI Custom GPTs). Not used by Claude Code.
interface:
  ...
```
(15 files — all in `.claude/skills/*/agents/openai.yaml`)

---

## Task 4: Add Decision Tree to CLAUDE.md — team vs delivery-team

**Files:**
- Modify: `CLAUDE.md` → Skill Invocation section

**Goal:** Users often don't know when to use `/team` (DEV-only) vs `/delivery-team` (cross-team). Add a 3-line decision tree below the Skill Invocation table.

**Step 1:** After the Skill Invocation table, add:

```markdown
### Which Orchestrator to Use?

```
Cần implement một tính năng?
├── Chỉ cần code (BE + FE + review + test)? → /team
└── Cần full lifecycle (BA spec, QA, UAT)?  → /delivery-team
    └── Không chắc? → /team (an toàn hơn, ít overhead)
```
```
