import { useCallback, useEffect, useState } from 'react';
import { listMyCampRegistrations, cancelCampRegistration } from '../services/diagnosticsService';
import { ApiError } from '../services/apiClient';
import './ProviderDashboardPage.css';

export function MyCampRegistrationsPage() {
  const [registrations, setRegistrations] = useState<{ campId: string; registeredAt: string; camp: { title: string; locationDescription: string; scheduledDate: string; startTime: string; endTime: string } | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setRegistrations(await listMyCampRegistrations());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your camp registrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleCancel(campId: string) {
    setError(null);
    try {
      await cancelCampRegistration(campId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this registration.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-head"><h1>My camp registrations</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      {registrations.length === 0 ? (
        <div className="page-empty">You haven't registered for any health camps yet.</div>
      ) : (
        registrations.map((r) => (
          <div key={r.campId} className="card">
            {r.camp ? (
              <>
                <h3>{r.camp.title}</h3>
                <p className="text-muted">{r.camp.locationDescription}</p>
                <p>
                  {new Date(r.camp.scheduledDate).toLocaleDateString()} · {r.camp.startTime}–{r.camp.endTime}
                </p>
              </>
            ) : (
              <p className="text-muted">Camp details unavailable.</p>
            )}
            <button className="btn btn-secondary" onClick={() => handleCancel(r.campId)}>
              Cancel registration
            </button>
          </div>
        ))
      )}
    </div>
  );
}
