import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, money } from '../api';
import { Loader } from '../components/Guards';

const EMPTY = { name: '', type: 'daily', limit: 20, validityDays: 30, price: '', mrp: '', highlight: '', description: '', sort: 0, isActive: true };

function PackageEditor({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form };
      delete body._id;
      if (initial._id) await api(`/packages/${initial._id}`, { method: 'PUT', body });
      else await api('/packages', { method: 'POST', body });
      toast.success('Package saved');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h3>{initial._id ? `Edit ${initial.name}` : 'New package'}</h3>
      <div className="form-grid three">
        <label className="field"><span>Name *</span><input required value={form.name} onChange={set('name')} placeholder="Gold" /></label>
        <label className="field">
          <span>Type</span>
          <select value={form.type} onChange={set('type')}>
            <option value="daily">Daily limit (resets every day)</option>
            <option value="total">Total limit</option>
          </select>
        </label>
        <label className="field"><span>{form.type === 'daily' ? 'Designs per day *' : 'Total designs *'}</span><input type="number" required min="1" value={form.limit} onChange={set('limit')} /></label>
        <label className="field"><span>Validity (days) *</span><input type="number" required min="1" value={form.validityDays} onChange={set('validityDays')} /></label>
        <label className="field"><span>Price (₹) *</span><input type="number" required min="1" value={form.price} onChange={set('price')} /></label>
        <label className="field"><span>MRP (₹)</span><input type="number" min="0" value={form.mrp} onChange={set('mrp')} /></label>
        <label className="field"><span>Badge</span><input maxLength={30} value={form.highlight} onChange={set('highlight')} placeholder="Best value" /></label>
        <label className="field"><span>Sort order</span><input type="number" value={form.sort} onChange={set('sort')} /></label>
        <label className="check"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Show on website</label>
      </div>
      <label className="field"><span>Short description</span><input value={form.description} onChange={set('description')} /></label>
      <div className="inline-form">
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save package'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Packages() {
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => api('/packages/admin/all').then(setList).catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
  }, []);

  const remove = async (p) => {
    if (!confirm(`Delete package "${p.name}"? Customers who already bought it keep their access.`)) return;
    try {
      await api(`/packages/${p._id}`, { method: 'DELETE' });
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Download packages</h1>
          <p className="muted">Customers buy a package and can then download any paid design within its limit.</p>
        </div>
        {!editing && <button className="btn" onClick={() => setEditing(EMPTY)}>+ New package</button>}
      </div>

      {editing && (
        <PackageEditor
          key={editing._id || 'new'}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {!list ? <Loader /> : list.length === 0 ? <p className="muted mt">No packages yet.</p> : (
        <div className="card table-wrap mt">
          <table className="table">
            <thead><tr><th>Name</th><th>Limit</th><th>Validity</th><th>Price</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id}>
                  <td><strong>{p.name}</strong>{p.highlight && <div className="muted small">{p.highlight}</div>}</td>
                  <td>{p.limit} {p.type === 'daily' ? 'per day' : 'total'}</td>
                  <td>{p.validityDays} days</td>
                  <td>{money(p.price)}</td>
                  <td><span className={`status ${p.isActive ? 'status-active' : 'status-refunded'}`}>{p.isActive ? 'Live' : 'Hidden'}</span></td>
                  <td className="right nowrap">
                    <button className="link-btn" onClick={() => setEditing({ ...EMPTY, ...p, mrp: p.mrp || '' })}>Edit</button>
                    <button className="link-btn danger" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
