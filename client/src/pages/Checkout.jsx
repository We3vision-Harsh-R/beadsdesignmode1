import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, cleanMobile, loadScript, money, STORE_NAME } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { DesignImage } from '../components/DesignCard';
import { Loader } from '../components/Guards';

export async function payWithRazorpay({ order, razorpay, user }) {
  const ok = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
  if (!ok) throw new Error('Could not load the payment page. Check your internet connection.');
  return new Promise((resolve) => {
    const checkout = new window.Razorpay({
      key: razorpay.keyId,
      amount: razorpay.amount,
      currency: razorpay.currency,
      order_id: razorpay.orderId,
      name: STORE_NAME,
      description: `Order ${order.orderNumber}`,
      prefill: { name: user.name, email: user.email, contact: order.phone || user.phone || '' },
      theme: { color: '#7a2e4d' },
      handler: async (response) => {
        try {
          await api(`/orders/${order._id}/verify-payment`, { method: 'POST', body: response });
          toast.success('Payment successful!');
          resolve(true);
        } catch (e) {
          toast.error(e.message);
          resolve(false);
        }
      },
      modal: { ondismiss: () => resolve(false) },
    });
    checkout.open();
  });
}

export default function Checkout() {
  const { user } = useAuth();
  const { items, total, clear } = useCart();
  const config = useConfig();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const packageId = params.get('package');
  const [pkg, setPkg] = useState(null);
  const [method, setMethod] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobile, setMobile] = useState(user.phone || '');

  useEffect(() => {
    if (packageId) {
      api('/packages')
        .then((list) => setPkg(list.find((p) => p._id === packageId) || false))
        .catch(() => setPkg(false));
    }
  }, [packageId]);

  useEffect(() => {
    if (!method) setMethod(config.razorpayEnabled ? 'RAZORPAY' : config.upiId ? 'UPI' : '');
  }, [config, method]);

  if (packageId && pkg === null) return <Loader />;
  if (packageId && pkg === false) {
    return (
      <div className="empty">
        <p>This package is not available.</p>
        <Link to="/packages" className="btn">See packages</Link>
      </div>
    );
  }
  if (!packageId && items.length === 0) {
    return (
      <div className="empty">
        <p>Your cart is empty.</p>
        <Link to="/designs" className="btn">Browse designs</Link>
      </div>
    );
  }

  const amount = packageId ? pkg.price : total;
  const noPayment = !config.razorpayEnabled && !config.upiId;

  const placeOrder = async () => {
    const phone = cleanMobile(mobile);
    if (!phone) return toast.error('Enter a valid 10 digit mobile number');
    setBusy(true);
    try {
      const body = packageId
        ? { packageId, paymentMethod: method, phone }
        : { designIds: items.map((i) => i._id), paymentMethod: method, phone };
      const { order, razorpay } = await api('/orders', { method: 'POST', body });
      if (!packageId) clear();
      if (razorpay) {
        const paid = await payWithRazorpay({ order, razorpay, user });
        if (!paid) toast('Payment not completed. You can retry from the order page.', { icon: 'ℹ️' });
        navigate(paid && !packageId ? '/downloads' : `/orders/${order._id}`, { replace: true });
      } else {
        navigate(`/orders/${order._id}`, { replace: true });
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Checkout</h1>
      <div className="two-col">
        <div className="stack">
          <div className="card list">
            {packageId ? (
              <div className="line-item">
                <div className="line-body">
                  <div className="line-name">{pkg.name} package</div>
                  <div className="muted small">
                    {pkg.type === 'daily' ? `${pkg.limit} designs per day` : `${pkg.limit} designs total`} · valid {pkg.validityDays} days
                  </div>
                </div>
                <strong>{money(pkg.price)}</strong>
              </div>
            ) : (
              items.map((i) => (
                <div key={i._id} className="line-item">
                  <DesignImage src={i.image} alt={i.name} className="line-img" />
                  <div className="line-body">
                    <div className="line-name">{i.name}</div>
                    <div className="muted small">SKU {i.sku || i.code}</div>
                  </div>
                  <strong>{money(i.price)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="card form">
            <h3>Your mobile number</h3>
            <label className="field">
              <span>Mobile number *</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                title="10 digit mobile number"
                autoComplete="tel-national"
                placeholder="10 digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </label>
            <p className="muted small">We use this to contact you about your order and support.</p>
          </div>

          <div className="card form">
            <h3>Payment method</h3>
            {noPayment && <p className="alert">Online payment is not set up yet. Please contact us to order.</p>}
            {config.razorpayEnabled && (
              <label className={`radio-card ${method === 'RAZORPAY' ? 'active' : ''}`}>
                <input type="radio" name="pm" checked={method === 'RAZORPAY'} onChange={() => setMethod('RAZORPAY')} />
                <div><strong>Pay online (instant)</strong><div className="muted small">UPI, cards, net banking, wallets. Files unlock right away.</div></div>
              </label>
            )}
            {config.upiId && (
              <label className={`radio-card ${method === 'UPI' ? 'active' : ''}`}>
                <input type="radio" name="pm" checked={method === 'UPI'} onChange={() => setMethod('UPI')} />
                <div><strong>UPI transfer (manual)</strong><div className="muted small">Pay with Google Pay, PhonePe or Paytm and send us the transaction number. We unlock your order after checking the payment.</div></div>
              </label>
            )}
          </div>
        </div>

        <aside className="card summary">
          <h3>Order summary</h3>
          <div className="sum-row"><span>Account</span><span className="small">{user.email}</span></div>
          <div className="sum-row total"><span>Total</span><span>{money(amount)}</span></div>
          <button className="btn btn-block btn-lg" disabled={busy || !method || !cleanMobile(mobile)} onClick={placeOrder}>
            {busy ? 'Please wait…' : method === 'UPI' ? 'Place order & pay by UPI' : `Pay ${money(amount)}`}
          </button>
          <p className="muted small mt">
            Digital product: no shipping. By paying you agree to our <Link to="/policies#terms">terms</Link> and{' '}
            <Link to="/policies#refund">refund policy</Link>.
          </p>
        </aside>
      </div>
    </>
  );
}
