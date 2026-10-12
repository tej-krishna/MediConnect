import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  getMyApplication,
  uploadDocument,
  submitApplication,
  updateListingInfo,
  PROVIDER_TYPE_LABELS,
} from '../services/providerService';
import {
  createSlot,
  listProviderSlots,
  cancelSlot,
  listProviderAppointments,
} from '../services/schedulingService';
import { ApiError } from '../services/apiClient';
import type { OwnerProviderApplication } from '../types/provider';
import type { Slot, Appointment } from '../types/scheduling';
import './ProviderDashboardPage.css';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft — add documents and submit for review',
  submitted: 'Submitted — waiting for review to begin',
  under_review: 'Under review',
  approved: 'Approved and verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
  expired: 'Verification expired',
};

export function ProviderDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<OwnerProviderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState('registration_certificate');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [fee, setFee] = useState('');
  const [hoursNote, setHoursNote] = useState('');
  const [savingListing, setSavingListing] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [slotCapacity, setSlotCapacity] = useState('1');
  const [creatingSlot, setCreatingSlot] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const app = await getMyApplication(id);
      setApplication(app);
      setFee(app.consultationFee !== null ? String(app.consultationFee) : '');
      setHoursNote(app.operatingHoursNote ?? '');
      if (app.status === 'approved') {
        const [slotList, appointmentList] = await Promise.all([
          listProviderSlots(id),
          listProviderAppointments(id),
        ]);
        setSlots(slotList);
        setAppointments(appointmentList);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this application.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!id || !file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadDocument(id, documentType, file);
      setFile(null);
      setMessage('Document uploaded.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitForReview() {
    if (!id) return;
    setError(null);
    try {
      await submitApplication(id);
      setMessage('Application submitted for review.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit.');
    }
  }

  async function handleSaveListing(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSavingListing(true);
    setError(null);
    try {
      await updateListingInfo(id, {
        consultationFee: fee ? Number(fee) : undefined,
        operatingHoursNote: hoursNote || undefined,
      });
      setMessage('Listing details updated.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSavingListing(false);
    }
  }

  async function handleCreateSlot(e: FormEvent) {
    e.preventDefault();
    if (!id || !slotDate || !slotStart || !slotEnd) return;
    setCreatingSlot(true);
    setError(null);
    try {
      await createSlot(id, {
        startTime: new Date(`${slotDate}T${slotStart}`).toISOString(),
        endTime: new Date(`${slotDate}T${slotEnd}`).toISOString(),
        capacity: Number(slotCapacity) || 1,
      });
      setMessage('Slot created.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create slot.');
    } finally {
      setCreatingSlot(false);
    }
  }

  async function handleCancelSlot(slotId: string) {
    if (!id) return;
    setError(null);
    try {
      await cancelSlot(id, slotId);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel slot.');
    }
  }

  if (loading) return <div className="page-loading">Loading dashboard…</div>;
  if (!application) return <div className="page-error">{error ?? 'Application not found.'}</div>;

  return (
    <div className="container dashboard-page">
      <h1>{application.organizationName}</h1>
      <p className="text-muted">{PROVIDER_TYPE_LABELS[application.providerType] ?? application.providerType}</p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <h3>Status: {STATUS_LABELS[application.status] ?? application.status}</h3>
        {application.rejectionReason && <p className="text-muted">Reason: {application.rejectionReason}</p>}
        {application.suspensionReason && <p className="text-muted">Reason: {application.suspensionReason}</p>}
      </div>

      {(application.status === 'draft' || application.status === 'submitted' || application.status === 'under_review') && (
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

      {application.status === 'approved' && (
        <>
          <div className="card">
            <h3>Listing details</h3>
            <form onSubmit={handleSaveListing} className="inline-form">
              <div className="form-field">
                <label htmlFor="fee">Consultation fee (₹)</label>
                <input id="fee" type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="hoursNote">Operating hours</label>
                <input id="hoursNote" value={hoursNote} onChange={(e) => setHoursNote(e.target.value)} placeholder="e.g. Mon-Sat 9am-8pm" />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={savingListing}>
                {savingListing ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Appointment slots</h3>
            <form onSubmit={handleCreateSlot} className="inline-form">
              <div className="form-field">
                <label htmlFor="slotDate">Date</label>
                <input id="slotDate" type="date" required value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="slotStart">Start time</label>
                <input id="slotStart" type="time" required value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="slotEnd">End time</label>
                <input id="slotEnd" type="time" required value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="slotCapacity">Capacity</label>
                <input
                  id="slotCapacity"
                  type="number"
                  min={1}
                  style={{ width: 70 }}
                  value={slotCapacity}
                  onChange={(e) => setSlotCapacity(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={creatingSlot}>
                {creatingSlot ? 'Adding…' : 'Add slot'}
              </button>
            </form>

            <table className="simple-table">
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th>Booked</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <td>{new Date(slot.startTime).toLocaleString()}</td>
                    <td>{new Date(slot.endTime).toLocaleTimeString()}</td>
                    <td>
                      {slot.bookedCount}/{slot.capacity}
                    </td>
                    <td>{slot.status}</td>
                    <td>
                      {slot.status === 'open' && (
                        <button className="btn btn-secondary" onClick={() => handleCancelSlot(slot.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {slots.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      No slots yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}
