import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import './MainLayout.css';

const CURRENT_YEAR = new Date().getFullYear();

export function MainLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="site-header">
        <div className="container site-header__inner">
          <Link to="/" className="site-logo">
            MediConnect
          </Link>
          <nav className="site-nav">
            <NavLink to="/providers" className="site-nav__link">
              Find Care
            </NavLink>
            <NavLink to="/medicines" className="site-nav__link">
              Medicines
            </NavLink>
            <NavLink to="/diagnostic-tests" className="site-nav__link">
              Tests
            </NavLink>
            <NavLink to="/health-camps" className="site-nav__link">
              Camps
            </NavLink>
            {user ? (
              <>
                <NavLink to="/account" className="site-nav__link">
                  {user.fullName.split(' ')[0]}
                </NavLink>
                <button className="btn btn-secondary" onClick={() => logout()}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="site-nav__link">
                  Log in
                </NavLink>
                <Link to="/register" className="btn btn-primary">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <p className="text-muted">© {CURRENT_YEAR} MediConnect. Not a substitute for emergency medical care.</p>
          <nav className="site-footer__links">
            <Link to="/contact">Contact</Link>
            <Link to="/help">Help</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
