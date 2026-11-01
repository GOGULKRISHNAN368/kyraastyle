import { useEffect, useMemo, useState } from 'react';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import DataTable from '../components/common/DataTable.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ImageThumb from '../components/common/ImageThumb.jsx';
import Pagination from '../components/common/Pagination.jsx';
import SearchBar from '../components/common/SearchBar.jsx';
import Select from '../components/common/Select.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import Toast from '../components/common/Toast.jsx';
import ProductForm from '../components/forms/ProductForm.jsx';
import StockEditor from '../components/forms/StockEditor.jsx';
import { deleteProduct, fetchProductCategories, fetchProducts, reorderProducts, setProductActive } from '../services/products.js';

const pageLimit = 200;

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', tone: 'success' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [section, setSection] = useState('');
  const [active, setActive] = useState('');
  const [sort, setSort] = useState('position');
  const [direction, setDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('grid');
  const [reloadKey, setReloadKey] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [draggedId, setDraggedId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchProductCategories().then(({ data }) => setCategories(data)).catch((reason) => setError(reason.message));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetchProducts({ search: debouncedSearch, category, section, active, sort, direction, page, limit: pageLimit }, controller.signal)
      .then((result) => { setProducts(result.data); setTotal(result.total); })
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [debouncedSearch, category, section, active, sort, direction, page, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / pageLimit));
  const sections = useMemo(() => [...new Set(products.map((item) => item.section).filter(Boolean))].sort(), [products]);
  const canReorder = Boolean(section) && !debouncedSearch && !category && !active && sort === 'position' && direction === 'asc' && total === products.length;

  function notify(message, tone = 'success') { setToast({ message, tone }); window.setTimeout(() => setToast({ message: '', tone: 'success' }), 4000); }
  function openCreate() { setEditingProduct(null); setEditorOpen(true); }
  function openEdit(product) { setEditingProduct(product); setEditorOpen(true); }
  function saveComplete(product, wasEdit) {
    setEditorOpen(false); setEditingProduct(null); setReloadKey((value) => value + 1);
    notify(wasEdit ? 'Product updated.' : 'Product created.');
  }
  async function toggleActive(product) {
    try { await setProductActive(product._id, !product.isActive); setReloadKey((value) => value + 1); notify(product.isActive ? 'Product deactivated.' : 'Product activated.'); }
    catch (reason) { notify(reason.message || 'Could not update product status.', 'error'); }
  }
  async function confirmDelete() {
    if (!deletingProduct) return;
    try { await deleteProduct(deletingProduct._id); setDeletingProduct(null); setReloadKey((value) => value + 1); notify('Product moved to inactive.'); }
    catch (reason) { notify(reason.message || 'Could not delete product.', 'error'); }
  }
  async function saveOrder(ordered) {
    if (!canReorder || ordered.length !== products.length) return;
    const items = ordered.map((item, position) => ({ id: item._id, position }));
    try {
      await reorderProducts(items);
      setProducts((current) => {
        const positions = new Map(items.map(({ id, position }) => [id, position]));
        return ordered.map((item) => ({ ...item, position: positions.get(item._id) }));
      });
      notify('Product order saved.');
    } catch (reason) { notify(reason.message || 'Could not reorder products.', 'error'); setReloadKey((value) => value + 1); }
  }
  function moveProduct(product, offset) {
    const currentIndex = products.findIndex((item) => item._id === product._id);
    const targetIndex = currentIndex + offset;
    if (!canReorder || targetIndex < 0 || targetIndex >= products.length) return;
    const ordered = [...products];
    const [moved] = ordered.splice(currentIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    void saveOrder(ordered);
  }
  function onDropCard(target) {
    if (!draggedId || draggedId === target._id || !canReorder) return;
    const from = products.findIndex((item) => item._id === draggedId);
    const to = products.findIndex((item) => item._id === target._id);
    const ordered = [...products];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setDraggedId(null);
    void saveOrder(ordered);
  }

  const columns = [
    { key: 'product', label: 'Product', sortable: false, render: (row) => <div className="product-row-identity"><ImageThumb src={row.imageUrl} alt={row.alt || row.name} size="sm"/><span><strong>{row.name}</strong><small>{row.cloudinaryId}</small></span></div> },
    { key: 'category', label: 'Category', sortable: false },
    { key: 'section', label: 'Section', sortable: false, render: (row) => row.section || '—' },
    { key: 'price', label: 'Price', sortable: false, render: (row) => row.price == null ? '—' : row.price },
    { key: 'isActive', label: 'Status', sortable: false, render: (row) => <Badge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', label: 'Actions', sortable: false, render: (row) => <div className="product-row-actions">{canReorder && <><Button variant="ghost" size="sm" aria-label="Move product up" onClick={() => moveProduct(row, -1)}>↑</Button><Button variant="ghost" size="sm" aria-label="Move product down" onClick={() => moveProduct(row, 1)}>↓</Button></>}<Button variant="secondary" size="sm" onClick={() => openEdit(row)}>Edit</Button><Button variant="ghost" size="sm" onClick={() => toggleActive(row)}>{row.isActive ? 'Deactivate' : 'Activate'}</Button><Button variant="danger" size="sm" onClick={() => setDeletingProduct(row)}>Delete</Button></div> },
  ];

  return <div className="products-page">
    <Card className="products-toolbar">
      <SearchBar value={search} onChange={setSearch} placeholder="Search name, description, or Cloudinary ID"/>
      <div className="products-filters">
        <Select label="Category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</Select>
        <div className="field"><label htmlFor="section-filter">Section</label><input className="control" id="section-filter" list="product-sections" value={section} onChange={(event) => { setSection(event.target.value); setPage(1); }} placeholder="All sections"/><datalist id="product-sections">{sections.map((item) => <option key={item} value={item}/>)}</datalist></div>
        <Select label="Status" value={active} onChange={(event) => { setActive(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></Select>
        <Select label="Sort by" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="position">Position</option><option value="name">Name</option><option value="category">Category</option><option value="section">Section</option><option value="price">Price</option><option value="createdAt">Date added</option></Select>
        <Button variant="secondary" onClick={() => setDirection((value) => value === 'asc' ? 'desc' : 'asc')}>{direction === 'asc' ? 'Ascending' : 'Descending'}</Button>
      </div>
      <div className="products-toolbar-bottom"><div className="products-view-toggle"><Button variant={view === 'table' ? 'primary' : 'secondary'} onClick={() => setView('table')}>Table view</Button><Button variant={view === 'grid' ? 'primary' : 'secondary'} onClick={() => setView('grid')}>Dress cards</Button></div><Button onClick={openCreate}>Add dress</Button></div>
    </Card>

    <Card className="products-list-card">
      {canReorder && <p className="reorder-hint">Drag products or use the up and down controls to change their order in this section.</p>}
      {loading ? <Skeleton lines={7} className="products-skeleton"/> : error ? <div className="products-error" role="alert">{error}<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div> : products.length === 0 ? <EmptyState title="No dresses found" description="Adjust the filters or add a dress to the Kryaa Style collection." action={<Button onClick={openCreate}>Add dress</Button>}/> : view === 'table' ? <DataTable columns={columns} rows={products} rowKey="_id" pageSize={pageLimit} draggable={canReorder} onReorder={saveOrder}/> : <div className="product-grid">{products.map((product, index) => <article className="product-card" key={product._id} draggable={canReorder} onDragStart={() => setDraggedId(product._id)} onDragOver={(event) => canReorder && event.preventDefault()} onDrop={() => onDropCard(product)}>
        <div className="product-card-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.alt || product.name}/> : <span>No image preview</span>}</div>
        <div className="product-card-content">
          <div className="product-card-title"><strong>{product.name}</strong></div>
          <div className="product-card-price">{product.price == null ? 'Price not set' : `Rs. ${Number(product.price).toLocaleString('en-IN')}`} {product.oldPrice != null && <del>Rs. {Number(product.oldPrice).toLocaleString('en-IN')}</del>}</div>
          <div className="product-card-meta"><span>{product.category}</span><Badge tone={product.isActive ? 'success' : 'neutral'}>{product.isActive ? 'Active' : 'Inactive'}</Badge></div>
          <div className="product-stock-summary">{product.sizes?.some((item) => item.available) ? product.sizes.filter((item) => item.available).map((item) => `${item.size}: ${item.quantity}`).join(' · ') : 'Size stock not set'}</div>
          {(product.isNewArrival || product.isBestSeller || product.isCuratedLook) && <div className="product-flag-list">{product.isNewArrival && <span>New arrival</span>}{product.isBestSeller && <span>Best seller</span>}{product.isCuratedLook && <span>Curated look</span>}</div>}
          {product.description && <p className="product-card-description">{product.description}</p>}
          <div className="product-card-actions">{canReorder && <><Button variant="ghost" size="sm" disabled={index === 0} aria-label="Move dress up" onClick={() => moveProduct(product, -1)}>Up</Button><Button variant="ghost" size="sm" disabled={index === products.length - 1} aria-label="Move dress down" onClick={() => moveProduct(product, 1)}>Down</Button></>}<Button variant="secondary" size="sm" onClick={() => setStockProduct(product)}>Stock</Button><Button variant="secondary" size="sm" onClick={() => openEdit(product)}>Edit</Button><Button variant="ghost" size="sm" onClick={() => toggleActive(product)}>{product.isActive ? 'Deactivate' : 'Activate'}</Button><Button variant="danger" size="sm" onClick={() => setDeletingProduct(product)}>Remove</Button></div>
        </div>
      </article>)}</div>}
      {!loading && !error && products.length > 0 && <Pagination page={page} pages={pages} onChange={setPage}/>}
      {!loading && <p className="products-count">{total} product{total === 1 ? '' : 's'}</p>}
    </Card>

    <ProductForm key={editingProduct?._id || 'new'} open={editorOpen} product={editingProduct} categories={categories} onClose={() => setEditorOpen(false)} onSaved={saveComplete}/>
    <StockEditor product={stockProduct} onClose={() => setStockProduct(null)} onSaved={() => { setStockProduct(null); setReloadKey((value) => value + 1); notify('Dress stock saved.'); }}/>
    <ConfirmDialog open={Boolean(deletingProduct)} title="Delete product?" confirmLabel="Delete product" onClose={() => setDeletingProduct(null)} onConfirm={confirmDelete}>This product will be deactivated and hidden from the website. Its image will remain in Cloudinary.</ConfirmDialog>
    <div className="toast-region" aria-live="polite"><Toast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })}/></div>
  </div>;
}
