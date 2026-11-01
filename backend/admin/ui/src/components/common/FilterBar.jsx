export default function FilterBar({ children, className = '' }) {
  return <div className={`filter-bar ${className}`}>{children}</div>;
}
