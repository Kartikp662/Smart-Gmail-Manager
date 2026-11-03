const { google } = require('googleapis');
const { getAuthorizedClient } = require('../config/oauth');

function getGmailClient(userId) {
  const auth = getAuthorizedClient(userId);
  return google.gmail({ version: 'v1', auth });
}

// Fetches recent messages with the useful headers pulled out,
// rather than the raw Gmail payload shape.

function decodeBody(data) {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
function collectBody(payload) {
  if (!payload) return '';
  let text = '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) text += decodeBody(payload.body.data) + ' ';
  for (const part of payload.parts || []) text += collectBody(part);
  return text;
}
function hasAttachment(payload) {
  if (!payload) return false;
  if (payload.filename) return true;
  return (payload.parts || []).some(hasAttachment);
}
async function listRecentMessages(userId, { maxResults = 20, query = '' } = {}) {
  const gmail = getGmailClient(userId);
  const listRes = await gmail.users.messages.list({
    userId: 'me', maxResults, q: query
  });
  const messages = listRes.data.messages || [];
  const detailed = await Promise.all(messages.map(async (m) => {
    const msg = await gmail.users.messages.get({
      userId: 'me', id: m.id, format: 'full'
    });
    const headers = msg.data.payload?.headers || [];
    const getHeader = (name) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
    const labels = msg.data.labelIds || [];
    return {
      id: msg.data.id,
      threadId: msg.data.threadId,
      labelIds: labels,
      snippet: msg.data.snippet || '',
      body: collectBody(msg.data.payload),
      hasAttachment: hasAttachment(msg.data.payload),
      categories: labels.filter((label) => label.startsWith('CATEGORY_')).map((label) => label.replace('CATEGORY_', '').toLowerCase()),
      sender: getHeader('From'),
      recipient: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date')
    };
  }));
  return detailed.map((message, index) => ({ ...message, index: index + 1 }));
}


async function listTrashMessages(userId, { maxResults = 100 } = {}) {
  const gmail = getGmailClient(userId);
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'in:trash',
  });
  const messages = listRes.data.messages || [];
  const detailed = await Promise.all(messages.map(async (m) => {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: m.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });
    const headers = msg.data.payload?.headers || [];
    const getHeader = (name) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
    return {
      id: msg.data.id,
      threadId: msg.data.threadId,
      sender: getHeader('From'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: msg.data.snippet || '',
    };
  }));
  return detailed.map((message, index) => ({ ...message, index: index + 1 }));
}

async function getMessageLabelIds(userId, messageId) {
  const gmail = getGmailClient(userId);
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'minimal',
  });
  return res.data.labelIds || [];
}

async function modifyLabels(userId, messageId, { addLabelIds = [], removeLabelIds = [] }) {
  const gmail = getGmailClient(userId);
  return gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds, removeLabelIds },
  });
}

// "Safe" trash: we snapshot the current labels before trashing, so restore()
// can put the message back exactly where it was (e.g. back in Inbox, unread state).
async function trashMessage(userId, messageId) {
  const gmail = getGmailClient(userId);
  const previousLabelIds = await getMessageLabelIds(userId, messageId);
  await gmail.users.messages.trash({ userId: 'me', id: messageId });
  return previousLabelIds;
}

async function restoreMessage(userId, messageId, previousLabelIds = []) {
  const gmail = getGmailClient(userId);
  await gmail.users.messages.untrash({ userId: 'me', id: messageId });

  if (previousLabelIds.length) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: { addLabelIds: previousLabelIds },
    });
  }
}

async function archiveMessage(userId, messageId) {
  // Archiving in Gmail = just removing the INBOX label.
  return modifyLabels(userId, messageId, { removeLabelIds: ['INBOX'] });
}

module.exports = {
  listRecentMessages,
  listTrashMessages,
  modifyLabels,
  trashMessage,
  restoreMessage,
  archiveMessage,
  getMessageLabelIds,
};
