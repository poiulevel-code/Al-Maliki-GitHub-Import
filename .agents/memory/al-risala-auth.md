---
name: AL-RISALA auth roles
description: Role-scoped token design for the restaurant menu system.
---

## Clerk role scheme

The app uses Clerk sessions and `publicMetadata.role` values `admin` or `waiter`.
`authMiddleware` allows either staff role; `adminOnly` protects management writes.

**Why:** Static shared tokens are not the active auth model and would bypass the current Clerk identity checks.

**How to apply:** Assign roles only to explicitly approved accounts in the development Clerk instance; continue enforcing roles on the API server.

## Initialization

Menu and category routes initialize from the API store at startup. The API store can operate locally when the Supabase connector is disabled.
