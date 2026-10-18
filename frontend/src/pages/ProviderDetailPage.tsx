import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProvider, PROVIDER_TYPE_LABELS } from '../services/providerService';
import { listAvailableSlots, bookAppointment } from '../services/schedulingService';
import { requestConsultation } from '../services/consultationService';
import { ApiError } from '../services/apiClient';
import { useAuth } from '../app/AuthContext';
import type { PublicProvider } from '../types/provider';
import type { Slot, VisitType } from '../types/scheduling';
import './ProviderDetailPage.css';

/** Hospitals/clinics keep the old self-service slot system, now badged "Book OP" — doctors (and
 * clinics, which get both) instead use the request/accept Consultation flow below. */
const SLOT_BOOKING_TYPES = new Set(['hospital', 'clinic']);
const CONSULTATION_TYPES = new Set(['doctor', 'clinic']);

export function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [provider, setProvider] = useState<PublicProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);

  const [visitType, setVisitType] = useState<VisitType>('online');
  const [preferredDateTime, setPreferredDateTime] = useState('');
  const [homeLine1, setHomeLine1] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [homeState, setHomeState] = useState('');
  const [homePostalCode, setHomePostalCode] = useState('');
  const [requestingConsultation, setRequestingConsultation] = useState(false);
  const [consultationMessage, setConsultationMessage] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    if (!id || !user) return;
    setSlotsLoading(true);
    try {
      setSlots(await listAvailableSlots(id));
    } catch {
      // Non-fatal — the provider detail itself still renders without a schedule.
    } finally {
      setSlotsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    getProvider(id)
      .then((p) => {
        if (!cancelled) setProvider(p);
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (provider && SLOT_BOOKING_TYPES.has(provider.providerType)) {
      loadSlots();
    }
  }, [provider, loadSlots]);

  async function handleBook(slotId: string) {
    setBookingSlotId(slotId);
    setBookingMessage(null);
    try {
      await bookAppointment(slotId);
      setBookingMessage('Appointment booked! See it under "My appointments".');
      await loadSlots();
    } catch (err) {
      setBookingMessage(err instanceof ApiError ? err.message : 'Could not book this slot.');
    } finally {
      setBookingSlotId(null);
    }
  }

  async function handleRequestConsultation(e: FormEvent) {
    e.preventDefault();
    if (!id || !preferredDateTime) return;
    setRequestingConsultation(true);
    setConsultationMessage(null);
    try {
      await requestConsultation({
        doctorId: id,
        visitType,
        preferredDateTime: new Date(preferredDateTime).toISOString(),
        homeVisitAddress:
          visitType === 'home_visit'
            ? { line1: homeLine1, city: homeCity, state: homeState, postalCode: homePostalCode }
            : undefined,
      });
      setConsultationMessage('Request sent! See it under "My consultations" once the doctor accepts.');
      setPreferredDateTime('');
      setHomeLine1('');
      setHomeCity('');
      setHomeState('');
      setHomePostalCode('');
    } catch (err) {
      setConsultationMessage(err instanceof ApiError ? err.message : 'Could not send this request.');
    } finally {
      setRequestingConsultation(false);
    }
  }

  if (loading) return <div className="container page-loading">Loading provider…</div>;

  if (notFound || !provider) {
    return (
      <div className="container page-error">
        <h1>Provider not found</h1>
        <p>This provider may no longer be verified or active on MediConnect.</p>
        <Link to="/providers" className="btn btn-primary">
          Back to search
        </Link>
      </div>
    );
  }

  const mapsUrl = provider.location
    ? `https://www.google.com/maps/search/?api=1&query=${provider.location.lat},${provider.location.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${provider.address.line1}, ${provider.address.city}`)}`;

  return (
    <div className="container detail-page">
      <Link to="/providers" className="detail-page__back">
        ← Back to search
      </Link>

      <div className="card detail-card">
        <div className="detail-card__header">
          <div className="detail-card__avatar">
            {provider.organizationName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join('')}
          </div>
          <div className="detail-card__title">
            <h1>{provider.organizationName}</h1>
            <p className="text-muted">{PROVIDER_TYPE_LABELS[provider.providerType] ?? provider.providerType}</p>
          </div>
          <span className="badge badge-verified">Verified</span>
        </div>

        {CONSULTATION_TYPES.has(provider.providerType) && provider.reliabilityRating !== undefined && (
          <div className="detail-card__section">
            <h3>Reliability</h3>
            <p>{provider.reliabilityRating.toFixed(0)}% — based on completed vs. missed visits</p>
          </div>
        )}

        <div className="detail-card__section">
          <h3>Address</h3>
          <p>
            {provider.address.line1}, {provider.address.city}, {provider.address.state}{' '}
            {provider.address.postalCode}
          </p>
        </div>

        {provider.consultationFee !== null && (
          <div className="detail-card__section">
            <h3>Consultation fee</h3>
            <p>₹{provider.consultationFee}</p>
          </div>
        )}

        {provider.operatingHoursNote && (
          <div className="detail-card__section">
            <h3>Hours</h3>
            <p>{provider.operatingHoursNote}</p>
          </div>
        )}

        <div className="detail-card__actions">
          <a className="btn btn-primary" href={`tel:${provider.contactPhone}`}>
            Call {provider.contactPhone}
          </a>
          <a className="btn btn-secondary" href={mapsUrl} target="_blank" rel="noreferrer">
            Get directions
          </a>
        </div>
      </div>

      {SLOT_BOOKING_TYPES.has(provider.providerType) && (
      <div className="card detail-card">
        <h3>{provider.providerType === 'hospital' ? 'Book OP' : 'Book an appointment'}</h3>
        {!user && (
          <p className="text-muted">
            <Link to="/login">Log in</Link> or <Link to="/register">create an account</Link> to see
            available times and book.
          </p>
        )}
        {user && slotsLoading && <p className="text-muted">Loading available times…</p>}
        {user && !slotsLoading && slots.length === 0 && (
          <p className="text-muted">No open appointment times right now. Try calling directly.</p>
        )}
        {user && !slotsLoading && slots.length > 0 && (
          <ul className="slot-list">
            {slots.map((slot) => (
              <li key={slot.id} className="slot-list__item">
                <div>
                  <strong>{new Date(slot.startTime).toLocaleString()}</strong>
                  <span className="text-muted slot-list__spots">
                    {slot.remaining} spot{slot.remaining === 1 ? '' : 's'} left
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={bookingSlotId === slot.id}
                  onClick={() => handleBook(slot.id)}
                >
                  {bookingSlotId === slot.id ? 'Booking…' : 'Book'}
                </button>
              </li>
            ))}
          </ul>
        )}
        {bookingMessage && <p className="text-muted" style={{ marginTop: 8 }}>{bookingMessage}</p>}
      </div>
      )}

      {CONSULTATION_TYPES.has(provider.providerType) &&
        (provider.acceptsOnlineConsultations || provider.acceptsHomeVisits) && (
          <div className="card detail-card">
            <h3>Request a consultation</h3>
            {!user ? (
              <p className="text-muted">
                <Link to="/login">Log in</Link> or <Link to="/register">create an account</Link> to request
                a consultation.
              </p>
            ) : (
              <form onSubmit={handleRequestConsultation} className="inline-form">
                <div className="form-field">
                  <label htmlFor="visitType">Visit type</label>
                  <select id="visitType" value={visitType} onChange={(e) => setVisitType(e.target.value as VisitType)}>
                    {provider.acceptsOnlineConsultations && <option value="online">Online consultation</option>}
                    {provider.acceptsHomeVisits && <option value="home_visit">Home visit</option>}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="preferredDateTime">Preferred date &amp; time</label>
                  <input
                    id="preferredDateTime"
                    type="datetime-local"
                    required
                    value={preferredDateTime}
                    onChange={(e) => setPreferredDateTime(e.target.value)}
                  />
                </div>
                {visitType === 'home_visit' && (
                  <>
                    <div className="form-field">
                      <label htmlFor="homeLine1">Address</label>
                      <input id="homeLine1" required value={homeLine1} onChange={(e) => setHomeLine1(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label htmlFor="homeCity">City</label>
                      <input id="homeCity" required value={homeCity} onChange={(e) => setHomeCity(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label htmlFor="homeState">State</label>
                      <input id="homeState" required value={homeState} onChange={(e) => setHomeState(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label htmlFor="homePostalCode">Postal code</label>
                      <input
                        id="homePostalCode"
                        required
                        value={homePostalCode}
                        onChange={(e) => setHomePostalCode(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <button type="submit" className="btn btn-primary" disabled={requestingConsultation}>
                  {requestingConsultation ? 'Sending…' : 'Send request'}
                </button>
              </form>
            )}
            {consultationMessage && <p className="text-muted" style={{ marginTop: 8 }}>{consultationMessage}</p>}
          </div>
        )}
    </div>
  );
}
