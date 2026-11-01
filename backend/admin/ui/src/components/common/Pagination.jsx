import Button from './Button.jsx';
export default function Pagination({ page = 1, pages = 1, onChange }) {
  return <nav className="pagination" aria-label="Pagination"><span>Page {page} of {pages}</span><div><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange?.(page - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange?.(page + 1)}>Next</Button></div></nav>;
}
