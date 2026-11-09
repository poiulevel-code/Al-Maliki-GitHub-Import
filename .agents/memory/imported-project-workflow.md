---
name: Imported project workflow
description: Imported project files may remain under the conversation handoff path while managed workflows execute there.
---

When a project is handed off from a temporary conversation, confirm which source path the managed workflow uses before debugging it. If the workflow still points to the handoff path, install dependencies in that workspace too or update the artifact registration before relying on a root copy.

**Why:** The managed preview can run from the handoff directory even after files have been copied into the persistent project root, causing misleading missing-dependency failures.

**How to apply:** Check workflow logs for the working directory and install or register against that exact workspace before restarting.

For GitHub imports, preserve Replit's managed `.git` directory and copy the full working tree without the source `.git` folder. Ask before replacing Replit's Git metadata, and do not claim source history was imported unless it was.

**Why:** Replacing `.git` is guarded and can disrupt Replit's versioning setup; the code import can be verified independently by matching each tracked file to the source commit.

**How to apply:** Clone the source outside the project, copy every tracked file while excluding `.git`, then verify the copied file contents against the source tree.