const express = require('express');
const gmailService = require('../services/gmail.service');
const rulesService = require('../services/rules.service');
const logService = require('../services/actionLog.service');

const router = express.Router();

function requireUser(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please sign in with Google first.' });
  req.userId = req.session.userId;
  next();
}
router.use(requireUser);

router.get('/messages', async (req, res) => {
  try {
    res.json(await gmailService.listRecentMessages(req.userId, {
      maxResults: Number(req.query.maxResults) || 20,
      query: req.query.query || 'in:inbox'
    }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/messages/scan', async (req, res) => {
  try {
    const rules = rulesService.getActiveRules(req.userId);
    const protectedSenders = rulesService.getProtectedSenders(req.userId);
    const protectedMessages = rulesService.getProtectedMessages(req.userId);
    const messages = await gmailService.listRecentMessages(req.userId, {
      maxResults: Math.min(Number(req.body?.maxResults) || 50, 100),
      query: 'in:inbox'
    });
    const results = [];
    let protectedCount = 0;
    for (const message of messages) {
      try {
        if (rulesService.isProtected(message, protectedSenders, protectedMessages)) {
          protectedCount++;
          results.push({ index: message.index, messageId: message.id, subject: message.subject, action: 'protected', status: 'skipped' });
          continue;
        }
        const rule = rulesService.findMatchingRule(message, rules);
        if (!rule) continue;

        let previousLabels = message.labelIds || [];
        if (rule.action === 'protect') {
          rulesService.protectMessage(req.userId, message);
          logService.logAction(req.userId, { gmail_message_id: message.id, rule_id: rule.id, action: 'protect', previous_label_ids: previousLabels, subject: message.subject, sender: message.sender });
        } else if (rule.action === 'trash') {
          previousLabels = await gmailService.trashMessage(req.userId, message.id);
          logService.logAction(req.userId, { gmail_message_id: message.id, rule_id: rule.id, action: 'trash', previous_label_ids: previousLabels, subject: message.subject, sender: message.sender });
        } else if (rule.action === 'archive') {
          await gmailService.archiveMessage(req.userId, message.id);
          logService.logAction(req.userId, { gmail_message_id: message.id, rule_id: rule.id, action: 'archive', previous_label_ids: previousLabels, subject: message.subject, sender: message.sender });
        }
        results.push({ index: message.index, messageId: message.id, subject: message.subject, sender: message.sender, action: rule.action, status: 'success' });
      } catch (itemError) {
        logService.logAction(req.userId, { gmail_message_id: message.id, rule_id: null, action: 'error', previous_label_ids: [], subject: message.subject, sender: message.sender });
        results.push({ index: message.index, messageId: message.id, subject: message.subject, action: 'error', status: 'failed', error: itemError.message });
      }
    }
    res.json({ scanned: messages.length, actioned: results.filter(x => x.status === 'success').length, protected: protectedCount, failed: results.filter(x => x.status === 'failed').length, results });
  } catch (error) {
    console.error('Inbox scan failed:', error);
    res.status(500).json({ error: error.message || 'Inbox scan failed' });
  }
});


router.get('/rules', (req, res) => res.json(rulesService.getAllRules(req.userId)));
router.post('/rules', (req, res) => {
  try { res.status(201).json(rulesService.createRule(req.userId, req.body)); }
  catch (error) { res.status(400).json({ error: error.message }); }
});
router.put('/rules/:id', (req, res) => {
  try {
    const updated = rulesService.updateRule(req.userId, req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Rule not found' });
    res.json(updated);
  } catch (error) { res.status(400).json({ error: error.message }); }
});
router.patch('/rules/:id/status', (req, res) => {
  const updated = rulesService.setRuleActive(req.userId, req.params.id, !!req.body.active);
  if (!updated) return res.status(404).json({ error: 'Rule not found' });
  res.json(updated);
});
router.delete('/rules/:id', (req, res) => {
  rulesService.deleteRule(req.userId, req.params.id);
  res.status(204).end();
});
router.get('/protected-messages', (req, res) => res.json(rulesService.getProtectedMessages(req.userId)));

// Per-user protected sender management
router.get('/protected-senders', (req, res) => {
  res.json(rulesService.getProtectedSenders(req.userId));
});
router.post('/protected-senders', (req, res) => {
  try {
    const item = rulesService.addProtectedSender(req.userId, req.body.sender);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.delete('/protected-senders/:id', (req, res) => {
  rulesService.removeProtectedSender(req.userId, req.params.id);
  res.status(204).end();
});

router.get('/log', (req, res) => res.json(logService.getRecentActions(req.userId)));

// Return actual Gmail Trash messages, not only messages trashed by this app.
router.get('/trash', async (req, res) => {
  try {
    res.json(await gmailService.listTrashMessages(req.userId, { maxResults: 100 }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore any message currently in Gmail Trash by its Gmail message ID.
router.post('/trash/message/:messageId/restore', async (req, res) => {
  try {
    await gmailService.restoreMessage(req.userId, req.params.messageId);
    logService.markRestoredByMessage(req.userId, req.params.messageId);
    res.json({ restored: true, messageId: req.params.messageId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backward-compatible restore endpoint for previous activity-log entries.
router.post('/trash/:logId/restore', async (req, res) => {
  try {
    const entry = logService.getLogEntry(req.userId, req.params.logId);
    if (!entry) return res.status(404).json({ error: 'Log entry not found' });
    if (entry.restored) return res.status(400).json({ error: 'Already restored' });
    await gmailService.restoreMessage(
      req.userId,
      entry.gmail_message_id,
      JSON.parse(entry.previous_label_ids || '[]')
    );
    logService.markRestored(req.userId, entry.id);
    res.json({ restored: true, messageId: entry.gmail_message_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
