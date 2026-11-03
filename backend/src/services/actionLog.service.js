const db=require('../db/db');
function logAction(userId,{gmail_message_id,rule_id,action,previous_label_ids,subject,sender}){db.prepare('INSERT INTO action_log(user_id,gmail_message_id,rule_id,action,previous_label_ids,subject,sender) VALUES(?,?,?,?,?,?,?)').run(userId,gmail_message_id,rule_id||null,action,JSON.stringify(previous_label_ids||[]),subject||'',sender||'');}
function getRecentActions(userId,limit=50){return db.prepare('SELECT * FROM action_log WHERE user_id=? ORDER BY created_at DESC LIMIT ?').all(userId,limit);}
function getRecoverableTrash(userId){return db.prepare("SELECT * FROM action_log WHERE user_id=? AND action='trash' AND restored=0 ORDER BY created_at DESC").all(userId);}
function markRestoredByMessage(userId,messageId){db.prepare("UPDATE action_log SET restored=1 WHERE user_id=? AND gmail_message_id=? AND action='trash' AND restored=0").run(userId,messageId)}
function markRestored(userId,id){db.prepare('UPDATE action_log SET restored=1 WHERE id=? AND user_id=?').run(id,userId);}
function getLogEntry(userId,id){return db.prepare('SELECT * FROM action_log WHERE id=? AND user_id=?').get(id,userId);}
module.exports={logAction,getRecentActions,getRecoverableTrash,markRestored,markRestoredByMessage,getLogEntry};
