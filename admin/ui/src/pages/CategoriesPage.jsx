import { useEffect, useState } from 'react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import Toast from '../components/common/Toast.jsx';
import CategoryForm from '../components/forms/CategoryForm.jsx';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../services/categories.js';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', tone: 'success' });
  const [reloadKey, setReloadKey] = useState(0);
  const [formReset, setFormReset] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchCategories(controller.signal)
      .then(({ data }) => setCategories(data))
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message || 'Could not load categories.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey]);

  function notify(message, tone = 'success') {
    setToast({ message, tone });
    window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000);
  }

  async function saveCategory(payload) {
    try {
      if (editing) await updateCategory(editing.id, payload);
      else await createCategory(payload);
      setEditing(null);
      setFormReset((value) => value + 1);
      setReloadKey((value) => value + 1);
      notify(editing ? 'Category updated.' : 'Category saved.');
    } catch (reason) {
      throw new Error(reason.message || 'Could not save category.');
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteCategory(deleting.id);
      setDeleting(null);
      setReloadKey((value) => value + 1);
      notify('Category deleted.');
    } catch (reason) {
      setDeleting(null);
      notify(reason.message || 'Could not delete category.', 'error');
    }
  }

  return <div className="categories-page">
    <p className="categories-subtitle">Manage your storefront categories and collections.</p>
    <Card className="category-editor-card"><CategoryForm key={editing?.id || `new-category-${formReset}`} category={editing} onSave={saveCategory} onCancel={() => setEditing(null)}/></Card>
    <section className="category-list" aria-label="Store categories">
      {loading ? <div className="category-grid">{Array.from({ length: 5 }, (_, index) => <Card key={index}><Skeleton lines={5}/></Card>)}</div>
        : error ? <Card><div className="products-error" role="alert">{error}<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div></Card>
          : categories.length === 0 ? <EmptyState title="No categories yet" description="Add a category to organize the Kryaa Style dresses."/>
            : <div className="category-grid">{categories.map((category) => <article className="category-card" key={category.id}>
              <div className="category-card-image">{category.imageUrl ? <img src={category.imageUrl} alt="" loading="lazy"/> : <span aria-hidden="true">&#128193;</span>}</div>
              <div className="category-card-body"><h2>{category.name}</h2><p>{category.description || `${category.productCount} ${category.productCount === 1 ? 'dress' : 'dresses'} in this category`}</p><div className="category-card-actions"><Button variant="secondary" onClick={() => setEditing(category)}>Edit</Button><Button variant="danger" onClick={() => setDeleting(category)}>Delete</Button></div></div>
            </article>)}</div>}
    </section>
    <ConfirmDialog open={Boolean(deleting)} title="Delete category?" confirmLabel="Delete category" onClose={() => setDeleting(null)} onConfirm={confirmDelete}>A category can only be deleted when no dresses use it.</ConfirmDialog>
    <div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div>
  </div>;
}
