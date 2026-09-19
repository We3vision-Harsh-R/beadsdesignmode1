import { Link, useNavigate } from 'react-router-dom';
import { money } from '../api';
import { useCart } from '../context/CartContext';
import { DesignImage, Formats } from '../components/DesignCard';

export default function Cart() {
  const { items, remove, total } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="empty">
        <h1>Your cart is empty</h1>
        <Link to="/designs" className="btn">Browse designs</Link>
      </div>
    );
  }

  return (
    <>
      <h1>Cart</h1>
      <div className="two-col">
        <div className="card list">
          {items.map((i) => (
            <div key={i._id} className="line-item">
              <Link to={`/design/${i.code}`}><DesignImage src={i.image} alt={i.name} className="line-img" /></Link>
              <div className="line-body">
                <Link to={`/design/${i.code}`} className="line-name">{i.name}</Link>
                <div className="card-meta">
                  <span className="id-chip">{i.sku || i.code}</span>
                  <Formats formats={i.formats} />
                </div>
                <button className="link-btn danger" onClick={() => remove(i._id)}>Remove</button>
              </div>
              <strong>{money(i.price)}</strong>
            </div>
          ))}
        </div>
        <aside className="card summary">
          <h3>Order summary</h3>
          <div className="sum-row"><span>{items.length} design(s)</span><span>{money(total)}</span></div>
          <div className="sum-row total"><span>Total</span><span>{money(total)}</span></div>
          <button className="btn btn-block btn-lg" onClick={() => navigate('/checkout')}>Checkout</button>
          <p className="muted small mt">
            Buying many designs? A <Link to="/packages">download package</Link> may cost less.
          </p>
        </aside>
      </div>
    </>
  );
}
