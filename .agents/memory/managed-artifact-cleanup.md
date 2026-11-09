---
name: Managed artifact cleanup
description: Replit artifact-owned workflows cannot be removed while their artifact still exists.
---

When a user explicitly requests removal of an artifact, its workflow is owned by the artifact and cannot be removed directly. Stop the workflow, remove the artifact directory, then verify the platform prunes the artifact and workflow.

**Why:** The workflow manager rejects direct removal of artifact-owned workflows; removing the artifact directory triggers managed cleanup.

**How to apply:** Use this only after confirming the user requested artifact removal. Verify the artifact registry and workflow list after deleting the directory.
