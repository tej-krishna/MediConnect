import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { useProviderDashboard } from '../pages/provider/ProviderDashboardContext';
import { PROVIDER_TYPE_LABELS } from '../services/providerService';
import './ProviderLayout.css';

export function ProviderLayout() {
  const { user, logout } = useAuth();
  const { application, config, loading, error, message } = useProviderDashboard();

  if (loading) return <div className="page-loading">Loading your dashboard…</div>;
  if (!application) return <div className="page-error">{error ?? 'Application not found.'}</div>;

  const navItems = [
    { to: '', label: 'Overview', end: true },
    ...(config.inventoryLabel ? [{ to: 'inventory', label: config.inventoryLabel, end: false }] : []),
    ...(config.ordersLabel ? [{ to: 'orders', label: config.ordersLabel, end: false }] : []),
    { to: 'reports', label: 'Reports & revenue', end: false },
    { to: 'listing', label: 'Listing settings', end: false },
  ];

  return (
    <div className="provider-shell">
      <header className="provider-shell__header">
        <div className="provider-shell__brand">
          <Link to="/" className="site-logo">
            <span className="site-logo__mark">MC</span>
            MediConnect
          </Link>
          <span className="provider-shell__divider" aria-hidden="true" />
          <div className="provider-shell__org">
            <strong>{application.organizationName}</strong>
            <span className="badge badge-verified">{PROVIDER_TYPE_LABELS[application.providerType] ?? application.providerType}</span>
          </div>
        </div>
        <div className="provider-shell__actions">
          <span className="site-nav__link">{user?.fullName.split(' ')[0]}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </header>

      <div className="provider-shell__body">
        <nav className="provider-shell__sidebar">
          {navItems.map((item) => (
            <NavLink
              key={item.to || 'overview'}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `provider-shell__nav-link${isActive ? ' provider-shell__nav-link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
          <Link to="/" className="provider-shell__exit">
            ← Back to MediConnect
          </Link>
        </nav>

        <main className="provider-shell__content">
          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
