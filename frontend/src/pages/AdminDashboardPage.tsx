import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { getAnalyticsOverview } from '../services/adminService';
import type { AnalyticsOverview } from '../types/admin';
import './ProviderDashboardPage.css';

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);

  const isAdmin = user?.roles.includes('super_admin');

  useEffect(() => {
    if (isAdmin) {
      getAnalyticsOverview()
        .then(setOverview)
        .catch(() => {
          // Non-fatal — the hub still renders with its links without the summary counts.
        });
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return <div className="page-error">Only platform admins can access the admin dashboard.</div>;
  }

  return (
    <div className="container dashboard-page">
      <h1>Admin dashboard</h1>

      <div className="card">
        <h3>Verification and moderation</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/admin/provider-applications">
            Provider applications{overview ? ` (${overview.moderation.pendingProviderApplications} pending)` : ''}
          </Link>
          <Link className="btn btn-secondary" to="/admin/delivery-partners">
            Delivery partners{overview ? ` (${overview.moderation.pendingDeliveryPartners} pending)` : ''}
          </Link>
          <Link className="btn btn-secondary" to="/admin/support-tickets">
            Support tickets{overview ? ` (${overview.moderation.openSupportTickets} open)` : ''}
          </Link>
          <Link className="btn btn-secondary" to="/admin/users">
            Users
          </Link>
          <Link className="btn btn-secondary" to="/admin/emergency-guides">
            Emergency guidance
          </Link>
        </div>
      </div>

      <div className="card">
        <h3>Revenue and operations</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-secondary" to="/admin/analytics">
            Analytics & commission
          </Link>
          <Link className="btn btn-secondary" to="/admin/transactions">
            Refund transactions
          </Link>
          <Link className="btn btn-secondary" to="/admin/audit-log">
            Audit log
          </Link>
        </div>
      </div>
    </div>
  );
}
