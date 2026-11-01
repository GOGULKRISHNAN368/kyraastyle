export default function Skeleton({ lines = 1, className = '' }) {
  return <div className={`skeleton-stack ${className}`} aria-label="Loading" role="status">{Array.from({ length: lines }, (_, index) => <span className="skeleton-line" key={index}/>)}</div>;
}
