import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProvider, PROVIDER_TYPE_LABELS } from '../services/providerService';
import { listAvailableSlots, bookAppointment } from '../services/schedulingService';
import { ApiError } from '../services/apiClient';
import { useAuth } from '../app/AuthContext';
import type { PublicProvider } from '../types/provider';
import type { Slot } from '../types/scheduling';
import './ProviderDetailPage.css';

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
    loadSlots();
  }, [loadSlots]);

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

  if (loading) return <div className="page-loading">Loading provider…</div>;

  if (notFound || !provider) {
    return (
      <div className="page-error">
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
      <Link to="/providers" className="text-muted">
        ← Back to search
      </Link>

      <div className="card detail-card">
        <div className="detail-card__header">
          <div>
            <h1>{provider.organizationName}</h1>
            <p className="text-muted">{PROVIDER_TYPE_LABELS[provider.providerType] ?? provider.providerType}</p>
          </div>
          <span className="badge badge-verified">Verified</span>
        </div>

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

      <div className="card detail-card">
        <h3>Book an appointment</h3>
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
                <span>
                  {new Date(slot.startTime).toLocaleString()} ({slot.remaining} spot
                  {slot.remaining === 1 ? '' : 's'} left)
                </span>
                <button
                  className="btn btn-primary"
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
    </div>
  );
}
