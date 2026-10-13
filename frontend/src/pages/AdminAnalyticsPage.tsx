import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../app/AuthContext';
import { getAnalyticsOverview, listCommissionRules, setCommissionRule } from '../services/adminService';
import { ApiError } from '../services/apiClient';
import { PROVIDER_TYPE_LABELS } from '../services/providerService';
import type { AnalyticsOverview, CommissionRule } from '../types/admin';
import './ProviderDashboardPage.css';

const COMMISSIONABLE_TYPES = ['pharmacy', 'diagnostic_lab', 'equipment_provider'];

export function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [draftPercentages, setDraftPercentages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = user?.roles.includes('super_admin');

  const reload = useCallback(async () => {
    try {
      const [overviewData, ruleList] = await Promise.all([getAnalyticsOverview(), listCommissionRules()]);
      setOverview(overviewData);
      setRules(ruleList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) reload();
    else setLoading(false);
  }, [isAdmin, reload]);

  if (!isAdmin) {
    return <div className="page-error">Only platform admins can view platform analytics.</div>;
  }

  async function handleSaveRule(providerType: string) {
    const raw = draftPercentages[providerType];
    if (raw === undefined) return;
    setError(null);
    setMessage(null);
    try {
      await setCommissionRule(providerType, Number(raw));
      setMessage(`Commission rate for ${PROVIDER_TYPE_LABELS[providerType] ?? providerType} updated.`);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update commission rate.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!overview) return <div className="page-error">{error ?? 'Could not load analytics.'}</div>;

  const ruleByType = new Map(rules.map((r) => [r.providerType, r.percentage]));

  return (
    <div className="container dashboard-page">
      <h1>Platform analytics</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <h3>Overview</h3>
        <p>Total users: {overview.totalUsers}</p>
        <p>Active appointments: {overview.bookings.activeAppointments} (cancelled: {overview.bookings.cancelledAppointments})</p>
        <p>Active camp registrations: {overview.bookings.activeCampRegistrations}</p>
        <p>Pending provider applications: {overview.moderation.pendingProviderApplications}</p>
        <p>Flagged providers: {overview.moderation.flaggedProviders}</p>
        <p>Pending delivery partner applications: {overview.moderation.pendingDeliveryPartners}</p>
        <p>Open support tickets: {overview.moderation.openSupportTickets}</p>
      </div>

      <div className="card">
        <h3>Revenue and commission by provider type</h3>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Provider type</th>
              <th>Gross amount</th>
              <th>Order count</th>
              <th>Commission %</th>
              <th>Commission amount</th>
            </tr>
          </thead>
          <tbody>
            {overview.revenue.map((r) => (
              <tr key={r.providerType}>
                <td>{PROVIDER_TYPE_LABELS[r.providerType] ?? r.providerType}</td>
                <td>₹{r.grossAmount}</td>
                <td>{r.orderCount}</td>
                <td>{r.commissionPercentage}%</td>
                <td>₹{r.commissionAmount}</td>
              </tr>
            ))}
            {overview.revenue.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  No revenue-bearing orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Commission rules</h3>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Provider type</th>
              <th>Current rate</th>
              <th>New rate (%)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {COMMISSIONABLE_TYPES.map((type) => (
              <tr key={type}>
                <td>{PROVIDER_TYPE_LABELS[type] ?? type}</td>
                <td>{ruleByType.get(type) ?? 0}%</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    style={{ width: 80 }}
                    defaultValue={ruleByType.get(type) ?? 0}
                    onChange={(e) => setDraftPercentages((prev) => ({ ...prev, [type]: e.target.value }))}
                  />
                </td>
                <td>
                  <button className="btn btn-secondary" onClick={() => handleSaveRule(type)}>
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
