import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProvider, PROVIDER_TYPE_LABELS } from '../services/providerService';
import { ApiError } from '../services/apiClient';
import type { PublicProvider } from '../types/provider';
import './ProviderDetailPage.css';

export function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<PublicProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setNotFound(true);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

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
    </div>
  );
}
