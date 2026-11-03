import { useEffect, useState } from 'react';
import { api } from '../api';

export default function TrashRecovery({ connected }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  const load = async () => {
    try {
      setError(null);
      setEntries(await api.getTrash());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (connected) load();
  }, [connected]);

  const restore = async (messageId) => {
    setRestoringId(messageId);
    try {
      await api.restore(messageId);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <>
      <h1 className="page-title">Trash &amp; Recovery</h1>
      <p className="page-sub">
        Messages currently in your Gmail Trash. Restore a message before Gmail permanently removes it.
      </p>
      <div className="panel">
        <div className="panel-header">
          <h2>Trash messages ({entries.length})</h2>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
        </div>
        <div className="panel-body">
          {error && <div className="empty" style={{ color: 'var(--amber)' }}>{error}</div>}
          {!error && entries.length === 0 && (
            <div className="empty">Your Gmail Trash is empty.</div>
          )}
          {entries.map((entry) => (
            <div className="row" key={entry.id}>
              <div className="row-main">
                <div className="row-title">
                  <span className="tag">#{entry.index}</span> {entry.subject || '(no subject)'}
                </div>
                <div className="row-sub">{entry.sender} · {entry.date || ''}</div>
                {entry.snippet && <div className="row-sub">{entry.snippet}</div>}
              </div>
              <button
                className="btn btn-teal"
                onClick={() => restore(entry.id)}
                disabled={restoringId === entry.id}
              >
                {restoringId === entry.id ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
