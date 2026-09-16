import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, FORMATS, MACHINE_LABELS, STITCH_RANGES } from '../api';
import DesignCard from '../components/DesignCard';
import Pagination from '../components/Pagination';
import { Loader } from '../components/Guards';

const FILTER_KEYS = ['q', 'category', 'machine', 'stitches', 'colors', 'price', 'format'];

export default function Designs({ free = false }) {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(params.get('q') || '');

  const qs = params.toString();
  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setSearch(new URLSearchParams(qs).get('q') || '');
  }, [qs]);

  useEffect(() => {
    setData(null);
    setError('');
    const p = new URLSearchParams(qs);
    if (free) p.set('price', 'free');
    p.set('limit', '24');
    api(`/designs?${p}`).then(setData).catch((e) => setError(e.message));
  }, [qs, free]);

  const get = (key) => params.get(key) || '';
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
    if (key === 'page') window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k)).length;
  const categoryName = categories.find((c) => c.slug === get('category'))?.name;

  const select = (key, label, options) => (
    <label className="field">
      <span>{label}</span>
      <select value={get(key)} onChange={(e) => update(key, e.target.value)}>
        <option value="">All</option>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <div className="section-head">
        <div>
          <h1>{free ? 'Free embroidery designs' : categoryName ? `${categoryName} embroidery designs` : 'Embroidery designs'}</h1>
          {get('q') && <p className="muted">Results for “{get('q')}”</p>}
        </div>
        {data && <span className="muted">{data.total} designs</span>}
      </div>

      <div className="catalog">
        <details className="card filters" open={typeof window !== 'undefined' && window.innerWidth > 900}>
          <summary>
            Filters {activeFilters > 0 && <span className="badge">{activeFilters}</span>}
          </summary>
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              update('q', search.trim());
            }}
          >
            <span>Design ID or name</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. 1001" />
          </form>
          {select('category', 'Category', categories.map((c) => [c.slug, `${c.name} (${c.count})`]))}
          {select('machine', 'Machine', Object.entries(MACHINE_LABELS))}
          {select('stitches', 'Stitches', STITCH_RANGES)}
          {select('colors', 'Colours (up to)', [1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => [String(n), `${n} colour${n > 1 ? 's' : ''}`]))}
          {select('format', 'File format', FORMATS.map((f) => [f, `.${f}`]))}
          {!free && select('price', 'Price', [['free', 'Free'], ['paid', 'Paid']])}
          {activeFilters > 0 && (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setParams({})}>
              Clear filters
            </button>
          )}
        </details>

        <div>
          <div className="toolbar">
            <span className="muted small">{free ? 'Log in to download free designs.' : 'Tip: search by design ID for exact results.'}</span>
            <select value={get('sort') || 'newest'} onChange={(e) => update('sort', e.target.value)} aria-label="Sort">
              <option value="newest">Newest first</option>
              <option value="popular">Most downloaded</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>

          {error ? (
            <p className="error">{error}</p>
          ) : !data ? (
            <Loader />
          ) : data.items.length === 0 ? (
            <div className="empty card">
              <p>No designs match these filters.</p>
              {activeFilters > 0 && <button className="btn btn-ghost" onClick={() => setParams({})}>Clear filters</button>}
            </div>
          ) : (
            <>
              <div className="grid">{data.items.map((d) => <DesignCard key={d._id} design={d} />)}</div>
              <Pagination page={data.page} pages={data.pages} onChange={(p) => update('page', String(p))} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
