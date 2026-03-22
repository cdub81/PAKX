# LWAdmin Mobile

This workspace now includes a cross-platform mobile app starter that recreates the spreadsheet workflow for iPhone and Android and adds alliance membership plus role-based permissions.

## What it does

- Keeps a master `Players` roster with editable names, ranks, and overall power.
- Supports joining an alliance by code and choosing a member identity in the prototype.
- Treats `R5` and `R4` as leaders with elevated permissions.
- Builds `Task Force A` and `Task Force B` from squad/slot assignments.
- Calculates squad totals and full task-force totals from player power.
- Flags duplicate players assigned across both task forces.
- Shows a dashboard with totals and the Task Force B vs Task Force A difference.
- Lets leaders remove members, add members, edit ranks, and edit any player's power.
- Lets regular members edit only their own power value.

## Spreadsheet mapping

The current app mirrors the workbook at [PAKX_Alliance_TeamList_with_Substitutes.xlsx](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\PAKX_Alliance_TeamList_with_Substitutes.xlsx):

- `Players` sheet -> editable roster data in [src/data/initialData.js](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\src\data\initialData.js)
- `Task Force A` and `Task Force B` sheets -> squad builders in [App.js](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\App.js)
- Dashboard formulas -> calculation helpers in [src/lib/roster.js](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\src\lib\roster.js)

## Current prototype behavior

- The seeded alliance code is `PAKX2026`.
- Joining by code and switching identities is currently local-only so we can test permissions in-app.
- `R5` and `R4` users can manage the full alliance.
- `R3`, `R2`, and `R1` users can only update their own power.

## Run it

1. Install dependencies with `npm install`
2. Start Expo with `npm run start`
3. Open the app in an iPhone simulator, Android emulator, or the Expo Go app
4. Start the backend API with `npm run backend`

## Backend

The first backend scaffold now lives in [backend/server.js](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\backend\server.js) with persistence helpers in [backend/lib/store.js](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\backend\lib\store.js). It supports alliance creation, join-by-code, session tokens, role-based permissions, leader-only member management, and leader-only task-force assignment updates.

## Phone + Backend

The Expo app now calls the backend API instead of using only local demo state.

When you run the app on a real phone:

1. Start the backend with `npm run backend`
2. Find your computer's local network IP address
3. In the app's join screen, enter `http://YOUR-IP:4000`
4. Then enter the alliance code and join

Example: `http://192.168.1.25:4000`

Do not use `http://localhost:4000` on your phone, because `localhost` on the phone points to the phone itself, not your computer.

## My Info Shortcut

The top tab bar now includes a `My Info` shortcut for the signed-in player. It shows:

- rank
- total power
- total squad power
- four editable squad power fields

Those squad power values now live in the backend player record, so they stay attached to the signed-in member instead of existing only on the phone.

## Next recommended steps

1. Connect the Expo app to the new backend routes instead of local in-memory state.
2. Replace file-backed storage with a hosted database and production auth.
3. Add spreadsheet import/export so the workbook and app stay in sync.
