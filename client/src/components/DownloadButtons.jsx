import { useState } from 'react';
import toast from 'react-hot-toast';
import { api, downloadFile, fileSize } from '../api';

export default function DownloadButtons({ design, onDownloaded, compact = false }) {
  const [busy, setBusy] = useState('');

  // Designs sold through a Google Drive link
  if (design.hasDrive) {
    const openDrive = async () => {
      setBusy('drive');
      // Open the tab first so phone browsers don't block it as a popup
      const tab = window.open('', '_blank');
      try {
        const { url } = await api(`/designs/${design._id}/drive`);
        if (tab) tab.location.href = url;
        else window.location.href = url;
        onDownloaded?.();
      } catch (e) {
        tab?.close();
        toast.error(e.message);
      } finally {
        setBusy('');
      }
    };
    return (
      <div className={`downloads ${compact ? 'compact' : ''}`}>
        <button className="btn btn-download" disabled={Boolean(busy)} onClick={openDrive}>
          {busy ? 'Opening…' : `⬇ Download${design.formats?.length ? ` (${design.formats.join(', ')})` : ''}`}
          {!compact && <span className="small">via Google Drive</span>}
        </button>
      </div>
    );
  }

  if (!design.files?.length) {
    return <p className="muted small">Files for this design are being added. Please check back soon.</p>;
  }

  const download = async (file) => {
    setBusy(file._id);
    try {
      await downloadFile(`/designs/${design._id}/files/${file._id}`);
      onDownloaded?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className={`downloads ${compact ? 'compact' : ''}`}>
      {design.files.map((f) => (
        <button key={f._id} className="btn btn-download" disabled={Boolean(busy)} onClick={() => download(f)}>
          {busy === f._id ? 'Downloading…' : `⬇ .${f.format}`}
          {!compact && f.size > 0 && <span className="small">{fileSize(f.size)}</span>}
        </button>
      ))}
    </div>
  );
}
