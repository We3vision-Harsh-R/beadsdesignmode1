import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, setUser, updatePassword } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy('profile');
    try {
      const d = await api('/auth/me', { method: 'PUT', body: form });
      setUser(d.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setBusy('password');
    try {
      await updatePassword(password);
      setPassword('');
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="auth stack">
      <form className="card form" onSubmit={saveProfile}>
        <h1>My account</h1>
        <p className="muted">{user.email}</p>
        <label className="field"><span>Name</span><input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="field"><span>Mobile</span><input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <button className="btn btn-block" disabled={Boolean(busy)}>{busy === 'profile' ? 'Saving…' : 'Save changes'}</button>
      </form>
      <form className="card form" onSubmit={savePassword}>
        <h3>Change password</h3>
        <label className="field"><span>New password (min 8 characters)</span><input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn btn-block btn-ghost" disabled={Boolean(busy)}>{busy === 'password' ? 'Saving…' : 'Change password'}</button>
      </form>
    </div>
  );
}
