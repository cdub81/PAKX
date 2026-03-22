# Workbook To App Mapping

## Workbook behavior captured

- `Players` contains player name, rank, and `Overall Power`.
- `Task Force A` and `Task Force B` use player assignments per squad slot.
- Slot power is the spreadsheet `VLOOKUP` of player name to `Players!A:C`.
- Squad totals are sums of each squad's slot powers.
- Task-force total power is the sum of all slot powers on a task-force tab.
- The dashboard compares Task Force B against Task Force A.
- Duplicate roster checks identify players assigned to both task forces.

## Current mobile structure

- Join screen for alliance code entry and member selection
- `Dashboard` tab for comparison and duplicate checks
- `Task Force A` tab for assignment management
- `Task Force B` tab for assignment management
- `Members` tab for the alliance roster and permission-based editing
- `Alliance` tab for alliance code, switching users, and leader-only member creation

## Data decisions

- Player names act as the lookup key, matching the spreadsheet behavior.
- Unknown or blank player names resolve to `0` power, matching `IFERROR(...,0)`.
- Initial task-force data is seeded from the current workbook values.
- The prototype alliance code and signed-in member are stored only in app state right now.
- `R5` and `R4` are treated as leaders. `R3`, `R2`, and `R1` are treated as regular members.
- Removing a player also clears that player from any assigned task-force slots.

## Good next build milestones

1. Replace the seeded alliance state with a backend database and real authentication.
2. Add leader-created alliance codes and invite flows that work across devices.
3. Add import of the existing `.xlsx` file so non-technical updates still work.
4. Publish with Expo Application Services or eject to native builds if needed.
