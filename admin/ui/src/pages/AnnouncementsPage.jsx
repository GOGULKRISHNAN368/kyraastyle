import { useEffect, useState } from 'react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Input from '../components/common/Input.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import Toast from '../components/common/Toast.jsx';
import { createAnnouncement, fetchAnnouncements, removeAnnouncement } from '../services/announcements.js';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', tone: 'success' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchAnnouncements(controller.signal)
      .then(({ data }) => setItems(data || []))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Could not load announcements.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey]);

  function notify(message, tone = 'success') {
    setToast({ message, tone });
    window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000);
  }

  async function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value) { notify('Enter announcement text.', 'error'); return; }
    setSaving(true);
    try {
      const { data } = await createAnnouncement(value);
      setItems((current) => [data, ...current]); setText(''); notify('Announcement published.');
    } catch (reason) { notify(reason.message || 'Could not publish announcement.', 'error'); }
    finally { setSaving(false); }
  }

  async function remove(item) {
    if (!window.confirm('Remove this announcement?')) return;
    setRemoving(item._id);
    try {
      await removeAnnouncement(item._id);
      setItems((current) => current.filter((entry) => entry._id !== item._id)); notify('Announcement removed.');
    } catch (reason) { notify(reason.message || 'Could not remove announcement.', 'error'); }
    finally { setRemoving(''); }
  }

  return <div className="announcements-page">
    <p className="categories-subtitle">Manage your storefront announcements.</p>
    <Card className="announcement-create-card">
      <form className="announcement-create-form" onSubmit={submit}>
        <h2>New Announcement</h2>
        <label className="announcement-field-label" htmlFor="announcement-text">Announcement text</label>
        <div className="announcement-compose">
          <Input id="announcement-text" name="announcement" value={text} onChange={(event) => setText(event.target.value)} placeholder="Enter your announcement text here..." maxLength={500} aria-label="Announcement text"/>
          <Button type="submit" loading={saving}>{saving ? 'Publishing...' : 'Upload'}</Button>
        </div>
        <small className="announcement-character-count">{text.length}/500</small>
      </form>
    </Card>

    <Card className="announcement-list-card">
      <h2>Active Announcements</h2>
      {loading ? <div className="announcement-loading">{[0, 1, 2].map((key) => <Skeleton key={key} lines={2}/>)}</div>
        : error ? <div className="products-error" role="alert">{error}<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div>
          : items.length === 0 ? <EmptyState title="No active announcements" description="Create an announcement to display it here."/>
            : <div className="announcement-list">{items.map((item) => <article className="announcement-row" key={item._id}>
              <div className="announcement-copy"><strong>{item.text}</strong><time dateTime={item.createdAt}><span aria-hidden="true">◷</span> {formatDate(item.createdAt)}</time></div>
              <Button variant="danger" loading={removing === item._id} onClick={() => remove(item)}>{removing === item._id ? 'Removing...' : 'Remove'}</Button>
            </article>)}</div>}
    </Card>
    <div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div>
  </div>;
}
