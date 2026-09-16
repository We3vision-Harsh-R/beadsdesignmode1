import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, money, num } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Loader } from '../components/Guards';

function RevenueChart({ daily }) {
  const days = [];
  const byDay = Object.fromEntries(daily.map((d) => [d._id, d]));
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    days.push({ key, revenue: byDay[key]?.revenue || 0, orders: byDay[key]?.orders || 0 });
  }
  const max = Math.max(...days.map((d) => d.revenue), 1);
  return (
    <div className="chart" role="img" aria-label="Revenue for the last 30 days">
      {days.map((d) => (
        <div key={d.key} className="bar-wrap" title={`${d.key}: ${money(d.revenue)} (${d.orders} orders)`}>
          <div className="bar" style={{ height: `${(d.revenue / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/stats').then(setS).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!s) return <Loader />;

  const last30 = s.daily.reduce((a, d) => a + d.revenue, 0);

  return (
    <>
      <div className="section-head">
        <h1>Dashboard</h1>
        <Link to="/admin/designs/new" className="btn">+ Upload design</Link>
      </div>

      {s.needsReview > 0 && (
        <Link to="/admin/orders?payment=review" className="alert action-alert">
          <strong>{s.needsReview} UPI payment{s.needsReview > 1 ? 's' : ''} waiting for your check</strong>
          <span>Review now →</span>
        </Link>
      )}

      <div className="stats">
        <div className="card stat"><span className="muted">Revenue (all time)</span><strong>{money(s.revenue)}</strong><span className="small muted">{s.paidOrders} paid orders</span></div>
        <div className="card stat"><span className="muted">Last 30 days</span><strong>{money(last30)}</strong></div>
        <div className="card stat"><span className="muted">Designs live</span><strong>{s.liveDesigns} / {s.designs}</strong><span className="small muted">{s.freeDesigns} free</span></div>
        <div className="card stat"><span className="muted">Downloads</span><strong>{num(s.downloads)}</strong><span className="small muted">{s.unlocks30d} new unlocks in 30 days</span></div>
        <div className="card stat"><span className="muted">Customers</span><strong>{s.users}</strong><span className="small muted">{s.activeSubs} active packages</span></div>
      </div>

      <div className="card pad">
        <h3>Revenue · last 30 days</h3>
        <RevenueChart daily={s.daily} />
      </div>

      <div className="two-col even">
        <div className="card pad">
          <div className="section-head"><h3>Recent orders</h3><Link to="/admin/orders">All →</Link></div>
          {s.recentOrders.length === 0 ? <p className="muted">No orders yet.</p> : (
            <table className="table">
              <tbody>
                {s.recentOrders.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <Link to={`/admin/orders/${o._id}`}>#{o.orderNumber}</Link>
                      <div className="muted small">{o.user?.name} · {formatDate(o.createdAt)}</div>
                    </td>
                    <td><StatusBadge value={o.status === 'cancelled' ? 'cancelled' : o.paymentStatus} /></td>
                    <td className="right">{money(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card pad">
          <div className="section-head"><h3>Most downloaded</h3><Link to="/admin/designs">All →</Link></div>
          {s.topDesigns.length === 0 ? <p className="muted">No designs yet.</p> : (
            <table className="table">
              <tbody>
                {s.topDesigns.map((d) => (
                  <tr key={d._id}>
                    <td><Link to={`/admin/designs/${d._id}`}>{d.name}</Link><div className="muted small">ID {d.code} · {d.isFree ? 'Free' : money(d.price)}</div></td>
                    <td className="right">{num(d.downloads)} ⬇</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
