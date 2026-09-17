import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { STORE_NAME } from '../api';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  ['/admin', 'Dashboard', true],
  ['/admin/designs', 'Designs'],
  ['/admin/orders', 'Orders'],
  ['/admin/packages', 'Packages'],
  ['/admin/categories', 'Categories'],
  ['/admin/users', 'Customers'],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="admin">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <Link to="/admin" className="brand"><span className="brand-dot" /> Admin</Link>
          <button className="menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>☰</button>
        </div>
        <nav onClick={() => setOpen(false)}>
          {LINKS.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end}>{label}</NavLink>
          ))}
          <Link to="/admin/designs/new" className="sidebar-cta">+ Upload design</Link>
          <hr />
          <Link to="/" target="_blank">View store ↗</Link>
          <button className="link-btn" onClick={logout}>Logout</button>
        </nav>
        <div className="sidebar-foot small">{STORE_NAME}<br />{user?.phone}</div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
