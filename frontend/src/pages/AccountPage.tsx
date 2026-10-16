import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { listMyApplications, PROVIDER_TYPE_LABELS } from '../services/providerService';
import type { OwnerProviderApplication } from '../types/provider';
import './AccountPage.css';

const ACTIVITY_LINKS = [
  { to: '/appointments', label: 'Appointments' },
  { to: '/orders', label: 'Medicine orders' },
  { to: '/diagnostic-orders', label: 'Diagnostic tests' },
  { to: '/my-camps', label: 'Health camps' },
  { to: '/medical-records', label: 'Medical record' },
  { to: '/caregiver-invites', label: 'Caregiver invites' },
  { to: '/my-care-requests', label: 'Equipment & home care' },
  { to: '/support', label: 'Support tickets' },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function AccountPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<OwnerProviderApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyApplications()
      .then(setApplications)
      .catch(() => {
        // Non-fatal — the account page still renders without the provider list.
      })
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  return (
    <div className="account-page">
      <div className="card">
        <div className="account-profile">
          <div className="account-profile__avatar">{initials(user.fullName)}</div>
          <div className="account-profile__info">
            <h1>{user.fullName}</h1>
            <p>{user.email}</p>
            {user.phone && <p>{user.phone}</p>}
          </div>
        </div>
        <div className="account-profile__roles">
          {user.roles.map((role) => (
            <span key={role} className="badge badge-verified">
              {role.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      <div className="card account-section">
        <h3>My activity</h3>
        <div className="account-links">
          {ACTIVITY_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="account-links__item">
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="card account-section">
        <h3>Delivery partner</h3>
        {user.roles.includes('delivery_partner') ? (
          <Link to="/my-deliveries" className="btn btn-secondary btn-sm">
            My deliveries
          </Link>
        ) : (
          <Link to="/become-delivery-partner" className="btn btn-secondary btn-sm">
            Become a delivery partner
          </Link>
        )}
      </div>

      <div className="card account-section">
        <h3>Provider applications</h3>
        {loading && <p className="text-muted">Loading…</p>}
        {!loading && applications.length === 0 && (
          <p className="text-muted">You haven't registered as a healthcare provider yet.</p>
        )}
        {!loading && applications.length > 0 && (
          <ul className="account-application-list">
            {applications.map((app) => (
              <li key={app.id}>
                <Link to={`/dashboard/providers/${app.id}`}>
                  {app.organizationName} ({PROVIDER_TYPE_LABELS[app.providerType] ?? app.providerType}) — {app.status}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/become-provider" className="btn btn-secondary btn-sm">
          Register as a provider
        </Link>
      </div>

      {(user.roles.includes('super_admin') || user.roles.includes('support')) && (
        <div className="card account-section">
          <h3>Admin</h3>
          <div className="account-links">
            {user.roles.includes('super_admin') ? (
              <Link to="/admin" className="account-links__item">
                Admin dashboard
              </Link>
            ) : (
              <Link to="/admin/support-tickets" className="account-links__item">
                All support tickets
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
