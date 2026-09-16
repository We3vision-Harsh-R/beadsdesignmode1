import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { Loader } from '../components/Guards';

export default function Categories() {
  const [list, setList] = useState(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => api('/categories').then(setList).catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api('/categories', { method: 'POST', body: { name } });
      setName('');
      toast.success('Category added');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      await api(`/categories/${editing._id}`, { method: 'PUT', body: { name: editing.name } });
      setEditing(null);
      toast.success('Saved');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api(`/categories/${c._id}`, { method: 'DELETE' });
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <h1>Categories</h1>
      <form className="card pad inline-form" onSubmit={add}>
        <input required placeholder="New category name, e.g. Kids wear" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn">Add</button>
      </form>

      {!list ? <Loader /> : list.length === 0 ? <p className="muted mt">No categories yet.</p> : (
        <div className="card table-wrap mt">
          <table className="table">
            <thead><tr><th>Name</th><th>Live designs</th><th>Slug</th><th></th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id}>
                  <td>
                    {editing?._id === c._id ? (
                      <form onSubmit={save} className="inline-form">
                        <input autoFocus required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                        <button className="btn">Save</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                      </form>
                    ) : (
                      <strong>{c.name}</strong>
                    )}
                  </td>
                  <td>{c.count}</td>
                  <td className="muted">{c.slug}</td>
                  <td className="right nowrap">
                    <button className="link-btn" onClick={() => setEditing({ ...c })}>Rename</button>
                    <button className="link-btn danger" onClick={() => remove(c)}>Delete</button>
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
