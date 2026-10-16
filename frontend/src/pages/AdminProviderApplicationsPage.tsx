import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { listAdminApplications, transitionApplication, PROVIDER_TYPE_LABELS } from '../services/providerService';
import type { TransitionAction } from '../services/providerService';
import { ApiError } from '../services/apiClient';
import type { OwnerProviderApplication } from '../types/provider';
import './ProviderDashboardPage.css';

const NEXT_ACTION: Partial<Record<OwnerProviderApplication['status'], { action: TransitionAction; label: string }>> = {
  submitted: { action: 'start_review', label: 'Start review' },
  under_review: { action: 'approve', label: 'Approve' },
};

export function AdminProviderApplicationsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [applications, setApplications] = useState<OwnerProviderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.roles.includes('super_admin');

  const reload = useCallback(async () => {
    try {
      const { applications: items } = await listAdminApplications({ status: statusFilter || undefined });
      setApplications(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAdmin) reload();
    else setLoading(false);
  }, [isAdmin, reload]);

  if (!isAdmin) {
    return <div className="page-error">Only platform admins can review provider applications.</div>;
  }

  async function handleAction(id: string, action: TransitionAction) {
    setError(null);
    try {
      await transitionApplication(id, action);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this application.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-head"><h1>Provider applications</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="inline-form" style={{ marginBottom: 12 }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      <table className="simple-table">
        <thead>
          <tr>
            <th>Organization</th>
            <th>Type</th>
            <th>Status</th>
            <th>Flagged</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => {
            const next = NEXT_ACTION[app.status];
            return (
              <tr key={app.id}>
                <td>{app.organizationName}</td>
                <td>{PROVIDER_TYPE_LABELS[app.providerType] ?? app.providerType}</td>
                <td>{app.status.replace(/_/g, ' ')}</td>
                <td>{app.flagged ? `Yes (${app.reportCount})` : 'No'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <Link className="btn btn-secondary" to={`/providers/applications/${app.id}/review`}>
                    View / decide
                  </Link>
                  {next && (
                    <button className="btn btn-primary" onClick={() => handleAction(app.id, next.action)}>
                      {next.label}
                    </button>
                  )}
                  {app.status === 'suspended' && (
                    <button className="btn btn-primary" onClick={() => handleAction(app.id, 'reinstate')}>
                      Reinstate
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {applications.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                No applications match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
