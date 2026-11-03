# Smart Gmail Manager – Multi-user update

## What changed
- Google sign-in for individual Google accounts, with OAuth state validation.
- Session-based sign-in status and sign-out.
- User profile in the dashboard.
- OAuth tokens, filtering rules and action logs are now associated with a user ID.
- Background scans iterate through connected accounts independently.
- Updated responsive UI and sign-in screen.

## Setup
1. Install Node.js 22.5+ (the existing app uses Node's built-in `node:sqlite`).
2. In `backend`, run `npm install`.
3. Copy `.env.example` to `.env` and fill in your Google OAuth credentials.
4. In Google Cloud Console enable Gmail API and configure an OAuth Web client. Add `http://localhost:5000/auth/google/callback` as an authorized redirect URI.
5. Configure the OAuth consent screen. For broad public use, publish the app and complete any Google verification required for the Gmail `gmail.modify` scope. Test-mode apps only allow listed test users.
6. In `frontend`, run `npm install`.
7. Start backend with `npm run dev`, then frontend with `npm run dev`.
8. Open `http://localhost:5173`.

## Security notes
- Do not commit `.env`. Rotate any Google client secret that was previously included in a shared ZIP.
- Use HTTPS, a strong random `SESSION_SECRET`, secure cookies, and encrypted-at-rest OAuth tokens before production deployment.
- This update separates user data at the application/database level; it does not itself complete Google OAuth app verification.
- The original SQLite data from the single-user version is left untouched and is not automatically assigned to a new account.
