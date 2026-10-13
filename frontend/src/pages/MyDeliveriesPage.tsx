import { useCallback, useEffect, useState } from 'react';
import { listMyDeliveries, transitionOrder } from '../services/pharmacyService';
import { ApiError } from '../services/apiClient';
import type { Order } from '../types/pharmacy';
import './ProviderDashboardPage.css';

export function MyDeliveriesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setOrders(await listMyDeliveries());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your deliveries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleConfirmDelivery(id: string) {
    setError(null);
    try {
      await transitionOrder(id, 'deliver');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not confirm delivery.');
    }
  }

  if (loading) return <div className="page-loading">Loading your deliveries…</div>;

  return (
    <div className="container dashboard-page">
      <h1>My deliveries</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {orders.length === 0 ? (
        <div className="page-empty">No deliveries have been assigned to you yet.</div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="card">
            <h3>Order — {order.status.replace(/_/g, ' ')}</h3>
            <ul>
              {order.items.map((item) => (
                <li key={item.medicineItemId}>
                  {item.name} × {item.quantity}
                </li>
              ))}
            </ul>
            <p className="text-muted">
              Deliver to: {order.deliveryAddress.line1}, {order.deliveryAddress.city}
            </p>
            {order.status === 'out_for_delivery' && (
              <button className="btn btn-primary" onClick={() => handleConfirmDelivery(order.id)}>
                Confirm delivered
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
