import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, formatDate, money } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Loader } from '../components/Guards';

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api(`/admin/users/${id}`).then(setData).catch((e) => toast.error(e.message));
  }, [id]);

  if (!data) return <Loader />;
  const { user, orders, purchases, packages } = data;
  const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
  const spent = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const designCount = new Set(purchases.filter((p) => p.type === 'Design').map((p) => p.sku || p.name)).size;

  return (
    <>
      <Link to="/admin/users" className="muted">← Customers</Link>
      <div className="section-head">
        <div>
          <h1>{user.name || 'No name'}</h1>
          <p className="muted">Joined {formatDate(user.createdAt)}</p>
        </div>
        <span className={`status ${user.role === 'admin' ? 'status-confirmed' : ''}`}>{user.role}</span>
      </div>

      <div className="stats">
        <div className="card stat"><span className="muted">Mobile</span><strong className="mono">{user.phone || '—'}</strong></div>
        <div className="card stat"><span className="muted">Email</span><strong className="small-strong">{user.email || '—'}</strong></div>
        <div className="card stat"><span className="muted">Paid orders</span><strong>{paidOrders.length}</strong></div>
        <div className="card stat"><span className="muted">Total spent</span><strong>{money(spent)}</strong></div>
        <div className="card stat"><span className="muted">Designs owned</span><strong>{designCount}</strong></div>
      </div>

      <h2>Designs &amp; packages bought</h2>
      {purchases.length === 0 ? <p className="muted">Nothing bought or downloaded yet.</p> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>SKU</th><th>Design / Package</th><th>Amount</th><th>How</th><th>Order</th></tr></thead>
            <tbody>
              {purchases.map((p, i) => (
                <tr key={i}>
                  <td className="small nowrap">{formatDate(p.date)}</td>
                  <td className="mono">{p.sku || '—'}</td>
                  <td>{p.name}</td>
                  <td>{p.amount ? money(p.amount) : '—'}</td>
                  <td className="small">{p.how}</td>
                  <td className="small mono">{p.order || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {packages.length > 0 && (
        <>
          <h2 className="mt">Download packages</h2>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>Package</th><th>Limit</th><th>Used</th><th>Valid</th></tr></thead>
              <tbody>
                {packages.map((p, i) => (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td>{p.limit} {p.type === 'daily' ? 'per day' : 'total'}</td>
                    <td>{p.used}</td>
                    <td className="small">{formatDate(p.startsAt)} → {formatDate(p.expiresAt)}{!p.isActive && ' (cancelled)'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mt">All orders ({orders.length})</h2>
      {orders.length === 0 ? <p className="muted">No orders.</p> : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Mobile given</th><th>Items</th><th>Total</th><th>Payment</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td><Link to={`/admin/orders/${o._id}`}><strong>#{o.orderNumber}</strong></Link><div className="muted small">{formatDate(o.createdAt)}</div></td>
                  <td className="mono">{o.phone || '—'}</td>
                  <td className="small">{o.items.map((i) => i.sku || i.name).join(', ')}</td>
                  <td>{money(o.total)}</td>
                  <td><StatusBadge value={o.status === 'cancelled' ? 'cancelled' : o.paymentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
