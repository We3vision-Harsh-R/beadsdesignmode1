import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Loader } from '../components/Guards';

export function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      {sent ? (
        <div className="card form center">
          <h1>Check your email</h1>
          <p>If <strong>{email}</strong> has an account, we sent a link to set a new password.</p>
          <Link to="/login" className="btn btn-block">Back to login</Link>
        </div>
      ) : (
        <form className="card form" onSubmit={submit}>
          <h1>Forgot password</h1>
          <p className="muted">Enter your email and we'll send you a reset link.</p>
          <label className="field"><span>Email</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button className="btn btn-block btn-lg" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <Link to="/login" className="center small">Back to login</Link>
        </form>
      )}
    </div>
  );
}

// Opened from the reset email: Supabase signs the user in for recovery
export function ResetPassword() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Loader />;
  if (!user) {
    return (
      <div className="empty">
        <p>This reset link is invalid or has expired.</p>
        <Link to="/forgot-password" className="btn">Send a new link</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success('Password updated');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="card form" onSubmit={submit}>
        <h1>Set a new password</h1>
        <p className="muted">{user.email}</p>
        <label className="field"><span>New password (min 8 characters)</span><input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn btn-block btn-lg" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
    </div>
  );
}
