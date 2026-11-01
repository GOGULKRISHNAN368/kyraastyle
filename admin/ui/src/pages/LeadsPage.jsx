import { useEffect, useMemo, useState } from 'react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import SearchBar from '../components/common/SearchBar.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import Toast from '../components/common/Toast.jsx';
import { fetchLeads, setLeadVerified } from '../services/leads.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState('');
  const [toast, setToast] = useState({ message: '', tone: 'success' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchLeads(controller.signal).then(({ data }) => setLeads(data || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Could not load customer leads.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey]);

  const visibleLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter((lead) => `${lead.email || ''} ${lead.phone || ''}`.toLowerCase().includes(query));
  }, [leads, search]);

  function notify(message, tone = 'success') {
    setToast({ message, tone });
    window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000);
  }

  async function markVerified(lead) {
    setUpdating(String(lead._id));
    try {
      const { data } = await setLeadVerified(lead._id, true);
      setLeads((current) => current.map((item) => item._id === data._id ? data : item));
      notify('Lead marked verified.');
    } catch (reason) { notify(reason.message || 'Could not update lead status.', 'error'); }
    finally { setUpdating(''); }
  }

  return <div className="leads-page">
    <p className="categories-subtitle">Customer leads captured by the storefront login.</p>
    <Card className="leads-panel">
      <div className="leads-panel-heading"><div><h2>Customer Leads</h2><p>Customer contact details and OTP verification status.</p></div><span className="leads-total">{leads.length} {leads.length === 1 ? 'lead' : 'leads'}</span></div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search email or phone"/>
      {loading ? <div className="leads-loading">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} lines={3}/>)}</div>
        : error ? <div className="products-error" role="alert">{error}<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div>
          : visibleLeads.length === 0 ? <EmptyState title={leads.length ? 'No matching leads' : 'No customer leads yet'} description={leads.length ? 'Try another email address or phone number.' : 'Leads will appear here when customer login data is saved to admin_leads.'}/>
            : <div className="lead-list">{visibleLeads.map((lead) => <article className="lead-row" key={lead._id}>
              <div className="lead-info">
                <strong>{lead.email || 'Email not provided'}</strong>
                {lead.phone && <a href={`tel:${lead.phone}`}><span aria-hidden="true">☎</span> {lead.phone}</a>}
                <time dateTime={lead.createdAt}><span aria-hidden="true">◷</span> {formatDate(lead.createdAt)}</time>
              </div>
              <div className="lead-status-action">{lead.isVerified
                ? <span className="lead-verified" role="status">Verified</span>
                : <Button loading={updating === String(lead._id)} disabled={Boolean(updating && updating !== String(lead._id))} onClick={() => markVerified(lead)}>Mark Verified</Button>}</div>
            </article>)}</div>}
    </Card>
    <div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div>
  </div>;
}
