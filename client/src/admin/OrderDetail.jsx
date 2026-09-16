import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, formatDate, money } from '../api';
import StatusBadge from '../components/StatusBadge';
import { OrderItems } from '../pages/OrderDetail';
import { Loader } from '../components/Guards';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/orders/${id}`)
      .then((o) => {
        setOrder(o);
        setNote(o.adminNote || '');
      })
      .catch((e) => toast.error(e.message));
  }, [id]);

  const patch = async (body, question) => {
    if (question && !confirm(question)) return;
    setBusy(true);
    try {
      setOrder(await api(`/orders/${id}`, { method: 'PATCH', body }));
      toast.success('Order updated');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!order) return <Loader />;
  const cancelled = order.status === 'cancelled';
  const paid = order.paymentStatus === 'paid';

  return (
    <>
      <Link to="/admin/orders" className="muted">← Orders</Link>
      <div className="section-head">
        <div>
          <h1>Order #{order.orderNumber}</h1>
          <p className="muted">
            {formatDate(order.createdAt)} · {order.user?.name} · {order.user?.email}
            {order.user?.phone && ` · ${order.user.phone}`}
          </p>
        </div>
        <StatusBadge value={cancelled ? 'cancelled' : order.paymentStatus} />
      </div>

      <div className="card pad stack">
        <div className="pay-facts">
          <div><span className="muted small">Method</span><strong>{order.paymentMethod === 'UPI' ? 'UPI (manual)' : 'Razorpay'}</strong></div>
          <div><span className="muted small">Amount</span><strong>{money(order.total)}</strong></div>
          {order.upiRef && <div><span className="muted small">UPI transaction / UTR</span><strong className="mono">{order.upiRef}</strong></div>}
          {order.razorpayPaymentId && <div><span className="muted small">Razorpay payment ID</span><strong className="mono">{order.razorpayPaymentId}</strong></div>}
          {order.paidAt && <div><span className="muted small">Paid at</span><strong>{formatDate(order.paidAt)}</strong></div>}
        </div>

        {order.paymentStatus === 'review' && (
          <p className="alert">Check your bank / UPI app for a payment of <strong>{money(order.total)}</strong> with UTR <strong className="mono">{order.upiRef}</strong>, then approve or reject it.</p>
        )}

        {!cancelled && (
          <div className="inline-form">
            {!paid && order.paymentMethod === 'RAZORPAY' && (
              <button
                className="btn"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const updated = await api(`/orders/${id}/sync-payment`, { method: 'POST' });
                    setOrder(updated);
                    toast(updated.paymentStatus === 'paid' ? 'Paid on Razorpay - access given' : 'No completed Razorpay payment found', { icon: 'ℹ️' });
                  } catch (e) {
                    toast.error(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Check Razorpay
              </button>
            )}
            {!paid && (
              <button className="btn" disabled={busy} onClick={() => patch({ paymentStatus: 'paid' }, 'Mark as paid? The customer gets access right away.')}>
                ✓ Approve payment
              </button>
            )}
            {!paid && order.paymentStatus !== 'failed' && (
              <button className="btn btn-ghost" disabled={busy} onClick={() => patch({ paymentStatus: 'failed' }, 'Mark this payment as failed / not received?')}>
                Payment not received
              </button>
            )}
            {paid && (
              <button className="btn btn-outline danger" disabled={busy} onClick={() => patch({ status: 'cancelled' }, 'Refund & cancel? The customer loses access to these designs / this package. Send the money back yourself from your bank or Razorpay.')}>
                Refund & remove access
              </button>
            )}
            {!paid && (
              <button className="btn btn-ghost danger" disabled={busy} onClick={() => patch({ status: 'cancelled' }, 'Cancel this order?')}>
                Cancel order
              </button>
            )}
          </div>
        )}

        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); patch({ adminNote: note }); }}>
          <input placeholder="Private note (only admins see this)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          <button className="btn btn-ghost" disabled={busy}>Save note</button>
        </form>
      </div>

      <div className="mt"><OrderItems order={order} /></div>
    </>
  );
}
