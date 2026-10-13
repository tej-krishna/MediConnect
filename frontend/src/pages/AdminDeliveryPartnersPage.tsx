import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../app/AuthContext';
import { listDeliveryPartnerApplications, reviewDeliveryPartner } from '../services/deliveryService';
import { ApiError } from '../services/apiClient';
import type { DeliveryPartnerProfile } from '../types/delivery';
import './ProviderDashboardPage.css';

export function AdminDeliveryPartnersPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<DeliveryPartnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});

  const isAdmin = user?.roles.includes('super_admin');
  const isStaff = isAdmin || user?.roles.includes('support');

  const reload = useCallback(async () => {
    try {
      const { profiles: items } = await listDeliveryPartnerApplications();
      setProfiles(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) reload();
    else setLoading(false);
  }, [isStaff, reload]);

  if (!isStaff) {
    return <div className="page-error">Only support staff or admins can review delivery partner applications.</div>;
  }

  async function handleReview(id: string, action: 'approve' | 'reject' | 'suspend') {
    setError(null);
    const reason = reasonDraft[id]?.trim();
    if (action !== 'approve' && !reason) {
      setError('Enter a reason before rejecting or suspending.');
      return;
    }
    try {
      await reviewDeliveryPartner(id, action, action !== 'approve' ? reason : undefined);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this application.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="container dashboard-page">
      <h1>Delivery partner applications</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <table className="simple-table">
        <thead>
          <tr>
            <th>Phone</th>
            <th>Vehicle</th>
            <th>City</th>
            <th>Status</th>
            <th>Reason (reject/suspend)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id}>
              <td>{p.contactPhone}</td>
              <td>{p.vehicleType.replace(/_/g, ' ')}</td>
              <td>{p.serviceCity}</td>
              <td>{p.status}</td>
              <td>
                {isAdmin && (p.status === 'pending' || p.status === 'approved') && (
                  <input
                    placeholder="Required for reject/suspend"
                    value={reasonDraft[p.id] ?? ''}
                    onChange={(e) => setReasonDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  />
                )}
              </td>
              <td style={{ display: 'flex', gap: 6 }}>
                {isAdmin && p.status === 'pending' && (
                  <>
                    <button className="btn btn-primary" onClick={() => handleReview(p.id, 'approve')}>
                      Approve
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleReview(p.id, 'reject')}>
                      Reject
                    </button>
                  </>
                )}
                {isAdmin && p.status === 'approved' && (
                  <button className="btn btn-secondary" onClick={() => handleReview(p.id, 'suspend')}>
                    Suspend
                  </button>
                )}
                {isAdmin && p.status === 'suspended' && (
                  <button className="btn btn-primary" onClick={() => handleReview(p.id, 'approve')}>
                    Reinstate
                  </button>
                )}
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted">
                No applications yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
