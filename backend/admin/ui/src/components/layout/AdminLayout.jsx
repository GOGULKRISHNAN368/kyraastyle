import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../common/Icon.jsx';
import SearchBar from '../common/SearchBar.jsx';

const links = [
  ['Dashboard', '/dashboard', 'grid'], ['Categories', '/categories', 'folder'], ['Dresses', '/products', 'box'], ['Coupons', '/coupons', 'tag'], ['Reels', '/reels', 'video'], ['Instagram', '/instagram', 'image'], ['Media Library', '/media', 'image'],
  ['Reviews', '/reviews', 'star'], ['Leads', '/leads', 'users'], ['Orders', '/orders', 'box'], ['Completed Orders', '/completed-orders', 'check'], ['Cancelled Orders', '/cancelled-orders', 'close'], ['Enquiries', '/enquiries', 'mail'],
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);
  const touchStart = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const current = useMemo(() => links.find(([, path]) => path === location.pathname)?.[0] || (location.pathname === '/ui-kit' ? 'UI Kit' : 'Dashboard'), [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector('button, a')?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
      if (event.key === 'Tab') {
        const focusable = [...sidebarRef.current.querySelectorAll('button:not(:disabled), a[href]')].filter((node) => node.getClientRects().length > 0);
        if (!focusable.length) return;
        if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener('keydown', keydown);
      menuButtonRef.current?.focus();
    };
  }, [drawerOpen]);

  function closeDrawer() { setDrawerOpen(false); }
  async function logout() { await signOut(); navigate('/login', { replace: true }); }

  return <div className={`admin-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {drawerOpen && <button className="drawer-backdrop" aria-label="Close navigation" onClick={closeDrawer}/>}
    <aside ref={sidebarRef} className={`admin-sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="Main navigation" role={drawerOpen ? 'dialog' : undefined} aria-modal={drawerOpen || undefined} onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX; }} onTouchEnd={(event) => { if (touchStart.current != null && touchStart.current - event.changedTouches[0].clientX > 70) closeDrawer(); touchStart.current = null; }}>
      <div className="sidebar-brand"><img src="/kyraastyle-logo.svg" alt="Kryaa Style"/><button className="sidebar-close icon-button" aria-label="Close navigation" onClick={closeDrawer}><Icon name="close"/></button></div>
      <nav className="sidebar-nav">{links.map(([label, path, icon]) => <NavLink key={path} to={path} title={label} aria-label={label} className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`} onClick={closeDrawer}><Icon name={icon}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><Icon name="collapse"/><span>Collapse menu</span></button></div>
    </aside>

    <div className="admin-main">
      <header className="topbar">
        <button ref={menuButtonRef} className="icon-button mobile-menu-button" aria-label="Open navigation" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><Icon name="menu"/></button>
        <div className="mobile-brand"><img src="/kyraastyle-logo.svg" alt="Kryaa Style"/></div>
        <div className={`topbar-search ${searchOpen ? 'is-expanded' : ''}`}><SearchBar value={searchValue} onChange={setSearchValue} placeholder="Search"/></div>
        <button className="icon-button mobile-search-button" aria-label={searchOpen ? 'Close search' : 'Open search'} onClick={() => setSearchOpen((open) => !open)}><Icon name={searchOpen ? 'close' : 'search'}/></button>
        <div className="topbar-actions">
          <div className="popover-wrap"><button className="icon-button notification-button" aria-label="Notifications" aria-expanded={noticeOpen} onClick={() => { setNoticeOpen((open) => !open); setProfileOpen(false); }}><Icon name="bell"/><i aria-hidden="true"/></button>{noticeOpen && <div className="header-popover">No new notifications</div>}</div>
          <div className="popover-wrap"><button className="profile-trigger" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setNoticeOpen(false); }}><span className="profile-avatar">{user?.name?.slice(0, 1).toUpperCase() || 'K'}</span><span className="profile-name">{user?.name || 'Admin'}</span><span aria-hidden="true">⌄</span></button>{profileOpen && <div className="header-popover profile-popover"><strong>{user?.name}</strong><small>{user?.email}</small>{!import.meta.env.DEV && <button onClick={logout}>Log out</button>}</div>}</div>
        </div>
        {searchOpen && <div className="mobile-search-row"><SearchBar value={searchValue} onChange={setSearchValue} placeholder="Search admin"/></div>}
      </header>
      <main className="admin-content">
        <div className="content-inner">
          <div className="page-heading"><div><nav className="breadcrumbs" aria-label="Breadcrumb"><NavLink to="/dashboard">Home</NavLink><Icon name="chevron" size={14}/><span>{current}</span></nav><h1>{current}</h1></div></div>
          <div className="page-body"><Outlet context={{ current }}/></div>
        </div>
      </main>
    </div>
  </div>;
}
