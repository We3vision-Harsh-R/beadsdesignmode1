import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, MACHINE_LABELS, money, num } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import DesignCard, { DesignImage, discount, Formats } from '../components/DesignCard';
import DownloadButtons from '../components/DownloadButtons';
import ImageZoom from '../components/ImageZoom';
import Lightbox from '../components/Lightbox';
import { Loader } from '../components/Guards';

const VIA_TEXT = {
  admin: 'You are an admin, so you can download every design.',
  free: 'This design is free.',
  purchase: 'You bought this design.',
  package: 'Unlocked with your download package.',
};

function AccessBox({ design, access, reload }) {
  const { user } = useAuth();
  const { add, has } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const loginLink = `/login?next=${encodeURIComponent(location.pathname)}`;

  if (!access) return <Loader />;

  if (access.allowed) {
    const willUsePackage = access.via === 'package' && !access.unlocked;
    return (
      <div className="access-box ok-box">
        <strong>✓ Ready to download</strong>
        <p className="small">
          {willUsePackage
            ? `Your first download of this design uses 1 design from "${access.subscription.name}" (${access.subscription.remaining} left${access.subscription.type === 'daily' ? ' today' : ''}). Other formats and re-downloads are free.`
            : VIA_TEXT[access.via]}
        </p>
        <DownloadButtons design={design} onDownloaded={reload} />
      </div>
    );
  }

  if (design.isFree) {
    return (
      <div className="access-box">
        <strong>Free design</strong>
        <p className="small">Log in or create a free account to download.</p>
        <Link to={loginLink} className="btn btn-lg btn-block">Login to download</Link>
      </div>
    );
  }

  const inCart = has(design._id);
  return (
    <div className="access-box">
      <div className="actions">
        <button
          className="btn btn-lg btn-outline"
          disabled={inCart}
          onClick={() => {
            add(design);
            toast.success('Added to cart');
          }}
        >
          {inCart ? '✓ In cart' : 'Add to cart'}
        </button>
        <button
          className="btn btn-lg"
          onClick={() => {
            add(design);
            navigate(user ? '/checkout' : `/login?next=/checkout`);
          }}
        >
          Buy now
        </button>
      </div>
      <p className="small muted">
        Have many designs to download? <Link to="/packages">Buy a download package</Link> and save.
      </p>
    </div>
  );
}

export default function DesignPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const config = useConfig();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [access, setAccess] = useState(null);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    setData(null);
    setError('');
    setActive(0);
    api(`/designs/${code}`).then(setData).catch((e) => setError(e.message));
  }, [code]);

  const designId = data?.design._id;
  const loadAccess = useCallback(() => {
    if (designId) api(`/designs/${designId}/access`).then(setAccess).catch(() => setAccess({ allowed: false }));
  }, [designId]);

  useEffect(() => {
    setAccess(null);
    loadAccess();
  }, [loadAccess, user]);

  if (error) {
    return (
      <div className="empty">
        <p>{error}</p>
        <Link to="/designs" className="btn">Browse designs</Link>
      </div>
    );
  }
  if (!data) return <Loader />;

  const { design, related } = data;
  const off = discount(design);

  return (
    <>
      <nav className="crumbs small">
        <Link to="/">Home</Link> / <Link to="/designs">Designs</Link>
        {design.category && (
          <> / <Link to={`/designs?category=${design.category.slug}`}>{design.category.name}</Link></>
        )}
      </nav>

      <div className="product-page">
        <div className="gallery">
          <ImageZoom
            src={design.images[active]}
            alt={design.name}
            className="gallery-main"
            onClick={() => design.images[active] && setLightboxOpen(true)}
          />
          {design.images.length > 1 && (
            <div className="thumbs">
              {design.images.map((img, i) => (
                <button key={img} className={`thumb ${i === active ? 'active' : ''}`} onClick={() => setActive(i)} aria-label={`Image ${i + 1}`}>
                  <DesignImage src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          <span className="id-chip big">SKU: {design.sku}</span>
          <h1>{design.name}</h1>
          <div className="price-row big">
            {design.isFree ? (
              <span className="price free">Free</span>
            ) : (
              <>
                <span className="price">{money(design.price)}</span>
                {off > 0 && (
                  <>
                    <s className="muted">{money(design.mrp)}</s>
                    <span className="tag tag-sale static">{off}% off</span>
                  </>
                )}
              </>
            )}
          </div>

          <dl className="specs">
            <div><dt>File types</dt><dd><Formats formats={design.formats} /></dd></div>
            <div><dt>Category</dt><dd>{design.category?.name || '—'}</dd></div>
            <div><dt>Machine</dt><dd>{MACHINE_LABELS[design.machineType]}</dd></div>
            {design.stitches > 0 && <div><dt>Total stitches</dt><dd>{num(design.stitches)}</dd></div>}
            {design.colors > 0 && <div><dt>Colours</dt><dd>{design.colors}</dd></div>}
          </dl>

          <AccessBox design={design} access={access} reload={loadAccess} />

          <ul className="notes small muted">
            <li>Digital product. Files are available to download right after payment.</li>
            <li>Check the stitch count, size and file type against your machine before buying.</li>
            {config.whatsapp && (
              <li>
                Need changes to this design?{' '}
                <a href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(`Hi, I need customisation for design ${design.sku}`)}`} target="_blank" rel="noreferrer">
                  Ask on WhatsApp
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      {lightboxOpen && design.images.length > 0 && (
        <Lightbox images={design.images} index={active} onClose={() => setLightboxOpen(false)} onChange={setActive} />
      )}

      {design.parts.length > 0 && (
        <section className="section">
          <h2>Design details</h2>
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Stitches</th><th>Area</th><th>Height</th><th>Width</th><th>Colours</th></tr>
              </thead>
              <tbody>
                {design.parts.map((p, i) => (
                  <tr key={i}>
                    <td>{p.name || `Part ${i + 1}`}</td>
                    <td>{num(p.stitches)}</td>
                    <td>{p.area ? `${p.area} mm` : '—'}</td>
                    <td>{p.height ? `${p.height} mm` : '—'}</td>
                    <td>{p.width ? `${p.width} mm` : '—'}</td>
                    <td>{p.colors || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {design.description && (
        <section className="section">
          <h2>About this design</h2>
          <p className="description-text">{design.description}</p>
        </section>
      )}

      {related.length > 0 && (
        <section className="section">
          <h2>Related designs</h2>
          <div className="grid">{related.map((d) => <DesignCard key={d._id} design={d} />)}</div>
        </section>
      )}
    </>
  );
}
