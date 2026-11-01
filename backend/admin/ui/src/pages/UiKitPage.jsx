import { useState } from 'react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import Textarea from '../components/common/Textarea.jsx';
import Switch from '../components/common/Switch.jsx';
import Checkbox from '../components/common/Checkbox.jsx';
import Badge from '../components/common/Badge.jsx';
import Card from '../components/common/Card.jsx';
import StatCard from '../components/common/StatCard.jsx';
import DataTable from '../components/common/DataTable.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Drawer from '../components/common/Drawer.jsx';
import Tabs from '../components/common/Tabs.jsx';
import Toast from '../components/common/Toast.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Skeleton from '../components/common/Skeleton.jsx';
import Pagination from '../components/common/Pagination.jsx';
import SearchBar from '../components/common/SearchBar.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import ImageThumb from '../components/common/ImageThumb.jsx';
import FileDrop from '../components/common/FileDrop.jsx';

const sampleRows = [
  { id: 'p-1', name: 'Example product 01', collection: 'Example collection A', status: 'Active' },
  { id: 'p-2', name: 'Example product 02', collection: 'Example collection B', status: 'Draft' },
  { id: 'p-3', name: 'Example product 03', collection: 'Example collection C', status: 'Active' },
];

export default function UiKitPage() {
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState('');
  return <div className="ui-kit">
    <div className="ui-kit-intro"><div><p className="eyebrow">FOUNDATIONS & COMPONENTS</p><h2>UI Kit</h2><p>Reusable controls for the Kryaa Style admin workspace.</p></div></div>

    <Card title="Buttons and badges"><div className="kit-row"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button><Button loading>Loading</Button><Button disabled>Disabled</Button></div><div className="kit-row"><Badge>Neutral</Badge><Badge tone="success">Active</Badge><Badge tone="warning">Pending</Badge><Badge tone="danger">Error</Badge></div></Card>

    <Card title="Form controls"><div className="kit-form-grid"><Input label="Product name" placeholder="Enter a name"/><Input label="Email address" type="email" placeholder="name@example.com" error="Enter a valid email address"/><Input label="Disabled field" value="Unavailable" disabled/><Select label="Collection" defaultValue=""><option value="" disabled>Select a collection</option><option>Kurtas</option><option>Sarees</option><option>Co-ords</option></Select><Textarea label="Description" placeholder="Add a description" rows={3}/><div className="kit-control-stack"><Switch label="Published" checked={switchOn} onChange={setSwitchOn}/><Switch label="Unavailable" disabled checked={false}/><Checkbox label="Select this option" checked={checked} onChange={(event) => setChecked(event.target.checked)}/><Checkbox label="Disabled option" disabled/></div></div></Card>

    <div className="kit-two-col"><StatCard label="Example metric" value="—" change="Placeholder state"/><Card title="Card and image"><div className="kit-row"><ImageThumb size="lg"/><ImageThumb size="lg" src="/kyraastyle-logo.svg" alt="Kryaa Style logo"/><span>Image thumbnail and empty state</span></div></Card></div>

    <Card title="Data table"><p className="kit-description">Sortable columns, row selection, pagination, and compact mobile cards.</p><DataTable columns={[{ key: 'name', label: 'Product' }, { key: 'collection', label: 'Collection' }, { key: 'status', label: 'Status', render: (row) => <Badge tone={row.status === 'Active' ? 'success' : 'neutral'}>{row.status}</Badge> }]} rows={sampleRows} selectable pageSize={2}/></Card>

    <Card title="Search and filters"><FilterBar><SearchBar value={search} onChange={setSearch} placeholder="Search products"/><Select label="Collection" defaultValue="all"><option value="all">All collections</option><option>Example collection A</option><option>Example collection B</option></Select><Button variant="secondary">Filters</Button></FilterBar></Card>

    <Card title="Tabs and pagination"><Tabs items={[{ value: 'all', label: 'All products' }, { value: 'active', label: 'Active' }, { value: 'draft', label: 'Drafts' }]} value={tab} onChange={setTab}/><Pagination page={page} pages={4} onChange={setPage}/></Card>

    <Card title="Dialogs and drawer"><div className="kit-row"><Button onClick={() => setModalOpen(true)}>Open modal</Button><Button variant="secondary" onClick={() => setConfirmOpen(true)}>Confirm dialog</Button><Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button><Button variant="ghost" onClick={() => setToast('Changes saved successfully')}>Show success toast</Button><Button variant="danger" onClick={() => setToast('Something went wrong')}>Show error toast</Button></div></Card>
    <div className="kit-two-col"><Card title="Empty state"><EmptyState title="No products yet" description="Your products will appear here." action={<Button size="sm">Add a product</Button>}/></Card><Card title="Skeleton loading"><Skeleton lines={4}/></Card></div>
    <Card title="File upload"><FileDrop accept="image/*" multiple onFiles={(files) => setToast(`${files.length} file(s) selected`)}/></Card>

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Edit product" footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => setModalOpen(false)}>Save changes</Button></>}><p className="kit-description">Dialog content with a responsive sticky action footer.</p><Input label="Product title" defaultValue="Example product"/></Modal>
    <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => setConfirmOpen(false)}>This action cannot be undone.</ConfirmDialog>
    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Product details" footer={<Button onClick={() => setDrawerOpen(false)}>Done</Button>}><p>Drawer content adapts to a full screen on small devices.</p></Drawer>
    <div className="toast-region" aria-live="polite"><Toast message={toast} onClose={() => setToast('')}/></div>
  </div>;
}
