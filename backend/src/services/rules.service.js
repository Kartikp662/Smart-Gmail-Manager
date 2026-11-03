const db = require('../db/db');

const ALLOWED_FIELDS = ['sender', 'subject', 'message', 'recipient', 'date', 'has_attachment', 'category'];
const ALLOWED_MATCHES = ['contains', 'not_contains', 'equals', 'starts_with', 'ends_with', 'before', 'after', 'is'];
const ALLOWED_ACTIONS = ['archive', 'trash', 'protect'];

function getActiveRules(userId) {
  return db.prepare('SELECT * FROM rules WHERE user_id=? AND is_active=1 ORDER BY id').all(userId);
}
function getAllRules(userId) {
  return db.prepare('SELECT * FROM rules WHERE user_id=? ORDER BY id').all(userId);
}
function validateRule({field, match_type, value, action}) {
  if (!ALLOWED_FIELDS.includes(field)) throw new Error('Invalid rule field');
  if (!ALLOWED_MATCHES.includes(match_type)) throw new Error('Invalid match condition');
  if (!ALLOWED_ACTIONS.includes(action)) throw new Error('Invalid rule action');
  if (value === undefined || value === null || String(value).trim() === '') throw new Error('Rule value is required');
  if (String(value).length > 500) throw new Error('Rule value is too long');
  if (['date'].includes(field) && Number.isNaN(Date.parse(value))) throw new Error('Enter a valid date');
  if (field === 'has_attachment' && !['yes','no','true','false'].includes(String(value).toLowerCase())) throw new Error('Attachment value must be Yes or No');
  if (['before','after'].includes(match_type) && field !== 'date') throw new Error('Before and After are only valid for Date Received');
}
function createRule(userId, data) {
  validateRule(data);
  const info = db.prepare(
    'INSERT INTO rules(user_id,field,match_type,value,action,label_name,is_active) VALUES(?,?,?,?,?,?,1)'
  ).run(userId, data.field, data.match_type, String(data.value).trim(), data.action, null);
  return db.prepare('SELECT * FROM rules WHERE id=? AND user_id=?').get(info.lastInsertRowid, userId);
}
function updateRule(userId, id, data) {
  validateRule(data);
  db.prepare('UPDATE rules SET field=?,match_type=?,value=?,action=? WHERE id=? AND user_id=?')
    .run(data.field, data.match_type, String(data.value).trim(), data.action, id, userId);
  return db.prepare('SELECT * FROM rules WHERE id=? AND user_id=?').get(id, userId);
}
function setRuleActive(userId, id, active) {
  db.prepare('UPDATE rules SET is_active=? WHERE id=? AND user_id=?').run(active ? 1 : 0, id, userId);
  return db.prepare('SELECT * FROM rules WHERE id=? AND user_id=?').get(id, userId);
}
function deleteRule(userId, id) {
  db.prepare('DELETE FROM rules WHERE id=? AND user_id=?').run(id, userId);
}
function extractFieldValue(message, field) {
  if (field === 'sender') return message.sender || '';
  if (field === 'subject') return message.subject || '';
  if (field === 'message') return `${message.body || ''} ${message.snippet || ''}`;
  if (field === 'recipient') return message.recipient || '';
  if (field === 'date') return message.date || '';
  if (field === 'has_attachment') return message.hasAttachment ? 'yes' : 'no';
  if (field === 'category') return (message.categories || []).join(' ');
  return '';
}
function matches(rule, message) {
  const raw = extractFieldValue(message, rule.field);
  const value = String(raw).toLowerCase();
  const target = String(rule.value || '').toLowerCase();
  if (rule.match_type === 'before' || rule.match_type === 'after') {
    const actualDate = new Date(raw).getTime();
    const targetDate = new Date(rule.value).getTime();
    if (!Number.isFinite(actualDate) || !Number.isFinite(targetDate)) return false;
    return rule.match_type === 'before' ? actualDate < targetDate : actualDate > targetDate;
  }
  if (rule.match_type === 'is') return value === target;
  if (rule.match_type === 'equals') return value === target;
  if (rule.match_type === 'not_contains') return !value.includes(target);
  if (rule.match_type === 'starts_with') return value.startsWith(target);
  if (rule.match_type === 'ends_with') return value.endsWith(target);
  return value.includes(target);
}
function findMatchingRule(message, rules) {
  return rules.find((rule) => matches(rule, message)) || null;
}
function getProtectedSenders(userId) {
  return db.prepare('SELECT * FROM protected_senders WHERE user_id=? ORDER BY sender').all(userId);
}
function addProtectedSender(userId, sender) {
  const clean = String(sender || '').trim().toLowerCase();
  if (!clean) throw new Error('Sender address is required');
  db.prepare('INSERT OR IGNORE INTO protected_senders(user_id,sender) VALUES(?,?)').run(userId, clean);
  return db.prepare('SELECT * FROM protected_senders WHERE user_id=? AND sender=?').get(userId, clean);
}
function removeProtectedSender(userId, id) {
  db.prepare('DELETE FROM protected_senders WHERE id=? AND user_id=?').run(id, userId);
}
function protectMessage(userId, message) {
  db.prepare('INSERT OR IGNORE INTO protected_messages(user_id,gmail_message_id,sender,subject) VALUES(?,?,?,?)')
    .run(userId, message.id, message.sender || '', message.subject || '');
}
function getProtectedMessages(userId) {
  return db.prepare('SELECT * FROM protected_messages WHERE user_id=? ORDER BY id DESC').all(userId);
}
function isProtected(message, protectedSenders, protectedMessages = []) {
  const sender = String(message.sender || '').toLowerCase();
  return protectedSenders.some((item) => sender.includes(item.sender)) ||
    protectedMessages.some((item) => item.gmail_message_id === message.id);
}
module.exports = {
  getActiveRules, getAllRules, createRule, updateRule, setRuleActive, deleteRule,
  findMatchingRule, getProtectedSenders, addProtectedSender, removeProtectedSender,
  isProtected, protectMessage, getProtectedMessages, validateRule
};
