import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import {
  getMyApplication,
  transitionApplication,
  downloadDocument,
  PROVIDER_TYPE_LABELS,
} from '../services/providerService';
import type { TransitionAction } from '../services/providerService';
import { ApiError } from '../services/apiClient';
import type { OwnerProviderApplication } from '../types/provider';
import './ProviderDashboardPage.css';

export function AdminProviderApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [application, setApplication] = useState<OwnerProviderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const isAdmin = user?.roles.includes('super_admin');

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      setApplication(await getMyApplication(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this application.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAdmin) reload();
    else setLoading(false);
  }, [isAdmin, reload]);

  if (!isAdmin) {
    return <div className="page-error">Only platform admins can review provider applications.</div>;
  }

  async function handleAction(action: TransitionAction) {
    if (!id) return;
    setError(null);
    if ((action === 'reject' || action === 'suspend') && !reason.trim()) {
      setError('Enter a reason before rejecting or suspending.');
      return;
    }
    try {
      await transitionApplication(id, action, action === 'reject' || action === 'suspend' ? reason.trim() : undefined);
      setReason('');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this application.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!application) return <div className="page-error">{error ?? 'Application not found.'}</div>;

  return (
    <div className="container dashboard-page">
      <h1>{application.organizationName}</h1>
      <p className="text-muted">
        {PROVIDER_TYPE_LABELS[application.providerType] ?? application.providerType} — {application.status.replace(/_/g, ' ')}
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      {application.flagged && (
        <div className="alert alert-error">
          Flagged ({application.reportCount} report{application.reportCount === 1 ? '' : 's'}): {application.flagReasons.join('; ')}
        </div>
      )}

      <div className="card">
        <h3>Details</h3>
        <p>Registration number: {application.registrationNumber}</p>
        <p>Issuing authority: {application.issuingAuthority}</p>
        <p>Contact: {application.contactPhone} · {application.contactEmail}</p>
        <p>
          Address: {application.address.line1}, {application.address.city}, {application.address.state} {application.address.postalCode}
        </p>
        {application.rejectionReason && <p>Rejection reason: {application.rejectionReason}</p>}
        {application.suspensionReason && <p>Suspension reason: {application.suspensionReason}</p>}
      </div>

      <div className="card">
        <h3>Verification documents</h3>
        <ul>
          {application.documents.map((doc) => (
            <li key={doc.id}>
              {doc.documentType}: {doc.originalFilename}{' '}
              <button className="btn btn-secondary" onClick={() => downloadDocument(application.id, doc.id)}>
                Download
              </button>
            </li>
          ))}
          {application.documents.length === 0 && <li className="text-muted">No documents uploaded.</li>}
        </ul>
      </div>

      <div className="card">
        <h3>Decision</h3>
        {(application.status === 'under_review' || application.status === 'approved') && (
          <div className="form-field" style={{ maxWidth: 420 }}>
            <label htmlFor="reason">Reason (required for reject/suspend)</label>
            <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {application.status === 'submitted' && (
            <button className="btn btn-primary" onClick={() => handleAction('start_review')}>
              Start review
            </button>
          )}
          {application.status === 'under_review' && (
            <>
              <button className="btn btn-primary" onClick={() => handleAction('approve')}>
                Approve
              </button>
              <button className="btn btn-secondary" onClick={() => handleAction('reject')}>
                Reject
              </button>
            </>
          )}
          {application.status === 'approved' && (
            <button className="btn btn-secondary" onClick={() => handleAction('suspend')}>
              Suspend
            </button>
          )}
          {application.status === 'suspended' && (
            <button className="btn btn-primary" onClick={() => handleAction('reinstate')}>
              Reinstate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
