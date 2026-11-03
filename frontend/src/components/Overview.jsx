import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Overview({ connected }) {
  const [rulesCount, setRulesCount] = useState(null);
  const [logCount, setLogCount] = useState(null);
  const [trashCount, setTrashCount] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    try {
      const [rules, log, trash] = await Promise.all([
        api.getRules(),
        api.getLog(),
        api.getTrash(),
      ]);
      setRulesCount(rules.length);
      setLogCount(log.length);
      setTrashCount(trash.length);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (connected) loadStats();
  }, [connected]);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await api.scan(50);
      setScanResult(result);
      await loadStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <h1 className="page-title">Overview</h1>
      <p className="page-sub">Connection status, rule coverage, and manual scans.</p>

      {!connected && (
        <div className="banner banner-connect">
          <span>No Gmail account connected yet.</span>
          <a className="btn btn-primary" href="/auth/google">
            Connect Gmail
          </a>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-value">{rulesCount ?? '—'}</div>
          <div className="stat-label">Active rules</div>
        </div>
        <div className="stat">
          <div className="stat-value">{logCount ?? '—'}</div>
          <div className="stat-label">Actions logged</div>
        </div>
        <div className="stat">
          <div className="stat-value">{trashCount ?? '—'}</div>
          <div className="stat-label">Recoverable in trash</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Manual scan</h2>
          <button className="btn btn-primary" onClick={runScan} disabled={!connected || scanning}>
            {scanning ? 'Scanning…' : 'Scan inbox now'}
          </button>
        </div>
        <div className="panel-body">
          {error && <div className="empty" style={{ color: 'var(--amber)' }}>{error}</div>}
          {scanResult && !error && (
            <div style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-muted)' }}>
              Scanned <strong style={{ color: 'var(--text)' }}>{scanResult.scanned}</strong> messages,
              took action on{' '}
              <strong style={{ color: 'var(--text)' }}>{scanResult.actioned}</strong>,
              and protected <strong>{scanResult.protected || 0}</strong> messages.
              An automatic scan also runs every 5 minutes in the background.
            </div>
          )}
          {scanResult?.results?.length > 0 && (
            <div className="panel-body">
              <h3>Scan results</h3>
              {scanResult.results.map((item) => (
                <div className="row" key={item.messageId}>
                  <div className="row-main">
                    <div className="row-title">Mail #{item.index}: {item.subject || '(no subject)'}</div>
                    <div className="row-sub">{item.sender || ''}</div>
                  </div>
                  <span className={`tag tag-${item.action}`}>{item.action}</span>
                </div>
              ))}
            </div>
          )}
          {!scanResult && !error && (
            <div className="empty">Run a scan to apply your rules to the current inbox.</div>
          )}
        </div>
      </div>
    </>
  );
}
