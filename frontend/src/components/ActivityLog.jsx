import { useEffect, useState } from 'react';
import { api } from '../api';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso + 'Z').getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityLog({ connected }) {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!connected) return;
    api
      .getLog()
      .then(setEntries)
      .catch((err) => setError(err.message));
  }, [connected]);

  return (
    <>
      <h1 className="page-title">Activity Log</h1>
      <p className="page-sub">Every automated action taken on your inbox, most recent first.</p>

      <div className="panel">
        <div className="panel-header">
          <h2>Recent actions ({entries.length})</h2>
        </div>
        <div className="panel-body">
          {error && <div className="empty" style={{ color: 'var(--amber)' }}>{error}</div>}
          {!error && entries.length === 0 && (
            <div className="empty">No actions yet. Run a scan from the Overview tab.</div>
          )}
          {entries.map((entry) => (
            <div className="row" key={entry.id}>
              <div className="row-main">
                <div className="row-title">{entry.subject || '(no subject)'}</div>
                <div className="row-sub">
                  {entry.sender} · {timeAgo(entry.created_at)}
                  {entry.restored ? ' · restored' : ''}
                </div>
              </div>
              <span className={`tag tag-${entry.action}`}>{entry.action}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
