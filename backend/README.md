# LWAdmin Backend

This backend is a lightweight Node HTTP API for alliance membership, join codes, permissions, and task-force management.

## What it supports

- Creating an alliance with an `R5` leader
- Joining an alliance by alliance code
- Session tokens with `Bearer` auth
- Leader permissions for `R5` and `R4`
- Member permissions for `R3`, `R2`, and `R1`
- Leader-only member creation, member removal, alliance code rotation, and task-force assignment changes
- Self-service power updates for regular members

## Run it

```bash
npm run backend
```

The API starts on `http://localhost:4000` by default.

## Main routes

- `GET /health`
- `POST /api/alliances`
- `POST /api/auth/join`
- `GET /api/me`
- `GET /api/alliance`
- `PATCH /api/alliance/code`
- `GET /api/members`
- `POST /api/members`
- `PATCH /api/members/:id`
- `DELETE /api/members/:id`
- `GET /api/task-forces`
- `PATCH /api/task-forces/slot`

## Example flow

1. `POST /api/auth/join` with `{ "allianceCode": "PAKX2026", "playerName": "DefenestranatorX" }`
2. Save the returned `token`
3. Send `Authorization: Bearer <token>` on later requests
4. Call `GET /api/alliance` and `GET /api/task-forces`

## Data storage

- By default, persistent data is stored in [store.json](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\backend\data\store.json)
- Seed data comes from [seed.js](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\backend\data\seed.js)
- If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the backend will load and persist the same app state into Supabase instead

## Supabase setup

1. Create a Supabase project
2. In the Supabase SQL editor, run [supabase.sql](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\backend\supabase.sql)
3. Copy [.env.example](C:\Users\Colby\OneDrive - accuracy1st\Documents\LWAdmin\.env.example) to `.env` or set the same variables in your host
4. Fill in:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - optional: `SUPABASE_STATE_TABLE`
   - optional: `SUPABASE_STATE_ROW_ID`
5. Start the backend again with `npm run backend`

This backend stores one JSON state document in Supabase, which keeps the current API behavior intact while moving alliance data off the local file.

## Notes

- This is now ready for early hosted testing with Supabase-backed persistence.
- Tokens are simple random session tokens stored in the local data file.
- The next deeper production step would be moving from single-row JSON state to fully relational Supabase tables.
