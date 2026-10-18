import { useProviderDashboard } from './ProviderDashboardContext';
import type { OrderStatus } from '../../types/pharmacy';
import type { DiagnosticOrderStatus } from '../../types/diagnostics';
import type { CareRequest } from '../../types/homecare';
import '../ProviderDashboardPage.css';

const NEXT_ORDER_ACTION: Partial<Record<OrderStatus, { action: string; label: string }>> = {
  placed: { action: 'confirm', label: 'Confirm' },
  confirmed: { action: 'start_preparing', label: 'Start preparing' },
  preparing: { action: 'out_for_delivery', label: 'Out for delivery' },
  out_for_delivery: { action: 'deliver', label: 'Mark delivered' },
};

const NEXT_DIAGNOSTIC_ACTION: Partial<Record<DiagnosticOrderStatus, { action: string; label: string }>> = {
  requested: { action: 'schedule', label: 'Schedule' },
  scheduled: { action: 'mark_collected', label: 'Mark sample collected' },
  sample_collected: { action: 'start_processing', label: 'Start processing' },
};

function getNextCareRequestAction(req: CareRequest): { action: string; label: string } | null {
  if (req.status === 'requested') return { action: 'confirm', label: 'Confirm' };
  if (req.status === 'confirmed') return { action: 'fulfill', label: 'Mark fulfilled' };
  if (req.status === 'fulfilled') {
    return req.offeringType === 'equipment_rental'
      ? { action: 'mark_returned', label: 'Mark returned' }
      : { action: 'mark_completed', label: 'Mark completed' };
  }
  return null;
}

export function ProviderOrdersPage() {
  const {
    application,
    pharmacyOrders,
    deliveryDirectory,
    selectedDeliveryPartner,
    setSelectedDeliveryPartner,
    handleOrderAction,
    handleAssignDeliveryPartner,

    labOrders,
    scheduleDateTimes,
    setScheduleDateTimes,
    handleDiagnosticAction,
    handleReportUpload,

    appointments,

    careRequests,
    handleCareRequestAction,
  } = useProviderDashboard();

  if (!application || application.status !== 'approved') return null;
  const providerType = application.providerType;

  return (
    <div className="dashboard-page">
      {providerType === 'pharmacy' && (
        <div className="card">
          <h3>Orders</h3>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Delivery partner</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pharmacyOrders.map((order) => {
                const next = NEXT_ORDER_ACTION[order.status];
                const canAssign = ['confirmed', 'preparing', 'out_for_delivery'].includes(order.status);
                return (
                  <tr key={order.id}>
                    <td>{order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}</td>
                    <td>₹{order.totalAmount}</td>
                    <td>{order.status.replace(/_/g, ' ')}</td>
                    <td>
                      {canAssign ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <select
                            value={selectedDeliveryPartner[order.id] ?? order.assignedDeliveryPartnerId ?? ''}
                            onChange={(e) => setSelectedDeliveryPartner((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          >
                            <option value="">Choose…</option>
                            {deliveryDirectory.map((dp) => (
                              <option key={dp.userId} value={dp.userId}>
                                {dp.fullName} ({dp.serviceCity})
                              </option>
                            ))}
                          </select>
                          <button className="btn btn-secondary" onClick={() => handleAssignDeliveryPartner(order.id)}>
                            Assign
                          </button>
                        </div>
                      ) : order.assignedDeliveryPartnerId ? (
                        'Assigned'
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {next && (
                        <button className="btn btn-secondary" onClick={() => handleOrderAction(order.id, next.action)}>
                          {next.label}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pharmacyOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {providerType === 'diagnostic_lab' && (
        <div className="card">
          <h3>Test bookings</h3>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Tests</th>
                <th>Method</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {labOrders.map((order) => {
                const next = NEXT_DIAGNOSTIC_ACTION[order.status];
                return (
                  <tr key={order.id}>
                    <td>{order.tests.map((t) => t.name).join(', ')}</td>
                    <td>{order.collectionMethod === 'home_collection' ? 'Home' : 'At lab'}</td>
                    <td>{order.status.replace(/_/g, ' ')}</td>
                    <td>
                      {next && next.action === 'schedule' && (
                        <input
                          type="datetime-local"
                          style={{ marginRight: 8 }}
                          value={scheduleDateTimes[order.id] ?? ''}
                          onChange={(e) => setScheduleDateTimes((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        />
                      )}
                      {next && (
                        <button className="btn btn-secondary" onClick={() => handleDiagnosticAction(order.id, next.action, order.preferredDateTime)}>
                          {next.label}
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          style={{ marginLeft: 8, maxWidth: 160, display: 'inline-block' }}
                          onChange={(e) => handleReportUpload(order.id, e.target.files?.[0] ?? null)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              {labOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted">
                    No bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {providerType === 'equipment_provider' && (
        <div className="card">
          <h3>Requests</h3>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Offering</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {careRequests.map((req) => {
                const next = getNextCareRequestAction(req);
                return (
                  <tr key={req.id}>
                    <td>{req.offeringNameSnapshot}</td>
                    <td>{req.quantity}</td>
                    <td>₹{req.totalAmount}</td>
                    <td>{req.status.replace(/_/g, ' ')}</td>
                    <td>
                      {next && (
                        <button className="btn btn-secondary" onClick={() => handleCareRequestAction(req.id, next.action)}>
                          {next.label}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {careRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {['hospital', 'clinic'].includes(providerType) && (
        <div className="card">
          <h3>Appointments</h3>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Booked at</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id}>
                  <td>{new Date(appt.bookedAt).toLocaleString()}</td>
                  <td>{appt.status}</td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-muted">
                    No appointments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
