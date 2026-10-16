import { useCallback, useEffect, useState } from 'react';
import { listMyDiagnosticOrders, transitionDiagnosticOrder, downloadDiagnosticReport } from '../services/diagnosticsService';
import { ApiError } from '../services/apiClient';
import type { DiagnosticOrder } from '../types/diagnostics';
import './ProviderDashboardPage.css';

const CANCELLABLE = new Set(['requested', 'scheduled']);

export function MyDiagnosticOrdersPage() {
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setOrders(await listMyDiagnosticOrders());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your test bookings.');
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
      await transitionDiagnosticOrder(id, { action: 'cancel' });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this booking.');
    }
  }

  async function handleDownload(id: string) {
    setError(null);
    try {
      await downloadDiagnosticReport(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not download the report.');
    }
  }

  if (loading) return <div className="page-loading">Loading your test bookings…</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-head"><h1>My diagnostic tests</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      {orders.length === 0 ? (
        <div className="page-empty">You haven't booked any diagnostic tests yet.</div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="card">
            <h3>{order.status.replace(/_/g, ' ')}</h3>
            <ul>
              {order.tests.map((t) => (
                <li key={t.testId}>
                  {t.name} — ₹{t.price}
                </li>
              ))}
            </ul>
            <p>
              <strong>Total:</strong> ₹{order.totalAmount}
            </p>
            <p className="text-muted">
              {order.collectionMethod === 'home_collection' ? 'Home collection' : 'At the lab'} ·{' '}
              {order.confirmedDateTime
                ? new Date(order.confirmedDateTime).toLocaleString()
                : `Requested for ${new Date(order.preferredDateTime).toLocaleString()}`}
            </p>
            {order.status === 'report_ready' && (
              <button className="btn btn-primary" onClick={() => handleDownload(order.id)}>
                Download report
              </button>
            )}
            {CANCELLABLE.has(order.status) && (
              <button className="btn btn-secondary" onClick={() => handleCancel(order.id)} style={{ marginLeft: 8 }}>
                Cancel
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
