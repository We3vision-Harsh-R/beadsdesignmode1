import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, STORE_NAME } from '../api';
import DesignCard from '../components/DesignCard';
import { Loader } from '../components/Guards';
import { useConfig } from '../context/ConfigContext';

function DesignRow({ title, subtitle, link, items }) {
  if (items && items.length === 0) return null;
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        <Link to={link}>View all →</Link>
      </div>
      {items === null ? <Loader /> : <div className="grid">{items.map((d) => <DesignCard key={d._id} design={d} />)}</div>}
    </section>
  );
}

export default function Home() {
  const config = useConfig();
  const [latest, setLatest] = useState(null);
  const [free, setFree] = useState(null);
  const [popular, setPopular] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api('/designs?limit=8').then((d) => setLatest(d.items)).catch(() => setLatest([]));
    api('/designs?price=free&limit=4').then((d) => setFree(d.items)).catch(() => setFree([]));
    api('/designs?sort=popular&limit=4').then((d) => setPopular(d.items)).catch(() => setPopular([]));
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  const topCategories = [...categories].sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <>
      <section className="hero">
        <div>
          <h1>Computer embroidery designs, ready for your machine.</h1>
          <p className="muted">
            Saree, blouse, lehenga, dress, neck and garment designs from {STORE_NAME}. Pay once, download instantly.
          </p>
          <div className="hero-links">
            <Link to="/designs" className="btn btn-lg">Browse designs</Link>
            <Link to="/free-designs" className="btn btn-lg btn-outline">Free designs</Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" className="hoop" />
            <circle cx="100" cy="100" r="80" className="hoop-inner" />
            {Array.from({ length: 12 }).map((_, i) => (
              <ellipse key={i} cx="100" cy="58" rx="12" ry="30" className="petal" transform={`rotate(${i * 30} 100 100)`} />
            ))}
            <circle cx="100" cy="100" r="14" className="core" />
          </svg>
        </div>
      </section>

      {topCategories.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Top categories</h2>
            <Link to="/categories">All categories →</Link>
          </div>
          <div className="cat-grid">
            {topCategories.map((c) => (
              <Link key={c._id} to={`/designs?category=${c.slug}`} className="card cat-tile">
                <strong>{c.name}</strong>
                <span className="muted small">{c.count} designs</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <DesignRow title="Latest designs" subtitle="New designs added regularly" link="/designs" items={latest} />
      <DesignRow title="Free designs" subtitle="Test our quality before you buy" link="/free-designs" items={free} />
      <DesignRow title="Most downloaded" link="/designs?sort=popular" items={popular} />

      <section className="section cta card">
        <div>
          <h2>Need many designs?</h2>
          <p className="muted">Download packages give you a daily or total quota of designs at a much lower price per design.</p>
        </div>
        <Link to="/packages" className="btn btn-lg">View packages</Link>
      </section>

      {latest?.length === 0 && <p className="muted center">No designs yet. Check back soon!</p>}

      <section className="features section">
        <div><strong>Instant download</strong><span className="muted small">Files ready right after payment</span></div>
        <div><strong>Machine ready</strong><span className="muted small">Stitch count, size and colours listed</span></div>
        <div><strong>Download packages</strong><span className="muted small">Save more when you need many designs</span></div>
        <div><strong>{config.razorpayEnabled ? 'UPI, cards, net banking' : 'Easy UPI payment'}</strong><span className="muted small">Secure checkout</span></div>
      </section>
    </>
  );
}
