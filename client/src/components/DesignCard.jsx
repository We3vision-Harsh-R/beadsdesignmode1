import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { imgUrl, money, num } from '../api';
import { useCart } from '../context/CartContext';

export function DesignImage({ src, alt, className = '' }) {
  return src ? (
    <img src={imgUrl(src)} alt={alt} className={`pimg ${className}`} loading="lazy" />
  ) : (
    <div className={`pimg pimg-empty ${className}`} role="img" aria-label={alt}>
      <span>✿</span>
    </div>
  );
}

export function discount(d) {
  return !d.isFree && d.mrp > d.price ? Math.round(((d.mrp - d.price) / d.mrp) * 100) : 0;
}

export function Formats({ formats }) {
  if (!formats?.length) return null;
  return (
    <span className="formats">
      {formats.map((f) => <span key={f} className="fmt">{f}</span>)}
    </span>
  );
}

export default function DesignCard({ design }) {
  const { add, has } = useCart();
  const off = discount(design);
  const inCart = has(design._id);
  const link = `/design/${design.code}`;

  return (
    <article className="card design-card">
      <Link to={link} className="design-card-img">
        <DesignImage src={design.images?.[0]} alt={design.name} />
        {design.isFree && <span className="tag tag-free">FREE</span>}
        {off > 0 && <span className="tag tag-sale">{off}% off</span>}
      </Link>
      <div className="design-card-body">
        <div className="card-meta">
          <span className="id-chip">{design.sku}</span>
          <Formats formats={design.formats} />
        </div>
        <Link to={link} className="design-card-name">{design.name}</Link>
        <div className="muted small">
          {design.category?.name}
          {design.stitches > 0 && ` · ${num(design.stitches)} st`}
        </div>
        <div className="price-row">
          {design.isFree ? (
            <span className="price free">Free</span>
          ) : (
            <>
              <span className="price">{money(design.price)}</span>
              {off > 0 && <s className="muted small">{money(design.mrp)}</s>}
            </>
          )}
        </div>
        {design.isFree ? (
          <Link to={link} className="btn btn-block btn-outline">Download</Link>
        ) : (
          <button
            className={`btn btn-block ${inCart ? 'btn-ghost' : ''}`}
            onClick={() => {
              if (inCart) return;
              add(design);
              toast.success(`${design.sku} added to cart`);
            }}
          >
            {inCart ? '✓ In cart' : 'Add to cart'}
          </button>
        )}
      </div>
    </article>
  );
}
