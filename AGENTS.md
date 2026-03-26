# PAKX agent instructions

## Product constraints
- Preserve existing behavior outside the Desert Storm workflow.
- Desert Storm must become event-driven.
- Regular members must never see draft teams before publish.
- Leaders can build teams while voting is open or closed.
- Players are assigned via normal selection UI.
- Dragging is only for moving already-assigned players between slots.
- Do not add a drag-from-available-player-pool workflow.
- After event end, archive votes, assignments, task force results, and notes.
- Each task force must have its own won/lost result and its own optional notes field.

## Repo guidance
Read these files first:
1. App.js
2. src/lib/api.js
3. backend/server.js
4. backend/lib/store.js
5. src/lib/roster.js
6. backend/lib/zombieSiege.js as a lifecycle reference only

## Engineering preferences
- Prefer minimal, high-confidence changes.
- Reuse existing vote, task force, publish, and history logic where possible.
- Keep leader/member permissions explicit.
- Keep UI mobile-friendly and simple.
- Avoid broad rewrites.

## Output expectations
- Explain plan before major edits.
- Summarize changed files after implementation.
- Include a concise manual verification checklist.

Do not modify any other files.
