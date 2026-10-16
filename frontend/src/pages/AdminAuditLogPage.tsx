import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../app/AuthContext';
import { listAuditLog } from '../services/adminService';
import { ApiError } from '../services/apiClient';
import type { AuditLogEntry } from '../types/admin';
import './ProviderDashboardPage.css';

export function AdminAuditLogPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.roles.includes('super_admin');

  const reload = useCallback(async () => {
    try {
      const { entries: items } = await listAuditLog();
      setEntries(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) reload();
    else setLoading(false);
  }, [isAdmin, reload]);

  if (!isAdmin) {
    return <div className="page-error">Only platform admins can view the audit log.</div>;
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-head"><h1>Audit log</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <table className="simple-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Action</th>
            <th>Target</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{new Date(e.createdAt).toLocaleString()}</td>
              <td>{e.action.replace(/_/g, ' ')}</td>
              <td>
                {e.targetType} ({e.targetId.slice(-6)})
              </td>
              <td>{JSON.stringify(e.metadata)}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted">
                No actions recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
