import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { listAllTickets } from '../services/supportService';
import { ApiError } from '../services/apiClient';
import { TICKET_CATEGORY_LABELS } from '../types/support';
import type { SupportTicket } from '../types/support';
import './ProviderDashboardPage.css';

export function AdminSupportTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isStaff = user?.roles.includes('support') || user?.roles.includes('super_admin');

  const reload = useCallback(async () => {
    try {
      const { tickets: items } = await listAllTickets();
      setTickets(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStaff) reload();
    else setLoading(false);
  }, [isStaff, reload]);

  if (!isStaff) {
    return <div className="page-error">Only support staff or admins can view all tickets.</div>;
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="container dashboard-page">
      <h1>All support tickets</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <table className="simple-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Category</th>
            <th>Status</th>
            <th>Assigned</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>
                <Link to={`/support/${t.id}`}>{t.subject}</Link>
              </td>
              <td>{TICKET_CATEGORY_LABELS[t.category]}</td>
              <td>{t.status.replace(/_/g, ' ')}</td>
              <td>{t.assignedTo ? 'Yes' : 'Unassigned'}</td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted">
                No tickets yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
