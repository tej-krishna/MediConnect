import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listInvitesToMe, acceptInvite, declineInvite } from '../services/medicalRecordsService';
import { ApiError } from '../services/apiClient';
import type { CaregiverGrant } from '../types/medicalRecords';
import './ProviderDashboardPage.css';

export function CaregiverInvitesPage() {
  const [grants, setGrants] = useState<CaregiverGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setGrants(await listInvitesToMe());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load invites.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleAccept(id: string) {
    setError(null);
    try {
      await acceptInvite(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept invite.');
    }
  }

  async function handleDecline(id: string) {
    setError(null);
    try {
      await declineInvite(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not decline invite.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  const pending = grants.filter((g) => g.status === 'pending');
  const active = grants.filter((g) => g.status === 'active');

  return (
    <div className="container dashboard-page">
      <div className="page-head"><h1>Caregiver invites</h1></div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Pending invites</h3>
        {pending.length === 0 && <p className="text-muted">No pending invites.</p>}
        {pending.map((grant) => (
          <div key={grant.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
            <p>Scopes requested: {grant.scopes.join(', ')}</p>
            <button className="btn btn-primary" onClick={() => handleAccept(grant.id)}>
              Accept
            </button>
            <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => handleDecline(grant.id)}>
              Decline
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Records you can access</h3>
        {active.length === 0 && <p className="text-muted">You don't have access to anyone else's records yet.</p>}
        {active.map((grant) => (
          <div key={grant.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-muted">Scopes: {grant.scopes.join(', ')}</p>
            <Link className="btn btn-secondary" to={`/medical-records/${grant.patientId}`}>
              View record
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
