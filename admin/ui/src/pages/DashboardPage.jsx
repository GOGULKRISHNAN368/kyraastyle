import Card from '../components/common/Card.jsx';
import StatCard from '../components/common/StatCard.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export default function DashboardPage() {
  return <div className="dashboard-grid">
    <div className="stats-grid"><StatCard label="Products" value="—" change="Catalog overview"/><StatCard label="New enquiries" value="—" change="Recent messages"/><StatCard label="Reviews" value="—" change="Awaiting review"/><StatCard label="Media files" value="—" change="Library overview"/></div>
    <Card title="Recent activity" className="dashboard-recent"><EmptyState title="Your activity will appear here" description="Activity from the Kryaa Style admin tools will be shown here."/></Card>
    <Card title="Store overview" className="dashboard-note"><p>Your Kryaa Style workspace is ready.</p></Card>
  </div>;
}
