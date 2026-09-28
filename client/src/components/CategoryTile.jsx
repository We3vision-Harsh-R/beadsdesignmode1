import { Link } from 'react-router-dom';
import { imgUrl } from '../api';

// Shows the category's real photo when the admin has set one; otherwise falls
// back to the plain decorative tile (see .cat-tile::before in index.css).
export default function CategoryTile({ category: c }) {
  return (
    <Link to={`/designs?category=${c.slug}`} className={`card cat-tile ${c.image ? 'has-img' : ''}`}>
      {c.image && <span className="cat-thumb" style={{ backgroundImage: `url(${imgUrl(c.image)})` }} />}
      <strong>{c.name}</strong>
      <span className="muted small">{c.count} designs</span>
    </Link>
  );
}
