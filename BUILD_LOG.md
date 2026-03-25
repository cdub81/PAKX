# Build Log

This file tracks notable app changes, backend changes, and store/test build pushes for the `PAKX Alliance App`.

## How We Will Use This

- I will add a new entry when we make a meaningful app or backend update.
- You can tell me when you push a build to iPhone TestFlight or Android, and I will record it here.
- Entries are newest first.

---

## 2026-03-24

### Session Persistence And Auth Cleanup

- Added persistent sign-in so users stay logged in after closing the app.
- Added graceful `401` handling so expired sessions sign the user out cleanly with a friendly message.
- Installed `@react-native-async-storage/async-storage` for local session storage.
- Fixed a sign-out crash caused by the sign-out button passing a press event into the sign-out handler.

Files:
- `App.js`
- `src/lib/api.js`
- `package.json`
- `package-lock.json`

Status:
- App changes completed locally
- Not yet recorded as pushed to iPhone/TestFlight in this log
- Not yet recorded as pushed to Android in this log

### Feedback Tab

- Added a `Feedback` tab for alliance members to submit app comments and update suggestions.
- Added backend storage and API support for shared alliance feedback entries.

Files:
- `App.js`
- `src/lib/api.js`
- `backend/server.js`
- `backend/lib/store.js`

Status:
- Feature completed in code
- Store/build push status not yet recorded in this log

### Desert Storm History And Vote Management

- Added Desert Storm lock-in history and result tracking.
- Added a leader flow to lock in the current Desert Storm setup.
- Added layout history with `pending`, `win`, and `loss` results.
- Added closed vote folder behavior and direct delete behavior for votes.

Files:
- `App.js`
- `src/lib/api.js`
- `backend/server.js`
- `backend/lib/store.js`

Status:
- Feature completed in code
- Store/build push status not yet recorded in this log

### Deployment Notes

- Live backend URL: `https://pakx-production.up.railway.app`
- GitHub repo: `https://github.com/cdub81/PAKX`
- Supabase-backed persistence enabled

### Pending Store Push Notes

- iPhone/TestFlight:
  - Waiting for you to confirm the next submitted build number/date
- Android:
  - Waiting for you to confirm the next shared build number/date
