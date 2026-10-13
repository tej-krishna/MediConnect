import { useEffect, useState, type FormEvent } from 'react';
import { applyAsDeliveryPartner, getMyDeliveryPartnerProfile } from '../services/deliveryService';
import { ApiError } from '../services/apiClient';
import type { DeliveryPartnerProfile, VehicleType } from '../types/delivery';
import './AuthForm.css';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Your application is pending admin review.',
  approved: 'You are an approved delivery partner.',
  rejected: 'Your application was rejected.',
  suspended: 'Your delivery partner access is currently suspended.',
};

export function BecomeDeliveryPartnerPage() {
  const [profile, setProfile] = useState<DeliveryPartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactPhone, setContactPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('two_wheeler');
  const [serviceCity, setServiceCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyDeliveryPartnerProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await applyAsDeliveryPartner({ contactPhone, vehicleType, serviceCity });
      setProfile(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  if (profile && profile.status !== 'rejected') {
    return (
      <div className="container auth-page">
        <div className="card auth-card">
          <h1>Delivery partner application</h1>
          <p className="alert alert-success">{STATUS_LABELS[profile.status]}</p>
          <p className="text-muted">
            Vehicle: {profile.vehicleType.replace(/_/g, ' ')} · City: {profile.serviceCity}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <h1>Become a delivery partner</h1>
        <p className="text-muted">Deliver medicine orders for pharmacies on MediConnect. Subject to admin approval.</p>
        {profile?.status === 'rejected' && (
          <div className="alert alert-error">
            Your previous application was rejected{profile.rejectionReason ? `: ${profile.rejectionReason}` : '.'} You may re-apply below.
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="contactPhone">Contact phone</label>
            <input id="contactPhone" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="vehicleType">Vehicle type</label>
            <select id="vehicleType" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
              <option value="bicycle">Bicycle</option>
              <option value="two_wheeler">Two-wheeler</option>
              <option value="three_wheeler">Three-wheeler</option>
              <option value="van">Van</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="serviceCity">Service city</label>
            <input id="serviceCity" required value={serviceCity} onChange={(e) => setServiceCity(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Apply'}
          </button>
        </form>
      </div>
    </div>
  );
}
