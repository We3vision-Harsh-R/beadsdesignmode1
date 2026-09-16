import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, formatDate, money } from '../api';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Guards';

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');

  const load = (query = '') =>
    api(`/admin/users?q=${encodeURIComponent(query)}`).then(setUsers).catch((e) => toast.error(e.message));

  useEffect(() => {
    load();
  }, []);

  const toggleRole = async (u) => {
    const role = u.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Make ${u.name} ${role === 'admin' ? 'an admin' : 'a normal customer'}?`)) return;
    try {
      await api(`/admin/users/${u._id}/role`, { method: 'PATCH', body: { role } });
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, role } : x)));
      toast.success('Role updated');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <h1>Customers</h1>
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); load(q.trim()); }}>
        <input placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-ghost">Search</button>
      </form>

      {!users ? <Loader /> : (
        <div className="card table-wrap mt">
          <table className="table">
            <thead><tr><th>Name</th><th>Contact</th><th>Joined</th><th>Paid orders</th><th>Spent</th><th>Designs</th><th>Package</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}<div className="muted small">{u.phone}</div></td>
                  <td className="small">{formatDate(u.createdAt)}</td>
                  <td>{u.orders}</td>
                  <td>{money(u.spent)}</td>
                  <td>{u.designs}</td>
                  <td className="small">{u.packages.length ? u.packages.map((p) => `${p.name} (till ${new Date(p.expiresAt).toLocaleDateString('en-IN')})`).join(', ') : '—'}</td>
                  <td><span className={`status ${u.role === 'admin' ? 'status-confirmed' : ''}`}>{u.role}</span></td>
                  <td className="right">
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
