import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getConsultation, checkIn } from '../services/consultationService';
import { ApiError } from '../services/apiClient';
import { useGeolocation } from '../hooks/useGeolocation';
import type { Consultation } from '../types/scheduling';
import './ProviderDashboardPage.css';

/** Shared by both sides of a home visit — a patient and a doctor/staff member both land here from
 * their own "I'm here" / "Check in" link and tap the same button; the backend only moves the visit
 * forward once both check-ins land within 30m of each other (see consultation.service.ts's
 * checkIn / HOME_VISIT_CHECK_IN_RADIUS_METERS). */
export function ConsultationCheckInPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ distanceMeters: number | null; withinRange: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const geo = useGeolocation();

  useEffect(() => {
    if (!id) return;
    getConsultation(id)
      .then(setConsultation)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this consultation.'));
  }, [id]);

  useEffect(() => {
    if (geo.status !== 'granted' || !geo.coords || !id || submitting) return;
    setSubmitting(true);
    checkIn(id, geo.coords)
      .then((res) => {
        setResult({ distanceMeters: res.distanceMeters, withinRange: res.withinRange });
        setConsultation(res.consultation);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not check in.'))
      .finally(() => {
        setSubmitting(false);
        geo.reset();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.coords, id]);

  if (!consultation) {
    return <div className="container dashboard-page">{error ? <div className="alert alert-error">{error}</div> : <p>Loading…</p>}</div>;
  }

  return (
    <div className="container dashboard-page">
      <div className="page-head">
        <h1>Home visit check-in</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>{consultation.homeVisitAddress?.line1}</h3>
        <p className="text-muted">
          {consultation.homeVisitAddress?.city}, {consultation.homeVisitAddress?.state}{' '}
          {consultation.homeVisitAddress?.postalCode}
        </p>
        <p>
          Scheduled:{' '}
          {consultation.confirmedDateTime ? new Date(consultation.confirmedDateTime).toLocaleString() : '—'}
        </p>

        <button
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          disabled={geo.status === 'requesting' || submitting}
          onClick={() => geo.requestLocation()}
        >
          {geo.status === 'requesting' || submitting ? 'Checking…' : "I'm here"}
        </button>

        {geo.status === 'denied' && (
          <p className="text-muted" style={{ marginTop: 8 }}>
            Location access was denied — allow location for this site to check in.
          </p>
        )}
        {geo.status === 'unavailable' && (
          <p className="text-muted" style={{ marginTop: 8 }}>
            This device/browser doesn't support location sharing.
          </p>
        )}

        {result && (
          <div className="alert" style={{ marginTop: 12, background: result.withinRange ? 'var(--color-success-bg)' : 'var(--color-warning-bg)' }}>
            {result.distanceMeters === null
              ? 'Waiting for the other side to check in too…'
              : result.withinRange
                ? `You're ${result.distanceMeters}m apart — within range!`
                : `You're ${result.distanceMeters}m apart — move closer and try again.`}
          </div>
        )}
      </div>

      <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate(-1)}>
        ← Back
      </button>
    </div>
  );
}
