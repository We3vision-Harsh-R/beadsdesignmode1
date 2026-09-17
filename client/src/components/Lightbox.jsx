import { useEffect, useRef } from 'react';
import { imgUrl } from '../api';

// Fullscreen image viewer with a slider for the design's other photos.
// Esc closes it, arrow keys move between images.
export default function Lightbox({ images, index, onClose, onChange }) {
  const closeRef = useRef(null);
  const many = images.length > 1;

  const prev = () => onChange((index - 1 + images.length) % images.length);
  const next = () => onChange((index + 1) % images.length);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (many && e.key === 'ArrowRight') next();
      else if (many && e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const stop = (e) => e.stopPropagation();

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <button ref={closeRef} className="lightbox-close" onClick={onClose} aria-label="Close">✕</button>

      {many && (
        <button className="lightbox-nav prev" onClick={(e) => { stop(e); prev(); }} aria-label="Previous image">‹</button>
      )}

      <img src={imgUrl(images[index])} alt="" className="lightbox-img" onClick={stop} />

      {many && (
        <button className="lightbox-nav next" onClick={(e) => { stop(e); next(); }} aria-label="Next image">›</button>
      )}

      {many && (
        <div className="lightbox-dots" onClick={stop}>
          {images.map((img, i) => (
            <button
              key={img}
              className={`lightbox-dot ${i === index ? 'active' : ''}`}
              onClick={() => onChange(i)}
              aria-label={`Image ${i + 1} of ${images.length}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
