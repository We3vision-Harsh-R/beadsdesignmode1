import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, downloadCsv, formatDate, money } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Guards';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [exporting, setExporting] = useState('');

  const load = (query = '') =>
    api(`/admin/users?q=${encodeURIComponent(query)}`).then(setUsers).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
  }, []);

  const exportCsv = async (kind) => {
    setExporting(kind);
    try {
      await downloadCsv(`/admin/export/${kind}.csv`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting('');
    }
  };

  const toggleRole = async (u) => {
    const role = u.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Make ${u.name || u.email} ${role === 'admin' ? 'an admin' : 'a normal customer'}?`)) return;
    try {
      await api(`/admin/users/${u._id}/role`, { method: 'PATCH', body: { role } });
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, role } : x)));
      toast.success('Role updated');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const customers = users?.filter((u) => u.role !== 'admin').length ?? 0;

  return (
    <>
      <div className="section-head">
        <div>
          <h1>
            Customers{' '}
            {users && (
              <span className="muted small">
                ({customers} customers{users.length !== customers ? `, ${users.length - customers} admin` : ''})
              </span>
            )}
          </h1>
          <p className="muted small">Click a customer to see everything they bought.</p>
        </div>
        <div className="inline-form">
          <button className="btn btn-ghost" disabled={Boolean(exporting)} onClick={() => exportCsv('customers')}>
            {exporting === 'customers' ? 'Preparing…' : '⬇ Export customers (CSV)'}
          </button>
          <button className="btn btn-ghost" disabled={Boolean(exporting)} onClick={() => exportCsv('purchases')}>
            {exporting === 'purchases' ? 'Preparing…' : '⬇ Export purchases (CSV)'}
          </button>
        </div>
      </div>

      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); load(q.trim()); }}>
        <input placeholder="Search name, email or mobile number" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-ghost">Search</button>
      </form>

      {!users ? <Loader /> : users.length === 0 ? <p className="muted mt">No customers found.</p> : (
        <div className="card table-wrap mt">
          <table className="table">
            <thead>
              <tr><th>Customer</th><th>Mobile</th><th>Email</th><th>Joined</th><th>Paid orders</th><th>Spent</th><th>Designs</th><th>Package</th><th>Role</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><Link to={`/admin/users/${u._id}`}><strong>{u.name || 'No name'}</strong></Link></td>
                  <td className="mono">{u.phone || <span className="muted">—</span>}</td>
                  <td className="small">{u.email}</td>
                  <td className="small">{formatDate(u.createdAt)}</td>
                  <td>{u.orders}</td>
                  <td>{money(u.spent)}</td>
                  <td>{u.designs}</td>
                  <td className="small">{u.packages.length ? u.packages.map((p) => `${p.name} (till ${new Date(p.expiresAt).toLocaleDateString('en-IN')})`).join(', ') : '—'}</td>
                  <td><span className={`status ${u.role === 'admin' ? 'status-confirmed' : ''}`}>{u.role}</span></td>
                  <td className="right nowrap">
                    <Link to={`/admin/users/${u._id}`} className="link-btn">View</Link>
                    {u._id !== me._id && (
                      <button className="link-btn" onClick={() => toggleRole(u)}>
                        {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      </button>
                    )}
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
