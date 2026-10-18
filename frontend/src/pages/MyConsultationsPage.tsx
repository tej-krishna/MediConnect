import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyConsultations, cancelConsultation, reportNoShow } from '../services/consultationService';
import { ApiError } from '../services/apiClient';
import type { Consultation } from '../types/scheduling';
import './ProviderDashboardPage.css';

const CANCELLABLE_STATUSES = new Set(['requested', 'confirmed']);

function canReportNoShow(c: Consultation): boolean {
  return c.status === 'confirmed' && !!c.confirmedDateTime && new Date(c.confirmedDateTime).getTime() < Date.now();
}

export function MyConsultationsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setConsultations(await listMyConsultations());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your consultations.');
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
      await cancelConsultation(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this request.');
    }
  }

  async function handleReportNoShow(id: string) {
    setError(null);
    try {
      await reportNoShow(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not report this.');
    }
  }

  if (loading) return <div className="page-loading">Loading your consultations…</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-head">
        <h1>My consultations</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {consultations.length === 0 ? (
        <div className="page-empty">
          You haven't requested any online or home-visit consultations yet. Find a doctor who
          accepts them from the <Link to="/providers?providerType=doctor">Find care</Link> page.
        </div>
      ) : (
        <table className="simple-table">
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Type</th>
              <th>Preferred</th>
              <th>Confirmed</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {consultations.map((c) => (
              <tr key={c.id}>
                <td>{c.doctor?.organizationName ?? 'Doctor'}</td>
                <td>{c.visitType === 'online' ? 'Online' : 'Home visit'}</td>
                <td>{new Date(c.preferredDateTime).toLocaleString()}</td>
                <td>{c.confirmedDateTime ? new Date(c.confirmedDateTime).toLocaleString() : '—'}</td>
                <td>{c.status.replace(/_/g, ' ')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {c.status === 'confirmed' && c.visitType === 'online' && (
                      <Link to={`/consultations/${c.id}/call`} className="btn btn-primary btn-sm">
                        Join call
                      </Link>
                    )}
                    {c.status === 'confirmed' && c.visitType === 'home_visit' && (
                      <Link to={`/consultations/${c.id}/check-in`} className="btn btn-primary btn-sm">
                        I'm here
                      </Link>
                    )}
                    {CANCELLABLE_STATUSES.has(c.status) && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleCancel(c.id)}>
                        Cancel
                      </button>
                    )}
                    {canReportNoShow(c) && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleReportNoShow(c.id)}>
                        Doctor didn't show up
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
