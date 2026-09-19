import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, money, num } from '../api';
import { DesignImage, Formats } from '../components/DesignCard';
import Pagination from '../components/Pagination';
import { Loader } from '../components/Guards';

export default function Designs() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(params.get('q') || '');
  const [reload, setReload] = useState(0);

  const qs = params.toString();
  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
  }, []);
  useEffect(() => {
    const p = new URLSearchParams(qs);
    p.set('limit', '25');
    api(`/designs/admin/all?${p}`).then(setData).catch((e) => toast.error(e.message));
  }, [qs, reload]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const toggle = async (d, key) => {
    try {
      await api(`/designs/${d._id}`, { method: 'PUT', body: { [key]: !d[key] } });
      setData((cur) => ({ ...cur, items: cur.items.map((x) => (x._id === d._id ? { ...x, [key]: !d[key] } : x)) }));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async (d) => {
    if (!confirm(`Delete design ${d.sku} "${d.name}" and its files?\nCustomers who bought it will lose access. Tip: switch it off (hide) instead.`)) return;
    try {
      await api(`/designs/${d._id}`, { method: 'DELETE' });
      toast.success('Design deleted');
      setReload((r) => r + 1);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <div className="section-head">
        <h1>Designs {data && <span className="muted small">({data.total})</span>}</h1>
        <Link to="/admin/designs/new" className="btn">+ Upload design</Link>
      </div>

      <div className="toolbar">
        <form onSubmit={(e) => { e.preventDefault(); update('q', search.trim()); }} className="inline-form grow">
          <input placeholder="Search SKU, name or tag" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-ghost">Search</button>
        </form>
        <div className="inline-form">
          <select value={params.get('category') || ''} onChange={(e) => update('category', e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c._id} value={c.slug}>{c.name}</option>)}
          </select>
          <select value={params.get('status') || ''} onChange={(e) => update('status', e.target.value)} aria-label="Status">
            <option value="">Live + hidden</option>
            <option value="live">Live</option>
            <option value="hidden">Hidden</option>
          </select>
          <select value={params.get('price') || ''} onChange={(e) => update('price', e.target.value)} aria-label="Price">
            <option value="">Free + paid</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {!data ? <Loader /> : data.items.length === 0 ? (
        <div className="empty card pad">
          <p>No designs found.</p>
          <Link to="/admin/designs/new" className="btn">Upload your first design</Link>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr><th></th><th>Design</th><th>Files</th><th>Stitches</th><th>Price</th><th>Downloads</th><th>Live</th><th>Featured</th><th></th></tr>
            </thead>
            <tbody>
              {data.items.map((d) => (
                <tr key={d._id}>
                  <td><DesignImage src={d.images?.[0]} alt="" className="table-img" /></td>
                  <td>
                    <Link to={`/admin/designs/${d._id}`}><strong>{d.name}</strong></Link>
                    <div className="muted small">{d.sku} · {d.category?.name || 'No category'}</div>
                  </td>
                  <td>{d.hasDrive || d.files.length ? (
                      <>{d.hasDrive && <span className="fmt">Drive</span>} <Formats formats={d.formats} /></>
                    ) : (
                      <span className="error small">No link</span>
                    )}</td>
                  <td>{num(d.stitches)}</td>
                  <td>{d.isFree ? <span className="ok">Free</span> : money(d.price)}</td>
                  <td>{num(d.downloads)}</td>
                  <td><label className="switch"><input type="checkbox" checked={d.isActive} onChange={() => toggle(d, 'isActive')} aria-label="Live" /><span /></label></td>
                  <td><label className="switch"><input type="checkbox" checked={d.featured} onChange={() => toggle(d, 'featured')} aria-label="Featured" /><span /></label></td>
                  <td className="right nowrap">
                    {d.isActive && <a href={`/design/${d.code}`} target="_blank" rel="noreferrer" className="link-btn">View</a>}
                    <Link to={`/admin/designs/${d._id}`} className="link-btn">Edit</Link>
                    <button className="link-btn danger" onClick={() => remove(d)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={(p) => update('page', String(p))} />}
    </>
  );
}
