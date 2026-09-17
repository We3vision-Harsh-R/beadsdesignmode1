import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { safeNext } from './Login';

export default function Register() {
  const { user, register } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ mobile: '', password: '' });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={safeNext(params)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(form.mobile, form.password);
      toast.success('Account created');
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
        <h1>Create account</h1>
        <label className="field">
          <span>Mobile number</span>
          <input
            type="tel"
            required
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            maxLength={10}
            title="10 digit mobile number"
            autoComplete="tel-national"
            autoFocus
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
          />
        </label>
        <label className="field">
          <span>Password (min 8 characters)</span>
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn btn-block btn-lg" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted center">
          Already have an account? <Link to={`/login?next=${encodeURIComponent(safeNext(params))}`}>Login</Link>
        </p>
      </form>
    </div>
  );
}
