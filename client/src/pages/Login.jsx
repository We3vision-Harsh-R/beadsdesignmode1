import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';

export function safeNext(params) {
  const next = params.get('next') || '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function Login() {
  const { user, login } = useAuth();
  const config = useConfig();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ mobile: '', password: '' });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={safeNext(params)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(form.mobile, form.password);
      toast.success(`Welcome back${u.name ? `, ${u.name}` : ''}`);
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
          <span>Password</span>
          <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        {config.whatsapp && (
          <a
            className="small"
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent('Hi, I forgot my password. My mobile number is: ')}`}
          >
            Forgot password? Contact us on WhatsApp
          </a>
        )}
        <button className="btn btn-block btn-lg" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
        <p className="muted center">
          New here? <Link to={`/register?next=${encodeURIComponent(safeNext(params))}`}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}
