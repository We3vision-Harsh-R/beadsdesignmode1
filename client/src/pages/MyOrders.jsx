import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, money } from '../api';
import StatusBadge from '../components/StatusBadge';
import { Loader } from '../components/Guards';

export default function MyOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/orders/mine').then(setOrders).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!orders) return <Loader />;

  return (
    <>
      <h1>My orders</h1>
      {orders.length === 0 ? (
        <div className="empty card">
          <p>You haven't placed any orders yet.</p>
          <Link to="/designs" className="btn">Browse designs</Link>
        </div>
      ) : (
        <div className="stack">
          {orders.map((o) => (
            <Link key={o._id} to={`/orders/${o._id}`} className="card order-row">
              <div>
                <strong>#{o.orderNumber}</strong>
                <div className="muted small">
                  {formatDate(o.createdAt)} ·{' '}
                  {o.items[0]?.kind === 'package' ? `${o.items[0].name} package` : `${o.items.length} design(s)`}
                </div>
              </div>
              <StatusBadge value={o.status === 'cancelled' ? 'cancelled' : o.paymentStatus} />
              <strong>{money(o.total)}</strong>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
