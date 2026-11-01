export default function Card({ title, action, children, className = '' }) {
  return <section className={`card ${className}`}>{(title || action) && <header className="card-header">{title && <h2>{title}</h2>}{action}</header>}{children}</section>;
}
