import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, formatDate, money } from '../api';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { Loader } from '../components/Guards';

const TABS = [
  ['', 'All'],
  ['review', 'Needs review'],
  ['pending', 'Unpaid'],
  ['paid', 'Paid'],
  ['failed', 'Failed'],
  ['refunded', 'Refunded'],
];

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState(params.get('q') || '');

  const qs = params.toString();
  useEffect(() => {
    setData(null);
    api(`/orders?${qs}`).then(setData).catch((e) => toast.error(e.message));
  }, [qs]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <>
      <h1>Orders</h1>
      <div className="chips">
        {TABS.map(([value, label]) => (
          <button key={label} className={`chip ${(params.get('payment') || '') === value ? 'active' : ''}`} onClick={() => update('payment', value)}>
            {label}
          </button>
        ))}
      </div>
      <form className="inline-form mt" onSubmit={(e) => { e.preventDefault(); update('q', search.trim()); }}>
        <input placeholder="Order no., UTR, design ID or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-ghost">Search</button>
      </form>

      {!data ? <Loader /> : data.items.length === 0 ? <p className="muted mt">No orders found.</p> : (
        <div className="card table-wrap mt">
          <table className="table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o._id}>
                  <td><Link to={`/admin/orders/${o._id}`}><strong>#{o.orderNumber}</strong></Link><div className="muted small">{formatDate(o.createdAt)}</div></td>
                  <td>{o.user?.name || "Customer"}<div className="muted small">{o.user?.phone}</div></td>
                  <td className="small">
                    {o.items[0]?.kind === 'package' ? `📦 ${o.items[0].name}` : o.items.map((i) => i.code).join(', ')}
                  </td>
                  <td><strong>{money(o.total)}</strong></td>
                  <td>{o.paymentMethod}{o.upiRef && <div className="muted small mono">{o.upiRef}</div>}</td>
                  <td><StatusBadge value={o.status === 'cancelled' ? 'cancelled' : o.paymentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(p) => update('page', String(p))} />}
    </>
  );
}
