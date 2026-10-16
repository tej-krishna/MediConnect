import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getProfile,
  updateProfile,
  listDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  listVisits,
  createVisit,
  deleteVisit,
  listAccessLog,
  inviteCaregiver,
  listMyGrants,
  revokeGrant,
} from '../services/medicalRecordsService';
import { ApiError } from '../services/apiClient';
import type { MedicalProfile, MedicalDocument, VisitRecord, AccessLogEntry, CaregiverGrant, AccessScope } from '../types/medicalRecords';
import './ProviderDashboardPage.css';

const ALL_SCOPES: AccessScope[] = ['view_profile', 'view_documents', 'view_visits', 'manage_profile'];
const SCOPE_LABELS: Record<AccessScope, string> = {
  view_profile: 'View profile',
  view_documents: 'View documents',
  view_visits: 'View visit history',
  manage_profile: 'Edit profile, documents & visits',
};

export function MedicalRecordPage() {
  const params = useParams<{ patientId?: string }>();
  const patientId = params.patientId ?? 'me';
  const isSelf = patientId === 'me';

  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [profileForbidden, setProfileForbidden] = useState(false);
  const [bloodType, setBloodType] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [documentsForbidden, setDocumentsForbidden] = useState(false);
  const [docType, setDocType] = useState('other');
  const [docTitle, setDocTitle] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [visitsForbidden, setVisitsForbidden] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitReason, setVisitReason] = useState('');
  const [addingVisit, setAddingVisit] = useState(false);

  const [accessLog, setAccessLog] = useState<AccessLogEntry[] | null>(null);
  const [grants, setGrants] = useState<CaregiverGrant[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteScopes, setInviteScopes] = useState<Set<AccessScope>>(new Set(['view_profile']));
  const [inviting, setInviting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setError(null);
    const results = await Promise.allSettled([
      getProfile(patientId),
      listDocuments(patientId),
      listVisits(patientId),
    ]);

    if (results[0].status === 'fulfilled') {
      setProfile(results[0].value);
      if (results[0].value) {
        setBloodType(results[0].value.bloodType ?? '');
        setAllergies(results[0].value.allergies.join(', '));
        setConditions(results[0].value.chronicConditions.join(', '));
        setMedications(results[0].value.currentMedications.join(', '));
      }
    } else {
      setProfileForbidden(true);
    }

    if (results[1].status === 'fulfilled') setDocuments(results[1].value);
    else setDocumentsForbidden(true);

    if (results[2].status === 'fulfilled') setVisits(results[2].value);
    else setVisitsForbidden(true);

    if (isSelf) {
      try {
        setAccessLog(await listAccessLog(patientId));
        setGrants(await listMyGrants());
      } catch {
        // Non-fatal — the rest of the page still works.
      }
    }

    setLoading(false);
  }, [patientId, isSelf]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      await updateProfile(patientId, {
        bloodType: bloodType || undefined,
        allergies: allergies ? allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        chronicConditions: conditions ? conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
        currentMedications: medications ? medications.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      setMessage('Profile saved.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!docFile || !docTitle) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(patientId, { documentType: docType, title: docTitle }, docFile);
      setDocTitle('');
      setDocFile(null);
      setMessage('Document uploaded.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload document.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(id: string) {
    setError(null);
    try {
      await deleteDocument(patientId, id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete document.');
    }
  }

  async function handleAddVisit(e: FormEvent) {
    e.preventDefault();
    if (!visitDate || !visitReason) return;
    setAddingVisit(true);
    setError(null);
    try {
      await createVisit(patientId, { visitDate, reasonForVisit: visitReason });
      setVisitDate('');
      setVisitReason('');
      setMessage('Visit added.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add visit.');
    } finally {
      setAddingVisit(false);
    }
  }

  async function handleDeleteVisit(id: string) {
    setError(null);
    try {
      await deleteVisit(patientId, id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete visit.');
    }
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    try {
      await inviteCaregiver({ caregiverEmail: inviteEmail, scopes: [...inviteScopes] });
      setInviteEmail('');
      setMessage('Invite sent.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send invite.');
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(grantId: string) {
    setError(null);
    try {
      await revokeGrant(grantId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke access.');
    }
  }

  function toggleScope(scope: AccessScope) {
    setInviteScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  if (loading) return <div className="page-loading">Loading medical record…</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-head">
        <h1>{isSelf ? 'My medical record' : 'Medical record'}</h1>
        {!isSelf && <p className="text-muted">You're viewing this record as an authorized caregiver.</p>}
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <h3>Profile</h3>
        {profile && <p className="text-muted" style={{ fontSize: '0.8rem' }}>Last updated {new Date(profile.updatedAt).toLocaleString()}</p>}
        {profileForbidden ? (
          <p className="text-muted">You don't have permission to view this profile.</p>
        ) : (
          <form onSubmit={handleSaveProfile} className="inline-form">
            <div className="form-field">
              <label htmlFor="bloodType">Blood type</label>
              <input id="bloodType" style={{ width: 80 }} value={bloodType} onChange={(e) => setBloodType(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="allergies">Allergies (comma-separated)</label>
              <input id="allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="conditions">Chronic conditions</label>
              <input id="conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="medications">Current medications</label>
              <input id="medications" value={medications} onChange={(e) => setMedications(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h3>Documents</h3>
        {documentsForbidden ? (
          <p className="text-muted">You don't have permission to view documents.</p>
        ) : (
          <>
            <form onSubmit={handleUpload} className="inline-form">
              <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="prescription">Prescription</option>
                <option value="diagnostic_report">Diagnostic report</option>
                <option value="discharge_summary">Discharge summary</option>
                <option value="other">Other</option>
              </select>
              <input placeholder="Title" required value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
              <button type="submit" className="btn btn-secondary" disabled={!docFile || uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.title}</td>
                    <td>{doc.documentType.replace(/_/g, ' ')}</td>
                    <td>
                      <button className="btn btn-secondary" onClick={() => downloadDocument(patientId, doc.id)}>
                        Download
                      </button>
                      {isSelf && (
                        <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => handleDeleteDocument(doc.id)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-muted">
                      No documents yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="card">
        <h3>Visit history</h3>
        {visitsForbidden ? (
          <p className="text-muted">You don't have permission to view visit history.</p>
        ) : (
          <>
            <form onSubmit={handleAddVisit} className="inline-form">
              <input type="date" required value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              <input placeholder="Reason for visit" required value={visitReason} onChange={(e) => setVisitReason(e.target.value)} />
              <button type="submit" className="btn btn-secondary" disabled={addingVisit}>
                {addingVisit ? 'Adding…' : 'Add visit'}
              </button>
            </form>
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td>{new Date(visit.visitDate).toLocaleDateString()}</td>
                    <td>{visit.reasonForVisit}</td>
                    <td>
                      {isSelf && (
                        <button className="btn btn-secondary" onClick={() => handleDeleteVisit(visit.id)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {visits.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-muted">
                      No visits logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {isSelf && (
        <>
          <div className="card">
            <h3>Caregiver access</h3>
            <p className="text-muted">Invite someone to view or help manage your records.</p>
            <form onSubmit={handleInvite} className="inline-form">
              <input type="email" placeholder="Caregiver's email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </form>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '8px 0' }}>
              {ALL_SCOPES.map((scope) => (
                <label key={scope} style={{ fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={inviteScopes.has(scope)} onChange={() => toggleScope(scope)} /> {SCOPE_LABELS[scope]}
                </label>
              ))}
            </div>
            <button type="button" className="btn btn-primary" disabled={!inviteEmail || inviting} onClick={handleInvite}>
              {inviting ? 'Sending…' : 'Send invite'}
            </button>

            <table className="simple-table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Scopes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.id}>
                    <td>{grant.status}</td>
                    <td>{grant.scopes.join(', ')}</td>
                    <td>
                      {grant.status === 'active' && (
                        <button className="btn btn-secondary" onClick={() => handleRevoke(grant.id)}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {grants.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-muted">
                      No one has access to your records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Who has accessed your records</h3>
            <table className="simple-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {accessLog?.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.timestamp).toLocaleString()}</td>
                    <td>{entry.action.replace(/_/g, ' ')}</td>
                  </tr>
                ))}
                {(!accessLog || accessLog.length === 0) && (
                  <tr>
                    <td colSpan={2} className="text-muted">
                      No caregiver has accessed your records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-muted" style={{ marginTop: 12 }}>
            <Link to="/caregiver-invites">View invites where you've been asked to be someone's caregiver</Link>
          </p>
        </>
      )}
    </div>
  );
}
