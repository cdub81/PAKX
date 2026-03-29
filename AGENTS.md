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

## UI refactor guidance
- Refactor the app toward a dark tactical design style.
- Keep the existing navigation structure unless explicitly asked to change it.
- Do not invent a Tools tab if one does not already exist.
- If calculators exist, refactor their existing screen or entry point instead of creating new navigation.
- Prefer a clean command-center feel: dark surfaces, high contrast, restrained accent colors, clear hierarchy.
- Use card-based layouts instead of dense screen dumps.
- Prefer one primary action per screen.
- Status should be communicated visually with badges, color, and spacing, not long text blocks.
- Preserve existing logic, permissions, and workflows during UI refactors.
- Do not change business logic unless explicitly required by the UI task.
- When adding pickers or modals, use anchored modal/bottom-sheet presentation rather than floating inline controls.
- Preserve existing event workflows for Desert Storm, Zombie Siege, calendar, calculators, reminders, members, feedback, and settings while improving layout and presentation.
- Refactor in milestones with validation after each milestone.

Do not modify any other files.
