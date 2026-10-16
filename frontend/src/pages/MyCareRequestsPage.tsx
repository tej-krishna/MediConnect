import { useCallback, useEffect, useState } from 'react';
import { listMyCareRequests, transitionCareRequest } from '../services/homecareService';
import { ApiError } from '../services/apiClient';
import { OFFERING_TYPE_LABELS } from '../types/homecare';
import type { CareRequest } from '../types/homecare';
import './ProviderDashboardPage.css';

const CANCELLABLE_STATUSES = new Set(['requested', 'confirmed']);

export function MyCareRequestsPage() {
  const [requests, setRequests] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { requests: items } = await listMyCareRequests();
      setRequests(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleCancel(id: string) {
    setError(null);
    try {
      await transitionCareRequest(id, 'cancel');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this request.');
    }
  }

  if (loading) return <div className="page-loading">Loading your requests…</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-head"><h1>My equipment & home-care requests</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      {requests.length === 0 ? (
        <div className="page-empty">You haven't requested any equipment or home-care services yet.</div>
      ) : (
        requests.map((req) => (
          <div key={req.id} className="card">
            <h3>
              {req.offeringNameSnapshot} — {req.status.replace(/_/g, ' ')}
            </h3>
            <p className="text-muted">{OFFERING_TYPE_LABELS[req.offeringType]}</p>
            <p>
              {req.quantity > 1 && `${req.quantity} × `}₹{req.unitPriceSnapshot} = <strong>₹{req.totalAmount}</strong>
            </p>
            <p className="text-muted">
              Address: {req.deliveryAddress.line1}, {req.deliveryAddress.city}
            </p>
            {CANCELLABLE_STATUSES.has(req.status) && (
              <button className="btn btn-secondary" onClick={() => handleCancel(req.id)}>
                Cancel
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
