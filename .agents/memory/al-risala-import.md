---
name: AL-RISALA import quirks
description: Key migration decisions when importing the restaurant menu project into this pnpm monorepo.
---

## Supabase db.ts typing fix

`supabase.from("table")` returns `never` when the client has no schema types.
Fix: wrap with `const sb = () => supabase as any` and call `sb().from(...)`.

**Why:** The Supabase client is untyped (no Database generic), so TypeScript infers all table operations as `never`.

**How to apply:** Any new table in `artifacts/api-server/src/lib/db.ts` must go through `sb()`.

## Route handler early-return pattern

`noImplicitReturns: true` is set in `tsconfig.base.json`. Express 5 handler types combined with early `return res.json(...)` cause TS7030.

Fix: Instead of `return res.status(404).json(...)`, use:
```ts
res.status(404).json({ error: "Not found" });
return;
```

**Why:** `return res.json(...)` returns `Response`, not `void`, which TypeScript flags as an inconsistent return type.

**How to apply:** Every route handler with early exits in `artifacts/api-server/src/routes/`.

## Upload fallback

When Supabase is not configured (`hasSupabase === false`), uploads save to `artifacts/api-server/public/images/` and are served via `GET /api/images/:filename`.

## Architecture

- `@workspace/db` (Drizzle) and `@workspace/api-zod` are NOT used by this project.
- `lib/db.ts` in api-server is Supabase-based. Verify the current connection/fallback implementation before relying on older notes.
- `data/reviews.json` persists reviews to disk as fallback.
- Logo image 404 in dev is expected when Supabase Storage is not configured.
- Menu and categories seed from `initial-data.ts` only after Supabase responds successfully with empty tables.
