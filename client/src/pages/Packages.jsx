import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatDate, money } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Guards';

export function PackageCard({ pkg, onBuy }) {
  const perDesign = pkg.price / (pkg.type === 'daily' ? pkg.limit * pkg.validityDays : pkg.limit);
  return (
    <div className={`card package ${pkg.highlight ? 'featured' : ''}`}>
      {pkg.highlight && <span className="ribbon">{pkg.highlight}</span>}
      <div className="package-limit">
        {pkg.type === 'daily' ? `${pkg.limit} designs / day` : `${pkg.limit} designs total`}
      </div>
      <h3>{pkg.name}</h3>
      <div className="price-row big">
        <span className="price">{money(pkg.price)}</span>
        {pkg.mrp > pkg.price && <s className="muted">{money(pkg.mrp)}</s>}
      </div>
      <ul className="ticks">
        <li>{pkg.type === 'daily' ? `Download up to ${pkg.limit} designs every day` : `Download any ${pkg.limit} designs`}</li>
        <li>Valid for {pkg.validityDays} days</li>
        <li>All file formats of each design</li>
        <li>Works on paid designs, re-download anytime</li>
        <li className="muted">≈ {money(Math.round(perDesign * 100) / 100)} per design{pkg.type === 'daily' ? ' at full use' : ''}</li>
      </ul>
      {pkg.description && <p className="muted small">{pkg.description}</p>}
      <button className="btn btn-block btn-lg" onClick={() => onBuy(pkg)}>Buy now</button>
    </div>
  );
}

export default function Packages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [packages, setPackages] = useState(null);
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    api('/packages').then(setPackages).catch(() => setPackages([]));
  }, []);
  useEffect(() => {
    if (user) api('/me/subscriptions').then(setSubs).catch(() => {});
  }, [user]);

  const buy = (pkg) => {
    const target = `/checkout?package=${pkg._id}`;
    navigate(user ? target : `/login?next=${encodeURIComponent(target)}`);
  };

  if (!packages) return <Loader />;
  const active = subs.filter((s) => s.status === 'active');
  const daily = packages.filter((p) => p.type === 'daily');
  const total = packages.filter((p) => p.type === 'total');

  return (
    <>
      <div className="center">
        <h1>Download packages</h1>
        <p className="muted">Buy once and download many designs at a lower price. Instant activation after payment.</p>
      </div>

      {active.length > 0 && (
        <div className="alert ok-alert mt">
          You have an active package: <strong>{active[0].name}</strong>, {active[0].remaining} downloads left
          {active[0].type === 'daily' ? ' today' : ''}, valid till {formatDate(active[0].expiresAt)}.{' '}
          <Link to="/downloads">My downloads →</Link>
        </div>
      )}

      {packages.length === 0 && <p className="muted center mt">No packages available right now.</p>}

      {daily.length > 0 && (
        <section className="section">
          <h2>Daily limit packages</h2>
          <p className="muted">Your quota refreshes every day at midnight. Best for regular job work.</p>
          <div className="package-grid">{daily.map((p) => <PackageCard key={p._id} pkg={p} onBuy={buy} />)}</div>
        </section>
      )}
      {total.length > 0 && (
        <section className="section">
          <h2>Total limit packages</h2>
          <p className="muted">A fixed number of designs to use any time within the validity. Best for short projects.</p>
          <div className="package-grid">{total.map((p) => <PackageCard key={p._id} pkg={p} onBuy={buy} />)}</div>
        </section>
      )}
    </>
  );
}
