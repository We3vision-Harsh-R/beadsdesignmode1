import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { safeNext } from './Login';

export default function Register() {
  const { user, register } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');

  if (user) return <Navigate to={safeNext(params)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { needsConfirmation } = await register(form);
      if (needsConfirmation) {
        setSentTo(form.email.trim());
      } else {
        toast.success('Account created');
        navigate(safeNext(params), { replace: true });
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <div className="auth">
        <div className="card form center">
          <h1>Check your email</h1>
          <p>We sent a confirmation link to <strong>{sentTo}</strong>. Open it to activate your account, then log in.</p>
          <p className="muted small">Can't find it? Check the spam folder.</p>
          <Link to="/login" className="btn btn-block">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <form className="card form" onSubmit={submit}>
        <h1>Create account</h1>
        <label className="field"><span>Full name</span><input required maxLength={80} autoComplete="name" value={form.name} onChange={set('name')} /></label>
        <label className="field"><span>Email</span><input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label className="field"><span>Password (min 8 characters)</span><input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} /></label>
        <button className="btn btn-block btn-lg" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted center">
          Already have an account? <Link to={`/login?next=${encodeURIComponent(safeNext(params))}`}>Login</Link>
        </p>
      </form>
    </div>
  );
}
