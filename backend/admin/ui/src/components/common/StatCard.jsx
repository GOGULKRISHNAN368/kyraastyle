import Card from './Card.jsx';
export default function StatCard({ label, value, change, icon }) {
  return <Card className="stat-card"><div className="stat-card-top"><span>{label}</span>{icon}</div><strong>{value}</strong>{change && <small>{change}</small>}</Card>;
}
