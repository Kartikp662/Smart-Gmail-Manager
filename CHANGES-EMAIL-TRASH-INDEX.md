# Smart Gmail Manager – Email Actions, Protection and Mail Index

## Changes
- Scan now checks each user's inbox against that user's active rules.
- Protected senders/domains are checked before any rule; matching messages are skipped.
- `trash` action calls Gmail API `users.messages.trash`.
- `archive` action removes only the INBOX label.
- Successful operations are written to the user's activity log.
- Trash page lists current messages from Gmail using `in:trash`, including messages moved there outside this application.
- Trash messages have a visible sequential mail index (`#1`, `#2`, ...).
- Scan results also show the mail index for each scanned result.
- Users can add/remove protected sender addresses or domains in Smart Filters.

## How to use
1. Start backend and frontend.
2. Sign in with Google.
3. Open Smart Filters.
4. Add a protected sender/domain first, such as `college.edu` or `teacher@gmail.com`.
5. Add a rule with Action = `Trash (safely)` for a test sender or subject.
6. Run Scan Inbox Now.
7. Check the scan results and Activity History.
8. Open Trash & Recovery; Gmail Trash messages are listed with mail indexes and Restore buttons.

## Important
- Gmail API permission `https://www.googleapis.com/auth/gmail.modify` is required.
- This code moves messages to Gmail Trash, not permanent deletion.
- Gmail may permanently delete Trash messages after its retention period.
- Test using a non-important message first.
- The SQLite database creates the `protected_senders` table automatically on backend startup.
- Existing data is preserved; no database reset is required.
