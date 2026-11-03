# Smart Gmail Manager — Backend

Node.js + Express backend for the Smart Gmail Email Management System.
Handles Google OAuth, Gmail API calls, a simple rules engine, and
"safe trash" recovery (so anything the system trashes can be restored later,
even after the fact, using our own action log).

## What's here

```
backend/
  server.js                    # Express app entrypoint
  src/
    config/oauth.js            # Google OAuth2 client + token persistence
    db/db.js                   # SQLite schema (tokens, rules, action_log)
    routes/auth.routes.js      # /auth/google, /auth/google/callback, /auth/status
    routes/gmail.routes.js     # /api/messages, /api/rules, /api/log, /api/trash
    services/gmail.service.js  # Thin wrapper over the Gmail API (list/trash/restore/archive)
    services/rules.service.js  # Evaluates messages against stored filter rules
    services/actionLog.service.js  # Records every automated action for recovery
    services/scheduler.js      # Cron job that runs the rules scan every 5 minutes
```

## 1. Google Cloud setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. Enable the **Gmail API** (APIs & Services → Library → search "Gmail API" → Enable).
3. Configure the **OAuth consent screen** (APIs & Services → OAuth consent screen):
   - User type: External (or Internal if using a Workspace account)
   - Add your own Gmail address as a **test user** (required while the app is unpublished)
4. Create credentials (APIs & Services → Credentials → Create Credentials → OAuth client ID):
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:5000/auth/google/callback`
5. Copy the generated **Client ID** and **Client Secret**.

## 2. Configure environment

```bash
cp .env.example .env
```

Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from step 1.

## 3. Install & run

```bash
npm install
npm run dev     # uses nodemon, restarts on file changes
# or
npm start
```

The server starts on `http://localhost:5000` and creates `src/db/app.db`
(SQLite) automatically on first run.

## 4. Connect your Gmail account

Visit `http://localhost:5000/auth/google` in your browser, sign in, and
approve the consent screen. You'll be redirected back with `?connected=true`.
Check `GET /auth/status` to confirm.

## 5. Try it out

Create a rule:

```bash
curl -X POST http://localhost:5000/api/rules \
  -H "Content-Type: application/json" \
  -d '{"field":"sender","match_type":"contains","value":"newsletter","action":"archive"}'
```

Run a manual scan (the scheduler also does this automatically every 5 minutes):

```bash
curl -X POST http://localhost:5000/api/messages/scan
```

Check what got trashed and can be restored:

```bash
curl http://localhost:5000/api/trash
```

Restore a specific trashed message by its log entry id:

```bash
curl -X POST http://localhost:5000/api/trash/1/restore
```

## Notes on "safe trash"

Gmail's native trash auto-deletes after 30 days and doesn't remember which
labels a message had before it was trashed. This system snapshots each
message's label state into `action_log.previous_label_ids` right before
trashing it, so `restore` can put a message back exactly where it was
(e.g. back in the Inbox, still unread) — not just out of Gmail's trash.

## What's next (frontend)

This backend is step 1–4 of the full build plan: OAuth, message reading,
rules engine, and safe trash. The React dashboard (rules manager, activity
log, trash/recovery panel) consumes the `/api/*` endpoints above.
