import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate } from '../api';
import { DesignImage, Formats } from '../components/DesignCard';
import DownloadButtons from '../components/DownloadButtons';
import StatusBadge from '../components/StatusBadge';
import { Loader } from '../components/Guards';

const VIA = { free: 'Free', purchase: 'Purchased', package: 'Package' };

export default function MyDownloads() {
  const [library, setLibrary] = useState(null);
  const [subs, setSubs] = useState([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const loadSubs = useCallback(() => api('/me/subscriptions').then(setSubs).catch(() => {}), []);

  useEffect(() => {
    api('/me/library').then(setLibrary).catch((e) => setError(e.message));
    loadSubs();
  }, [loadSubs]);

  if (error) return <p className="error">{error}</p>;
  if (!library) return <Loader />;

  const active = subs.filter((s) => s.status === 'active');
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? library.filter(({ design }) => String(design.code).includes(needle) || design.name.toLowerCase().includes(needle))
    : library;

  return (
    <>
      <div className="section-head">
        <h1>My downloads</h1>
        <Link to="/designs" className="btn btn-ghost">Find more designs</Link>
      </div>

      {active.length > 0 ? (
        <div className="sub-grid">
          {active.map((s) => (
            <div key={s._id} className="card sub-card">
              <div className="sub-top">
                <strong>{s.name}</strong>
                <StatusBadge value={s.status} />
              </div>
              <div className="sub-big">{s.remaining}</div>
              <div className="muted small">
                {s.type === 'daily' ? `downloads left today (of ${s.limit}/day)` : `downloads left (of ${s.limit})`}
              </div>
              <div className="meter"><span style={{ width: `${Math.min(100, (s.remaining / s.limit) * 100)}%` }} /></div>
              <div className="muted small">Valid till {formatDate(s.expiresAt)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card pad promo">
          <div>
            <strong>No active download package</strong>
            <p className="muted small">Get a daily or total quota and download designs at a lower price.</p>
          </div>
          <Link to="/packages" className="btn">See packages</Link>
        </div>
      )}

      <div className="section-head mt">
        <h2>Your designs ({library.length})</h2>
        {library.length > 6 && (
          <input className="narrow" placeholder="Search ID or name" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
      </div>

      {library.length === 0 ? (
        <div className="empty card">
          <p>Designs you buy or download will appear here.</p>
          <div className="inline-form">
            <Link to="/free-designs" className="btn btn-outline">Try a free design</Link>
            <Link to="/designs" className="btn">Browse designs</Link>
          </div>
        </div>
      ) : (
        <div className="stack">
          {shown.map(({ design, via, date }) => (
            <div key={design._id} className="card library-row">
              <Link to={`/design/${design.code}`}>
                <DesignImage src={design.images?.[0]} alt={design.name} className="line-img" />
              </Link>
              <div className="line-body">
                <Link to={`/design/${design.code}`} className="line-name">{design.name}</Link>
                <div className="card-meta">
                  <span className="id-chip">ID {design.code}</span>
                  <Formats formats={design.formats} />
                  <span className="muted small">{VIA[via]} · {formatDate(date)}</span>
                </div>
              </div>
              <DownloadButtons design={design} compact onDownloaded={loadSubs} />
            </div>
          ))}
          {shown.length === 0 && <p className="muted">No designs match “{q}”.</p>}
        </div>
      )}
    </>
  );
}
