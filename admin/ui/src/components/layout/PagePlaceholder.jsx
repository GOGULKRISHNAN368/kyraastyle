import EmptyState from '../common/EmptyState.jsx';
export default function PagePlaceholder({ title }) {
  return <EmptyState title={`${title} coming soon`} description={`The ${title.toLowerCase()} workspace is ready for its next step.`}/>;
}
