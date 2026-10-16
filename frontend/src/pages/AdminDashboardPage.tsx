import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { getAnalyticsOverview } from '../services/adminService';
import type { AnalyticsOverview } from '../types/admin';
import './ProviderDashboardPage.css';
import './AccountPage.css';
import './AdminDashboardPage.css';

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
      <div className="page-head"><h1>Admin dashboard</h1></div>

      {overview && (
        <div className="admin-stat-row">
          <Link to="/admin/provider-applications" className="admin-stat-tile">
            <span className="admin-stat-tile__value">{overview.moderation.pendingProviderApplications}</span>
            <span className="admin-stat-tile__label">Provider applications pending</span>
          </Link>
          <Link to="/admin/delivery-partners" className="admin-stat-tile">
            <span className="admin-stat-tile__value">{overview.moderation.pendingDeliveryPartners}</span>
            <span className="admin-stat-tile__label">Delivery partners pending</span>
          </Link>
          <Link to="/admin/support-tickets" className="admin-stat-tile">
            <span className="admin-stat-tile__value">{overview.moderation.openSupportTickets}</span>
            <span className="admin-stat-tile__label">Support tickets open</span>
          </Link>
        </div>
      )}

      <div className="card account-section">
        <h3>Verification and moderation</h3>
        <div className="account-links">
          <Link className="account-links__item" to="/admin/provider-applications">
            Provider applications
          </Link>
          <Link className="account-links__item" to="/admin/delivery-partners">
            Delivery partners
          </Link>
          <Link className="account-links__item" to="/admin/support-tickets">
            Support tickets
          </Link>
          <Link className="account-links__item" to="/admin/users">
            Users
          </Link>
          <Link className="account-links__item" to="/admin/emergency-guides">
            Emergency guidance
          </Link>
        </div>
      </div>

      <div className="card account-section">
        <h3>Revenue and operations</h3>
        <div className="account-links">
          <Link className="account-links__item" to="/admin/analytics">
            Analytics & commission
          </Link>
          <Link className="account-links__item" to="/admin/transactions">
            Refund transactions
          </Link>
          <Link className="account-links__item" to="/admin/audit-log">
            Audit log
          </Link>
        </div>
      </div>
    </div>
  );
}
