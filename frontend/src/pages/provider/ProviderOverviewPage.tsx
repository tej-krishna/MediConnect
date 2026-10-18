import { useProviderDashboard } from './ProviderDashboardContext';
import { computeProviderStats } from './providerStats';
import { STATUS_LABELS } from './providerStatusLabels';
import '../ProviderDashboardPage.css';

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function ProviderOverviewPage() {
  const {
    application,
    config,
    documentType,
    setDocumentType,
    file,
    setFile,
    uploading,
    handleUpload,
    handleSubmitForReview,
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
  } = useProviderDashboard();

  if (!application) return null;

  const isApproved = application.status === 'approved';
  const needsVerification = ['draft', 'submitted', 'under_review'].includes(application.status);

  const stats = isApproved
    ? computeProviderStats(application, {
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
      })
    : null;

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <h1>Overview</h1>
      </div>

      <div className="card">
        <h3>Status: {STATUS_LABELS[application.status] ?? application.status}</h3>
        {application.rejectionReason && <p className="text-muted">Reason: {application.rejectionReason}</p>}
        {application.suspensionReason && <p className="text-muted">Reason: {application.suspensionReason}</p>}
      </div>

      {needsVerification && (
        <div className="card">
          <h3>Verification documents</h3>
          <ul>
            {application.documents.map((doc) => (
              <li key={doc.id}>
                {doc.documentType}: {doc.originalFilename}
              </li>
            ))}
          </ul>
          {application.status === 'draft' && (
            <>
              <form onSubmit={handleUpload} className="inline-form">
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="registration_certificate">Registration certificate</option>
                  <option value="medical_license">Medical license</option>
                  <option value="facility_license">Facility license</option>
                  <option value="identity_proof">Identity proof</option>
                </select>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button type="submit" className="btn btn-secondary" disabled={!file || uploading}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </form>
              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={handleSubmitForReview}
                disabled={application.documents.length === 0}
              >
                Submit for review
              </button>
            </>
          )}
        </div>
      )}

      {stats && (
        <div className="provider-kpi-row">
          {config.hasAvailabilityToggle && (
            <div className="provider-kpi-card">
              <div className="provider-kpi-card__label">Availability</div>
              <div className="provider-kpi-card__value">{application.isCurrentlyAvailable ? 'Available' : 'Not available'}</div>
            </div>
          )}
          {stats.revenue !== null && (
            <div className="provider-kpi-card">
              <div className="provider-kpi-card__label">{stats.revenueLabel}</div>
              <div className="provider-kpi-card__value">{formatCurrency(stats.revenue)}</div>
            </div>
          )}
          {stats.openLabel && (
            <div className="provider-kpi-card">
              <div className="provider-kpi-card__label">{stats.openLabel}</div>
              <div className="provider-kpi-card__value">{stats.openCount}</div>
            </div>
          )}
          {stats.totalLabel && (
            <div className="provider-kpi-card">
              <div className="provider-kpi-card__label">{stats.totalLabel}</div>
              <div className="provider-kpi-card__value">{stats.totalCount}</div>
            </div>
          )}
        </div>
      )}

      {stats?.note && (
        <div
          className="alert"
          style={{ marginBottom: 20, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderColor: '#fde68a' }}
        >
          {stats.note}
        </div>
      )}
    </div>
  );
}
