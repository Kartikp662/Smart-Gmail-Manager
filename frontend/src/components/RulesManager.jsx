import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const emptyForm = { field: 'sender', match_type: 'contains', value: '', action: 'trash' };
const fields = [
  ['sender', 'Sender'], ['subject', 'Subject'], ['message', 'Email Body'],
  ['recipient', 'Recipient'], ['date', 'Date Received'],
  ['has_attachment', 'Has Attachment'], ['category', 'Email Category']
];
const matchesByField = {
  sender: ['contains','not_contains','equals','starts_with','ends_with'],
  subject: ['contains','not_contains','equals','starts_with','ends_with'],
  message: ['contains','not_contains','equals','starts_with','ends_with'],
  recipient: ['contains','not_contains','equals','starts_with','ends_with'],
  date: ['before','after','is','equals'],
  has_attachment: ['is','equals'],
  category: ['contains','not_contains','equals','is']
};
const matchLabels = {
  contains:'Contains', not_contains:'Does Not Contain', equals:'Equals',
  starts_with:'Starts With', ends_with:'Ends With', before:'Before',
  after:'After', is:'Is'
};
const actionLabels = { trash:'Move to Trash', archive:'Archive', protect:'Protect Email' };

export default function RulesManager({ connected }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [protectedSenders, setProtectedSenders] = useState([]);
  const [protectedInput, setProtectedInput] = useState('');

  const load = async () => {
    try {
      const [ruleData, protectedData] = await Promise.all([api.getRules(), api.getProtectedSenders()]);
      setRules(ruleData);
      setProtectedSenders(protectedData);
      setError('');
    } catch (err) { setError(err.message); }
  };
  useEffect(() => { if (connected) load(); }, [connected]);

  const availableMatches = useMemo(() => matchesByField[form.field] || ['contains','equals'], [form.field]);
  const changeField = (field) => setForm({ ...form, field, match_type: matchesByField[field][0], value: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!String(form.value).trim()) { setError('Please enter a value for this rule.'); return; }
    setLoading(true); setError('');
    try {
      if (editingId) await api.updateRule(editingId, form);
      else await api.createRule(form);
      setForm(emptyForm); setEditingId(null); await load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  const edit = (rule) => {
    setEditingId(rule.id);
    setForm({ field: rule.field, match_type: rule.match_type, value: rule.value, action: rule.action });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };
  const toggle = async (rule) => {
    try { await api.setRuleActive(rule.id, !rule.is_active); await load(); }
    catch (err) { setError(err.message); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this filtering rule?')) return;
    try { await api.deleteRule(id); await load(); }
    catch (err) { setError(err.message); }
  };
  const addProtected = async (e) => {
    e.preventDefault();
    if (!protectedInput.trim()) return;
    try { await api.addProtectedSender(protectedInput.trim()); setProtectedInput(''); await load(); }
    catch (err) { setError(err.message); }
  };
  const removeProtected = async (id) => {
    try { await api.deleteProtectedSender(id); await load(); }
    catch (err) { setError(err.message); }
  };

  return <>
    <h1 className="page-title">Smart Filters</h1>
    <p className="page-sub">Create user-specific rules for received Gmail messages. Rules run from top to bottom; the first matching rule is applied.</p>
    {error && <div className="banner banner-connect" role="alert">{error}</div>}
    <div className="panel">
      <div className="panel-header"><h2>{editingId ? 'Edit rule' : 'New rule'}</h2></div>
      <form onSubmit={submit}>
        <div className="form-grid rules-form-grid">
          <div className="field">
            <label>Field</label>
            <select value={form.field} onChange={e => changeField(e.target.value)}>
              {fields.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Match</label>
            <select value={form.match_type} onChange={e => setForm({ ...form, match_type:e.target.value })}>
              {availableMatches.map(value => <option key={value} value={value}>{matchLabels[value]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Value</label>
            {form.field === 'date' ?
              <input type="date" value={form.value} onChange={e => setForm({ ...form, value:e.target.value })} required /> :
              form.field === 'has_attachment' ?
                <select value={form.value} onChange={e => setForm({ ...form, value:e.target.value })} required>
                  <option value="">Choose…</option><option value="yes">Has attachment</option><option value="no">No attachment</option>
                </select> :
                form.field === 'category' ?
                  <select value={form.value} onChange={e => setForm({ ...form, value:e.target.value })} required>
                    <option value="">Choose category…</option>
                    {['primary','social','promotions','updates','forums'].map(v => <option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}
                  </select> :
                  <input value={form.value} onChange={e => setForm({ ...form, value:e.target.value })} placeholder={form.field === 'sender' ? 'e.g. offers@example.com' : 'Enter keyword or text'} required />
            }
          </div>
          <div className="field">
            <label>Action</label>
            <select value={form.action} onChange={e => setForm({ ...form, action:e.target.value })}>
              <option value="trash">Move to Trash</option>
              <option value="archive">Archive</option>
              <option value="protect">Protect Email</option>
            </select>
          </div>
        </div>
        <div style={{padding:'14px 18px',display:'flex',gap:8}}>
          <button className="btn btn-primary" type="submit" disabled={loading || !connected}>{loading ? 'Saving…' : editingId ? 'Save changes' : 'Add rule'}</button>
          {editingId && <button className="btn btn-ghost" type="button" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>
    </div>

    <div className="panel">
      <div className="panel-header"><h2>Protected senders ({protectedSenders.length})</h2></div>
      <form onSubmit={addProtected}>
        <div className="form-grid" style={{gridTemplateColumns:'1fr auto'}}>
          <div className="field"><label>Sender email or domain to protect</label><input value={protectedInput} onChange={e => setProtectedInput(e.target.value)} placeholder="e.g. college.edu or teacher@gmail.com" /></div>
          <div className="field"><label>&nbsp;</label><button className="btn btn-primary" type="submit">Protect sender</button></div>
        </div>
      </form>
      <div className="panel-body">
        {protectedSenders.length === 0 && <div className="empty">No protected senders yet.</div>}
        {protectedSenders.map(item => <div className="row" key={item.id}>
          <div className="row-main"><div className="row-title">{item.sender}</div><div className="row-sub">Excluded from automatic archive and Trash actions</div></div>
          <button className="btn btn-ghost" onClick={() => removeProtected(item.id)}>Remove</button>
        </div>)}
      </div>
    </div>

    <div className="panel">
      <div className="panel-header"><h2>Saved rules ({rules.length})</h2><button className="btn btn-ghost" onClick={load}>Refresh</button></div>
      <div className="panel-body">
        {rules.length === 0 && <div className="empty">No rules yet — add one above.</div>}
        {rules.map(rule => <div className="row rule-row" key={rule.id}>
          <div className="row-main">
            <div className="row-title">{fields.find(x=>x[0]===rule.field)?.[1] || rule.field} {matchLabels[rule.match_type] || rule.match_type} "{rule.value}"</div>
            <div className="row-sub">{actionLabels[rule.action] || rule.action}</div>
          </div>
          <span className={`tag tag-${rule.action}`}>{rule.is_active ? 'Enabled' : 'Disabled'}</span>
          <button className="btn btn-ghost" onClick={() => toggle(rule)}>{rule.is_active ? 'Disable' : 'Enable'}</button>
          <button className="btn btn-ghost" onClick={() => edit(rule)}>Edit</button>
          <button className="btn btn-ghost" onClick={() => remove(rule.id)}>Delete</button>
        </div>)}
      </div>
    </div>
  </>;
}
