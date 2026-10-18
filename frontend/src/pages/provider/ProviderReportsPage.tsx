import { useProviderDashboard } from './ProviderDashboardContext';
import { computeProviderStats } from './providerStats';
import '../ProviderDashboardPage.css';

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ');
}

export function ProviderReportsPage() {
  const { application, pharmacyOrders, medicines, labOrders, tests, careRequests, offerings, appointments, slots, camps, consultations } =
    useProviderDashboard();

  if (!application || application.status !== 'approved') return null;

  const stats = computeProviderStats(application, {
    pharmacyOrders,
    medicines,
    labOrders,
    tests,
    careRequests,
    offerings,
    appointments,
    slots,
    camps,
    consultations,
  });

  const breakdown: { status: string; count: number; amount: number | null }[] = (() => {
    switch (application.providerType) {
      case 'pharmacy':
        return Object.values(
          pharmacyOrders.reduce<Record<string, { status: string; count: number; amount: number }>>((acc, o) => {
            acc[o.status] ??= { status: o.status, count: 0, amount: 0 };
            acc[o.status].count += 1;
            acc[o.status].amount += o.totalAmount;
            return acc;
          }, {}),
        );
      case 'diagnostic_lab':
        return Object.values(
          labOrders.reduce<Record<string, { status: string; count: number; amount: number }>>((acc, o) => {
            acc[o.status] ??= { status: o.status, count: 0, amount: 0 };
            acc[o.status].count += 1;
            acc[o.status].amount += o.totalAmount;
            return acc;
          }, {}),
        );
      case 'equipment_provider':
        return Object.values(
          careRequests.reduce<Record<string, { status: string; count: number; amount: number }>>((acc, r) => {
            acc[r.status] ??= { status: r.status, count: 0, amount: 0 };
            acc[r.status].count += 1;
            acc[r.status].amount += r.totalAmount;
            return acc;
          }, {}),
        );
      case 'doctor': {
        const fee = application.consultationFee ?? 0;
        return Object.values(
          consultations.reduce<Record<string, { status: string; count: number; amount: number }>>((acc, c) => {
            acc[c.status] ??= { status: c.status, count: 0, amount: 0 };
            acc[c.status].count += 1;
            if (c.status === 'completed') acc[c.status].amount += fee;
            return acc;
          }, {}),
        );
      }
      case 'hospital': {
        const fee = application.consultationFee ?? 0;
        return Object.values(
          appointments.reduce<Record<string, { status: string; count: number; amount: number }>>((acc, a) => {
            acc[a.status] ??= { status: a.status, count: 0, amount: 0 };
            acc[a.status].count += 1;
            if (a.status === 'completed') acc[a.status].amount += fee;
            return acc;
          }, {}),
        );
      }
      case 'clinic': {
        const fee = application.consultationFee ?? 0;
        const acc: Record<string, { status: string; count: number; amount: number }> = {};
        for (const a of appointments) {
          acc[a.status] ??= { status: a.status, count: 0, amount: 0 };
          acc[a.status].count += 1;
          if (a.status === 'completed') acc[a.status].amount += fee;
        }
        for (const c of consultations) {
          acc[c.status] ??= { status: c.status, count: 0, amount: 0 };
          acc[c.status].count += 1;
          if (c.status === 'completed') acc[c.status].amount += fee;
        }
        return Object.values(acc);
      }
      default:
        return [];
    }
  })();

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <h1>Reports & revenue</h1>
      </div>

      <div className="card">
        <h3>{stats.revenueLabel}</h3>
        {stats.revenue !== null ? <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>{formatCurrency(stats.revenue)}</p> : <p className="text-muted">{stats.note}</p>}
      </div>

      {breakdown.length > 0 && (
        <div className="card">
          <h3>Breakdown by status</h3>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.status}>
                  <td>{titleCase(row.status)}</td>
                  <td>{row.count}</td>
                  <td>{row.amount ? formatCurrency(row.amount) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {application.providerType === 'ambulance_provider' && (
        <div className="card">
          <h3>Availability</h3>
          <p className="text-muted">
            Patients searching for emergency ambulance services see this status. Update it from the Listing settings tab.
          </p>
          <p>
            Currently: <strong>{application.isCurrentlyAvailable ? 'Available' : 'Not available'}</strong>
          </p>
        </div>
      )}

      {['mobile_van_operator', 'ngo_coordinator'].includes(application.providerType) && (
        <div className="card">
          <h3>Camp registrations</h3>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Camp</th>
                <th>Registered</th>
                <th>Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {camps.map((camp) => (
                <tr key={camp.id}>
                  <td>{camp.title}</td>
                  <td>{camp.registeredCount}</td>
                  <td>{camp.capacity}</td>
                  <td>{titleCase(camp.status)}</td>
                </tr>
              ))}
              {camps.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted">
                    No camps scheduled yet.
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
