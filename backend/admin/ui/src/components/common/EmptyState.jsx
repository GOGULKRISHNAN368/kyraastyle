export default function EmptyState({ title = 'Nothing here yet', description, action }) {
  return <div className="empty-state"><span className="empty-state-mark" aria-hidden="true">◇</span><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}
