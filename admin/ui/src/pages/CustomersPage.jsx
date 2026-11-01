import { useEffect, useMemo, useState } from 'react';
import Card from '../components/common/Card.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import SearchBar from '../components/common/SearchBar.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import { fetchCustomers } from '../services/customers.js';

function formatDate(value) {
  if (!value) return 'Never signed in';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomers(controller.signal)
      .then(({ data }) => setCustomers(data || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Could not load customers.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone || ''}`.toLowerCase().includes(query));
  }, [customers, search]);

  return <div className="leads-page">
    <p className="categories-subtitle">Customer accounts created when shoppers sign in before adding items to their bag.</p>
    <Card className="leads-panel">
      <div className="leads-panel-heading"><div><h2>Customers</h2><p>Account and most recent sign-in details. Passwords are never shown or stored in readable form.</p></div><span className="leads-total">{customers.length} {customers.length === 1 ? 'customer' : 'customers'}</span></div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search customer name, email or phone"/>
      {loading ? <div className="leads-loading">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} lines={3}/>)}</div>
        : error ? <p className="product-form-error" role="alert">{error}</p>
          : visibleCustomers.length === 0 ? <EmptyState title={customers.length ? 'No matching customers' : 'No customer accounts yet'} description="Customer accounts will appear here after a shopper registers or signs in."/>
            : <div className="lead-list">{visibleCustomers.map((customer) => <article className="lead-row" key={customer._id}>
              <div className="lead-info"><strong>{customer.name}</strong><a href={`mailto:${customer.email}`}>{customer.email}</a>{customer.phone && <a href={`tel:${customer.phone}`}>{customer.phone}</a>}<time dateTime={customer.lastLoginAt || customer.createdAt}>Last sign-in: {formatDate(customer.lastLoginAt)}</time></div>
              <span className="lead-verified" role="status">Account active</span>
            </article>)}</div>}
    </Card>
  </div>;
}
