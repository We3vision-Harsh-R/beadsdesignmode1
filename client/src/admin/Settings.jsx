import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api, imgUrl, STORE_NAME } from '../api';
import { Loader } from '../components/Guards';
import defaultLogo from '../assets/logo.png';
import { BRANDING_DEFAULTS } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';

const LIMITS = { height: [20, 90], mobileHeight: [16, 70] };

export default function Settings() {
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user?.isOwner) return;
    api('/admin/settings').then((d) => setForm(d.branding)).catch((e) => toast.error(e.message));
  }, [user]);

  if (!user?.isOwner) return <p className="muted">Only the owner can change the website settings.</p>;
  if (!form) return <Loader />;

  const set = (key) => (e) => setForm({ ...form, [key]: Number(e.target.value) });
  const logoSrc = form.url ? imgUrl(form.url) : defaultLogo;

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const { urls } = await api('/upload', { method: 'POST', body: fd });
      setForm((f) => ({ ...f, url: urls[0] }));
      toast.success('Logo uploaded. Press Save to publish it.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      fileRef.current.value = '';
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const d = await api('/admin/settings/branding', { method: 'PUT', body: form });
      setForm(d.branding);
      window.dispatchEvent(new Event('config-changed'));
      toast.success('Logo saved. It is live on the website now.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const slider = (key, label) => (
    <label className="field">
      <span>{label}: <strong>{form[key]} px</strong></span>
      <input type="range" min={LIMITS[key][0]} max={LIMITS[key][1]} value={form[key]} onChange={set(key)} />
    </label>
  );

  return (
    <>
      <h1>Website settings</h1>
      <div className="card form" style={{ maxWidth: 640 }}>
        <h3>Logo</h3>
        <p className="muted small">Shown in the website header. Use a PNG, JPG or WEBP with a transparent or white background.</p>

        <div className="logo-preview" aria-label="Logo preview">
          <img src={logoSrc} alt={STORE_NAME} style={{ height: form.height }} />
        </div>
        <div className="logo-preview logo-preview-mobile" aria-label="Mobile logo preview">
          <img src={logoSrc} alt={STORE_NAME} style={{ height: form.mobileHeight }} />
          <span className="muted small">on phones</span>
        </div>

        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload new logo'}
          </button>
          {form.url && (
            <button type="button" className="btn btn-ghost" onClick={() => setForm({ ...form, url: '' })}>
              Use the original logo
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => upload(e.target.files[0])} />
        </div>

        {slider('height', 'Logo height on computer')}
        {slider('mobileHeight', 'Logo height on phone')}

        <div className="row">
          <button type="button" className="btn" onClick={save} disabled={saving || uploading}>{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setForm({ ...form, height: BRANDING_DEFAULTS.height, mobileHeight: BRANDING_DEFAULTS.mobileHeight })}>
            Reset sizes
          </button>
        </div>
      </div>
    </>
  );
}
