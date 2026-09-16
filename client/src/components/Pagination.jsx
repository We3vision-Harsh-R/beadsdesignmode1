export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
      <span className="muted">Page {page} of {pages}</span>
      <button className="btn btn-ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  );
}
