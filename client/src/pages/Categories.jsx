import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Loader } from '../components/Guards';

export default function Categories() {
  const [list, setList] = useState(null);

  useEffect(() => {
    api('/categories').then(setList).catch(() => setList([]));
  }, []);

  if (!list) return <Loader />;

  return (
    <>
      <h1>Embroidery design categories</h1>
      <p className="muted">Pick a category to see all its designs.</p>
      <div className="cat-grid mt">
        {list.map((c) => (
          <Link key={c._id} to={`/designs?category=${c.slug}`} className="card cat-tile">
            <strong>{c.name}</strong>
            <span className="muted small">{c.count} designs</span>
          </Link>
        ))}
      </div>
    </>
  );
}
