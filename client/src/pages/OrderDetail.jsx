import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { api, formatDate, money } from '../api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import StatusBadge from '../components/StatusBadge';
import { DesignImage } from '../components/DesignCard';
import { Loader } from '../components/Guards';
import { payWithRazorpay } from './Checkout';

export function OrderItems({ order, linkDesigns = true }) {
  return (
    <div className="card list">
      {order.items.map((it) => (
        <div key={it.refId} className="line-item">
          {it.kind === 'design' ? (
            <DesignImage src={it.image} alt={it.name} className="line-img" />
          ) : (
            <div className="line-img pkg-icon">📦</div>
          )}
          <div className="line-body">
            {it.kind === 'design' && linkDesigns ? (
              <Link to={`/design/${it.code}`} className="line-name">{it.name}</Link>
            ) : (
              <div className="line-name">{it.name}</div>
            )}
            <div className="muted small">{it.kind === 'design' ? `SKU ${it.sku || it.code}` : 'Download package'}</div>
          </div>
          <strong>{money(it.price)}</strong>
        </div>
      ))}
      <div className="sum-row total"><span>Total</span><span>{money(order.total)}</span></div>
    </div>
  );
}

function UpiPayment({ order, onUpdate }) {
  const config = useConfig();
  const [qr, setQr] = useState('');
  const [ref, setRef] = useState(order.upiRef || '');
  const [busy, setBusy] = useState(false);
  const link = `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(config.upiName || '')}&am=${order.total}&cu=INR&tn=${encodeURIComponent(order.orderNumber)}`;

  useEffect(() => {
    if (config.upiId) QRCode.toDataURL(link, { width: 220, margin: 1 }).then(setQr).catch(() => {});
  }, [config.upiId, link]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      onUpdate(await api(`/orders/${order._id}/upi-ref`, { method: 'POST', body: { upiRef: ref.trim() } }));
      toast.success('Thanks! We will unlock your order after checking the payment.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!config.upiId) return null;

  return (
    <div className="card pad upi-box">
      <div className="upi-qr">
        {qr ? <img src={qr} alt="UPI QR code" width="220" height="220" /> : <Loader />}
        <a href={link} className="btn btn-block mobile-only">Open UPI app</a>
      </div>
      <div className="stack">
        <h3>Pay {money(order.total)} by UPI</h3>
        <ol className="small">
          <li>Scan the QR code, or pay to UPI ID <strong className="mono">{config.upiId}</strong>{config.upiName && ` (${config.upiName})`}.</li>
          <li>Pay exactly <strong>{money(order.total)}</strong>. Add note <strong className="mono">{order.orderNumber}</strong> if your app allows.</li>
          <li>Enter the UPI transaction ID / UTR number below.</li>
        </ol>
        <form className="inline-form" onSubmit={submit}>
          <input required value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UPI transaction ID / UTR" maxLength={30} />
          <button className="btn" disabled={busy}>{order.paymentStatus === 'review' ? 'Update' : 'Submit'}</button>
        </form>
        {order.paymentStatus === 'review' && (
          <p className="ok small">Received transaction ID {order.upiRef}. Your order will be unlocked after we verify it.</p>
        )}
        {config.whatsapp && (
          <a
            className="small"
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hi, I paid ${money(order.total)} for order ${order.orderNumber}. UTR: ${order.upiRef || ''}`)}`}
          >
            Send payment screenshot on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/orders/${id}`).then(setOrder).catch((e) => setError(e.message));
  }, [id]);

  const cancel = async () => {
    if (!confirm('Cancel this order?')) return;
    try {
      setOrder(await api(`/orders/${id}/cancel`, { method: 'POST' }));
      toast.success('Order cancelled');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const [paying, setPaying] = useState(false);

  // Opens Razorpay again for this order
  const payNow = async () => {
    setPaying(true);
    try {
      const { order: updated, razorpay } = await api(`/orders/${id}/pay`, { method: 'POST' });
      if (razorpay) {
        const paid = await payWithRazorpay({ order: updated, razorpay, user });
        setOrder(await api(`/orders/${id}`));
        if (!paid) toast('Payment not completed yet.', { icon: 'ℹ️' });
      } else {
        setOrder(await api(`/orders/${id}`));
        toast.success('Payment already received!');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPaying(false);
    }
  };

  // Money deducted but order still unpaid? Ask Razorpay directly
  const checkStatus = async () => {
    setPaying(true);
    try {
      const updated = await api(`/orders/${id}/sync-payment`, { method: 'POST' });
      setOrder(updated);
      if (updated.paymentStatus === 'paid') toast.success('Payment confirmed!');
      else toast('No completed payment found yet. If money was deducted, it usually updates within a few minutes.', { icon: 'ℹ️' });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPaying(false);
    }
  };

  if (error) return <p className="error">{error}</p>;
  if (!order) return <Loader />;

  const open = order.status === 'pending' && order.paymentStatus !== 'paid';
  const hasPackage = order.items.some((i) => i.kind === 'package');

  return (
    <>
      <Link to="/orders" className="muted">← My orders</Link>
      <div className="section-head">
        <div>
          <h1>Order #{order.orderNumber}</h1>
          <p className="muted">
            {formatDate(order.createdAt)} · {order.paymentMethod === 'UPI' ? 'UPI transfer' : 'Online payment'}
          </p>
        </div>
        <div className="inline-form">
          <StatusBadge value={order.paymentStatus} />
          {order.status === 'cancelled' && <StatusBadge value="cancelled" />}
        </div>
      </div>

      {order.paymentStatus === 'paid' && (
        <div className="alert ok-alert">
          Payment received. {hasPackage ? 'Your package is active.' : 'Your designs are ready.'}{' '}
          <Link to="/downloads">Go to My downloads →</Link>
        </div>
      )}

      {open && order.paymentMethod === 'UPI' && <UpiPayment order={order} onUpdate={setOrder} />}
      {open && order.paymentMethod === 'RAZORPAY' && (
        <div className="alert stack">
          <span>Payment for this order is not complete.</span>
          <div className="inline-form">
            <button className="btn" disabled={paying} onClick={payNow}>{paying ? 'Please wait…' : `Pay ${money(order.total)} now`}</button>
            <button className="btn btn-ghost" disabled={paying} onClick={checkStatus}>Money deducted? Check status</button>
          </div>
        </div>
      )}

      <div className="mt"><OrderItems order={order} /></div>

      {open && order.paymentStatus !== 'review' && order.user?._id === user._id && (
        <button className="btn btn-outline danger mt" onClick={cancel}>Cancel order</button>
      )}
    </>
  );
}

