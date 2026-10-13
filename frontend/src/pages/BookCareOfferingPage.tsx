import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOffering, createCareRequest } from '../services/homecareService';
import { ApiError } from '../services/apiClient';
import { OFFERING_TYPE_LABELS } from '../types/homecare';
import type { CareOffering } from '../types/homecare';
import './AuthForm.css';

export function BookCareOfferingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offering, setOffering] = useState<CareOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [preferredDate, setPreferredDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOffering(id)
      .then(setOffering)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!offering || !preferredDate) return;
    setError(null);
    setSubmitting(true);
    try {
      await createCareRequest({
        offeringId: offering.id,
        quantity: offering.availableQuantity !== null ? Number(quantity) || 1 : undefined,
        preferredDate: new Date(preferredDate).toISOString(),
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
        deliveryAddress: { line1, city, state, postalCode },
        notes: notes || undefined,
      });
      navigate('/my-care-requests', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!offering) return <div className="page-error">Offering not found.</div>;

  const isRental = offering.offeringType === 'equipment_rental';
  const isEquipment = offering.availableQuantity !== null;

  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <h1>Book {offering.name}</h1>
        <p className="text-muted">
          {OFFERING_TYPE_LABELS[offering.offeringType]} · ₹{offering.price}
          {isRental && '/day'}
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          {isEquipment && (
            <div className="form-field">
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={offering.availableQuantity ?? undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          )}
          <div className="form-field">
            <label htmlFor="preferredDate">{isRental ? 'Delivery date' : isEquipment ? 'Delivery date' : 'Preferred visit date'}</label>
            <input id="preferredDate" type="date" required value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
          </div>
          {isRental && (
            <div className="form-field">
              <label htmlFor="expectedReturnDate">Expected return date (optional)</label>
              <input id="expectedReturnDate" type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
            </div>
          )}
          <div className="form-field">
            <label htmlFor="line1">Address</label>
            <input id="line1" required value={line1} onChange={(e) => setLine1(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="city">City</label>
            <input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="state">State</label>
            <input id="state" required value={state} onChange={(e) => setState(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="postalCode">Postal code</label>
            <input id="postalCode" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="notes">Notes (optional)</label>
            <input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </div>
    </div>
  );
}
