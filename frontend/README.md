# Smart Gmail Manager — Frontend

React (Vite) dashboard for the Smart Gmail Email Management System. Talks to
the backend's `/api/*` and `/auth/*` endpoints.

## Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api` and `/auth` requests to
the backend at `http://localhost:5000` (configured in `vite.config.js`).

**The backend must be running first** — see `../backend/README.md`.

## Pages

- **Overview** — connection status, quick stats, and a manual "scan inbox now" trigger
  (the backend also scans automatically every 5 minutes)
- **Rules** — create and remove filter rules (sender/subject → archive/trash/label)
- **Activity Log** — every automated action taken, most recent first
- **Trash & Recovery** — anything a rule trashed, with a one-click Restore that
  puts the message back in its exact prior state (not just out of Gmail's trash)

## Structure

```
src/
  main.jsx              # entry point
  App.jsx                # tab state + connection check
  api.js                  # fetch wrapper for the backend
  index.css               # design tokens + all styling
  components/
    Sidebar.jsx
    Overview.jsx
    RulesManager.jsx
    ActivityLog.jsx
    TrashRecovery.jsx
```

No component library — plain CSS with custom properties in `index.css`
(colors, spacing, type). Adjust the `:root` variables there to retheme.
