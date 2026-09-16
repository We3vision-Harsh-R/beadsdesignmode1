import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export function safeNext(params) {
  const next = params.get('next') || '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function Login() {
  const { user, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={safeNext(params)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.name || 'friend'}`);
      navigate(safeNext(params), { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="card form" onSubmit={submit}>
        <h1>Login</h1>
        {params.get('confirmed') && <p className="alert ok-alert">Email confirmed. You can log in now.</p>}
        <label className="field">
          <span>Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <Link to="/forgot-password" className="small">Forgot password?</Link>
        <button className="btn btn-block btn-lg" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
        <p className="muted center">
          New here? <Link to={`/register?next=${encodeURIComponent(safeNext(params))}`}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}
