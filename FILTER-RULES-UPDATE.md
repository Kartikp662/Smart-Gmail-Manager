# Smart Filters update

Implemented rule fields: Sender, Subject, Email Body, Recipient, Date Received, Has Attachment, Email Category.
Supported match conditions are field-specific. Actions: Move to Trash, Archive, Protect Email.
Rules are scoped to the signed-in user and support create, edit, enable/disable, and delete.
The scan uses Gmail's inbox query, evaluates protected senders and individually protected message IDs first, then applies the first matching active rule.
Trash uses Gmail API messages.trash; archive removes INBOX; restore uses messages.untrash.
Email Body matching uses the plain-text body parts and snippet returned by Gmail. Gmail category matching uses CATEGORY_* labels.
Date matching compares the message Date header with the entered date.
A Protect Email rule adds that message ID to the user's protected_messages table.

## Existing database
The backend creates the `protected_messages` table automatically on startup. Existing rules table is retained; no destructive migration is performed.

## Run
Backend: `cd backend && npm install && npm run dev`
Frontend: `cd frontend && npm install && npm run dev`

Test with a non-important message first. Gmail API access and OAuth verification must already be configured.
