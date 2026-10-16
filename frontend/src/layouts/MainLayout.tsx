import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import './MainLayout.css';

const CURRENT_YEAR = new Date().getFullYear();

const PRIMARY_LINKS = [
  { to: '/providers', label: 'Find care' },
  { to: '/medicines', label: 'Medicines' },
  { to: '/diagnostic-tests', label: 'Tests' },
  { to: '/health-camps', label: 'Health camps' },
  { to: '/home-care', label: 'Home care' },
];

export function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="layout">
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="site-logo">
            <span className="site-logo__mark">MC</span>
            MediConnect
          </Link>

          <nav className="site-nav site-nav--desktop">
            {PRIMARY_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className="site-nav__link">
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-header__actions">
            <Link to="/emergency" className="site-nav__emergency">
              Emergency
            </Link>
            <div className="site-header__auth">
              {user ? (
                <>
                  <NavLink to="/account" className="site-nav__link">
                    {user.fullName.split(' ')[0]}
                  </NavLink>
                  <button className="btn btn-secondary btn-sm" onClick={() => logout()}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className="site-nav__link">
                    Log in
                  </NavLink>
                  <Link to="/register" className="btn btn-primary btn-sm">
                    Sign up
                  </Link>
                </>
              )}
            </div>
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="mobile-menu">
            <nav className="mobile-menu__links">
              {PRIMARY_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} className="mobile-menu__link">
                  {link.label}
                </NavLink>
              ))}
              <Link to="/emergency" className="mobile-menu__link mobile-menu__link--emergency">
                Emergency
              </Link>
            </nav>
            <div className="mobile-menu__auth">
              {user ? (
                <>
                  <Link to="/account" className="btn btn-secondary btn-block">
                    {user.fullName}
                  </Link>
                  <button className="btn btn-ghost btn-block" onClick={() => logout()}>
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary btn-block">
                    Log in
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-block">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="site-footer__brand">
            <span className="site-logo__mark">MC</span>
            <div>
              <strong>MediConnect</strong>
              <p className="text-muted">Not a substitute for emergency medical care.</p>
            </div>
          </div>
          <nav className="site-footer__links">
            <Link to="/contact">Contact</Link>
            <Link to="/support">Support</Link>
            <Link to="/help">Help</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
          <p className="site-footer__copy">© {CURRENT_YEAR} MediConnect</p>
        </div>
      </footer>
    </div>
  );
}
