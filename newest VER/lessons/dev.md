# Lessons Learned — Smartlog CodeBase

> **Scope**: Project-specific patterns for CodeBase only.
> For generic cross-project rules, see [`~/.claude/rules/lessons-global.md`](C:\Users\stm dev\.claude\rules\lessons-global.md).
>
> **Rule**: After ANY correction from the user, add a lesson here.
> Write rules that prevent the same mistake. Review at session start.

---

## How to Use

1. After a correction: add entry under the relevant category
2. Format: `- **[Date]**: [What went wrong] → [Rule to prevent it]`
3. Review **both** this file AND `lessons-global.md` at the start of every session
4. If a lesson is generic (applies to any project), move it to `lessons-global.md` instead
5. Remove or update lessons that are no longer relevant

---

## Backend Patterns

<!-- Lessons about .NET, Clean Architecture, CQRS, EF Core -->

- **2026-03-09**: Soft-delete handlers MUST set BOTH `entity.IsActive = false` AND `entity.DeletedTime = DateTime.UtcNow`. The EF global query filter is `!DeletedTime.HasValue` — setting only `IsActive=false` leaves the record visible to all queries.

- **2026-03-09**: For entities with natural string PKs (e.g., `vehicle_type.code`, `zone.putawayzone`, `location.loc`), the `GetXxxLookup` query returns `LookupDto(Guid.Empty, code, name)`. Frontend must use `code` (not `id`) as the FK value when these are referenced by other entities.

---

## Frontend Patterns

<!-- Lessons about React, TypeScript, Shadcn, TanStack -->

- **2026-03-09**: When creating new feature modules with routes, the frontend agent MUST also update `src/components/layout/data/sidebar-data.ts` to register the new nav group/items. Without this, all routes are created but inaccessible via the sidebar UI. Also update both `src/i18n/locales/en/navigation.json` and `src/i18n/locales/vi/navigation.json` with the matching i18n keys.

- **2026-03-09**: `LookupItem` types for all entities use `{id, code, name}` — never `{id, label}`. When mapping dropdown options:
  - For entities with **natural string PKs** (VehicleType, Zone, Location): use `item.code` as dropdown `value`
  - For entities with **UUID PKs** (Warehouse, Owner, Vendor, Carrier, Item): use `item.id` as dropdown `value`
  - Always display as `` `${item.code} – ${item.name}` `` as `label`
  - Never cast to `{id: string; label: string}` — let TypeScript infer from the actual interface

---

## Architecture & Design

<!-- Lessons about cross-layer consistency, naming, structure -->

---

## Workflow & Process

<!-- Lessons about planning, communication, verification -->

- **2026-02-27**: When implementing a new feature, always check the `DynamicQuery/Scripts/` folder for existing form scripts of reference features. The form SQL script is a required deliverable alongside backend code, not an optional extra.

---

## Common Mistakes

<!-- Recurring mistakes to watch for -->

- **2026-03-11**: QueryConfig `JOIN_INFO` entries **must** have `TABLE_NM`, `TABLE_ALIAS`, `DB_NM` as separate fields. The shorthand `"QUERY": "schema.table alias ON condition"` fails validation (`JOIN_INFO.TABLE_NM is required`). Correct format:
  ```json
  { "SORT_SEQ": 1, "TABLE_NM": "warehouse", "TABLE_ALIAS": "w", "DB_NM": "cat", "JOIN_TYPE": "LEFT", "QUERY": "main.warehouse_id = w.id" }
  ```
  The builder constructs `{DB_NM}.{TABLE_NM} as {TABLE_ALIAS}` as the join target, and uses `QUERY` only for the ON condition (strips leading `ON ` automatically).
