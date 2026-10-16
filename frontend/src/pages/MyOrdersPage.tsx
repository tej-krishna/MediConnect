import { useCallback, useEffect, useState } from 'react';
import { listMyOrders, transitionOrder } from '../services/pharmacyService';
import { ApiError } from '../services/apiClient';
import type { Order } from '../types/pharmacy';
import './ProviderDashboardPage.css';

const CANCELLABLE_STATUSES = new Set(['pending_prescription', 'placed', 'confirmed']);

export function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setOrders(await listMyOrders());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your orders.');
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
      await transitionOrder(id, 'cancel');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this order.');
    }
  }

  if (loading) return <div className="page-loading">Loading your orders…</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-head"><h1>My orders</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      {orders.length === 0 ? (
        <div className="page-empty">You haven't placed any medicine orders yet.</div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="card">
            <h3>Order — {order.status.replace(/_/g, ' ')}</h3>
            <ul>
              {order.items.map((item) => (
                <li key={item.medicineItemId}>
                  {item.name} × {item.quantity} — ₹{item.unitPrice * item.quantity}
                </li>
              ))}
            </ul>
            <p>
              <strong>Total:</strong> ₹{order.totalAmount}
            </p>
            <p className="text-muted">
              Deliver to: {order.deliveryAddress.line1}, {order.deliveryAddress.city}
            </p>
            {order.status === 'pending_prescription' && (
              <p className="alert alert-error">Waiting for a prescription upload to proceed.</p>
            )}
            {CANCELLABLE_STATUSES.has(order.status) && (
              <button className="btn btn-secondary" onClick={() => handleCancel(order.id)}>
                Cancel order
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
