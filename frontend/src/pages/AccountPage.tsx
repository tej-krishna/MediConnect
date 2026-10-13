import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { listMyApplications, PROVIDER_TYPE_LABELS } from '../services/providerService';
import type { OwnerProviderApplication } from '../types/provider';

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
    <div className="container" style={{ padding: '32px 16px', maxWidth: 560 }}>
      <h1>My account</h1>
      <div className="card">
        <p>
          <strong>Name:</strong> {user.fullName}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        {user.phone && (
          <p>
            <strong>Phone:</strong> {user.phone}
          </p>
        )}
        <p>
          <strong>Account type:</strong> {user.roles.join(', ')}
        </p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>My activity</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/appointments" className="btn btn-secondary">
            Appointments
          </Link>
          <Link to="/orders" className="btn btn-secondary">
            Medicine orders
          </Link>
          <Link to="/diagnostic-orders" className="btn btn-secondary">
            Diagnostic tests
          </Link>
          <Link to="/my-camps" className="btn btn-secondary">
            Health camps
          </Link>
          <Link to="/medical-records" className="btn btn-secondary">
            Medical record
          </Link>
          <Link to="/caregiver-invites" className="btn btn-secondary">
            Caregiver invites
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Provider applications</h3>
        {loading && <p className="text-muted">Loading…</p>}
        {!loading && applications.length === 0 && (
          <p className="text-muted">You haven't registered as a healthcare provider yet.</p>
        )}
        {!loading && applications.length > 0 && (
          <ul style={{ paddingLeft: 18 }}>
            {applications.map((app) => (
              <li key={app.id}>
                <Link to={`/dashboard/providers/${app.id}`}>
                  {app.organizationName} ({PROVIDER_TYPE_LABELS[app.providerType] ?? app.providerType}) — {app.status}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link to="/become-provider" className="btn btn-secondary" style={{ marginTop: 12 }}>
          Register as a provider
        </Link>
      </div>

      {user.roles.includes('super_admin') && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Admin</h3>
          <Link to="/admin/emergency-guides" className="btn btn-secondary">
            Manage emergency guidance
          </Link>
        </div>
      )}
    </div>
  );
}
