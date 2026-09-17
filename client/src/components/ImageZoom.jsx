import { useRef, useState } from 'react';
import { imgUrl } from '../api';

// Product image that magnifies under the cursor on hover (desktop) and
// opens the fullscreen lightbox on click (all devices).
export default function ImageZoom({ src, alt, className = '', onClick }) {
  const frameRef = useRef(null);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  if (!src) {
    return (
      <div className={`pimg pimg-empty ${className}`} role="img" aria-label={alt}>
        <span>✿</span>
      </div>
    );
  }

  const handleMove = (e) => {
    const rect = frameRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  return (
    <div
      ref={frameRef}
      className={`zoom-frame ${zoomed ? 'zoomed' : ''}`}
      onMouseEnter={() => setZoomed(true)}
      onMouseMove={handleMove}
      onMouseLeave={() => setZoomed(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${alt} full screen`}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.(e)}
    >
      <img
        src={imgUrl(src)}
        alt={alt}
        className={`pimg ${className}`}
        style={{ transformOrigin: origin }}
        loading="lazy"
      />
      <span className="zoom-hint">⤢</span>
    </div>
  );
}
