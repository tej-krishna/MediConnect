import { Link } from 'react-router-dom';
import type { PublicProvider } from '../types/provider';
import { PROVIDER_TYPE_LABELS } from '../services/providerService';
import './ProviderCard.css';

function formatDistance(meters?: number) {
  if (meters === undefined) return null;
  return meters < 1000 ? `${meters} m away` : `${(meters / 1000).toFixed(1)} km away`;
}

function mapsUrl(provider: PublicProvider) {
  if (provider.location) {
    return `https://www.google.com/maps/search/?api=1&query=${provider.location.lat},${provider.location.lng}`;
  }
  const addr = `${provider.address.line1}, ${provider.address.city}, ${provider.address.state} ${provider.address.postalCode}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

export function ProviderCard({ provider }: { provider: PublicProvider }) {
  const distance = formatDistance(provider.distanceMeters);

  return (
    <div className="card provider-card">
      <div className="provider-card__header">
        <h3>{provider.organizationName}</h3>
        <span className="badge badge-verified">Verified</span>
      </div>
      <p className="text-muted provider-card__type">{PROVIDER_TYPE_LABELS[provider.providerType] ?? provider.providerType}</p>
      <p className="provider-card__address">
        {provider.address.line1}, {provider.address.city}, {provider.address.state}
      </p>
      <div className="provider-card__meta">
        {provider.consultationFee !== null && <span>Consultation: ₹{provider.consultationFee}</span>}
        {distance && <span>{distance}</span>}
      </div>
      {provider.operatingHoursNote && <p className="text-muted">{provider.operatingHoursNote}</p>}
      <div className="provider-card__actions">
        <a className="btn btn-secondary" href={`tel:${provider.contactPhone}`}>
          Call
        </a>
        <a className="btn btn-secondary" href={mapsUrl(provider)} target="_blank" rel="noreferrer">
          Directions
        </a>
        <Link className="btn btn-primary" to={`/providers/${provider.id}`}>
          View details
        </Link>
      </div>
    </div>
  );
}
