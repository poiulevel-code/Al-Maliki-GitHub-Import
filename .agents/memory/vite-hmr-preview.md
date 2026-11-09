---
name: Vite HMR through preview
description: Replit's local preview capture may use HTTP even when the user-facing preview is HTTPS.
---

For Vite HMR through an artifact proxy, give the WebSocket a dedicated path and include that path in the artifact service's `paths`. Leave HMR protocol and client port unset unless browser logs show that a fixed value is required; Vite can infer both from the preview page URL.

**Why:** The screenshot browser may load the app through `http://127.0.0.1:80`, while the user's preview uses HTTPS. Forcing `wss` and port 443 breaks the local preview capture even when it would appear plausible for a public URL.

**How to apply:** When debugging HMR, compare the page origin and attempted socket URL in browser logs. Route a custom HMR path explicitly and verify the browser reports Vite connected before adjusting scheme or port.
