import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { STORE_NAME } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useConfig } from '../context/ConfigContext';
import { BoxIcon, CartIcon, DownloadIcon, GridIcon, HomeIcon, SearchIcon, UserIcon } from './Icons';

export default function StoreLayout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const config = useConfig();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hideSearch, setHideSearch] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
    setHideSearch(false);
  }, [pathname]);

  // On phones, hide the header search bar while scrolling down and bring it
  // back when scrolling up or near the top, so it doesn't take up space.
  // Compares each new position against the last one seen, with a threshold
  // big enough to ignore the small sub-pixel wobble some browsers report
  // while momentum scrolling settles.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setHideSearch(false);
      else if (y - lastY > 16) setHideSearch(true);
      else if (y - lastY < -16) setHideSearch(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the account dropdown when clicking elsewhere
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [menuOpen]);

  const search = (e) => {
    e.preventDefault();
    navigate(`/designs${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  return (
    <div className="store">
      <div className="topbar">
        <div className="container">
          Instant download · EMB, DST, PES, JEF files
          {config.whatsapp && (
            <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp support</a>
          )}
        </div>
      </div>

      <header className={`header ${hideSearch ? 'hide-search' : ''}`}>
        <div className="container header-row">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" /><path d="M16 5c3 5 3 17 0 22M5 16c5-3 17-3 22 0" /></svg>
            </span>
            <span>{STORE_NAME}</span>
          </Link>

          <form className="search" onSubmit={search} role="search">
            <SearchIcon />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search design ID or name" aria-label="Search designs" />
          </form>

          <nav className={`nav ${open ? 'open' : ''}`}>
            <NavLink to="/designs">Designs</NavLink>
            <NavLink to="/free-designs">Free</NavLink>
            <NavLink to="/categories">Categories</NavLink>
            <NavLink to="/packages">Packages</NavLink>
            {user ? (
              <div className={`account-menu ${menuOpen ? 'open' : ''}`} ref={menuRef}>
                <button className="account-toggle" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                  <UserIcon /> <span className="ellipsis">{user.name.split(' ')[0]}</span> ▾
                </button>
                <div className="account-links">
                  <NavLink to="/downloads">My downloads</NavLink>
                  <NavLink to="/orders">My orders</NavLink>
                  <NavLink to="/account">Account</NavLink>
                  {user.role === 'admin' && <NavLink to="/admin" className="nav-admin">Admin panel</NavLink>}
                  <button className="link-btn nav-logout" onClick={logout}>Logout</button>
                </div>
              </div>
            ) : (
              <NavLink to="/login" className="nav-login">Login</NavLink>
            )}
          </nav>

          <Link to="/cart" className="icon-btn cart-btn" aria-label={`Cart, ${count} items`}>
            <CartIcon />
            {count > 0 && <span className="badge">{count}</span>}
          </Link>
          <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            <span className={`burger ${open ? 'x' : ''}`}><i /><i /><i /></span>
          </button>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <strong className="brand-foot">{STORE_NAME}</strong>
            <p>Computer embroidery designs for multi-head, single-head and small machines. Pay once and download instantly.</p>
          </div>
          <div>
            <strong>Shop</strong>
            <Link to="/designs">All designs</Link>
            <Link to="/free-designs">Free designs</Link>
            <Link to="/categories">Categories</Link>
            <Link to="/packages">Download packages</Link>
          </div>
          <div>
            <strong>Help</strong>
            <Link to="/policies#terms">Terms & conditions</Link>
            <Link to="/policies#privacy">Privacy policy</Link>
            <Link to="/policies#refund">Refund policy</Link>
            <Link to="/policies#contact">Contact us</Link>
          </div>
          <div>
            <strong>Contact</strong>
            {config.supportEmail && <a href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>}
            {config.supportPhone && <a href={`tel:${config.supportPhone}`}>{config.supportPhone}</a>}
            {config.whatsapp && <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp us</a>}
            <span>Digital products only. No physical shipping.</span>
          </div>
        </div>
        <div className="container copyright">© {new Date().getFullYear()} {STORE_NAME}. All rights reserved.</div>
      </footer>

      {/* App-style navigation on phones */}
      <nav className="bottom-nav" aria-label="Quick navigation">
        <NavLink to="/" end><HomeIcon /><span>Home</span></NavLink>
        <NavLink to="/designs"><GridIcon /><span>Designs</span></NavLink>
        <NavLink to="/packages"><BoxIcon /><span>Packages</span></NavLink>
        <NavLink to={user ? '/downloads' : '/login'}>{user ? <DownloadIcon /> : <UserIcon />}<span>{user ? 'Downloads' : 'Login'}</span></NavLink>
        <NavLink to="/cart" className="bn-cart">
          <CartIcon />
          {count > 0 && <span className="badge">{count}</span>}
          <span>Cart</span>
        </NavLink>
      </nav>
    </div>
  );
}
