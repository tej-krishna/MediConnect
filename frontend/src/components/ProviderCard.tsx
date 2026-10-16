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

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function ProviderCard({ provider }: { provider: PublicProvider }) {
  const distance = formatDistance(provider.distanceMeters);

  return (
    <div className="card provider-card">
      <div className="provider-card__header">
        <div className="provider-card__avatar">{initials(provider.organizationName)}</div>
        <div className="provider-card__heading">
          <h3>{provider.organizationName}</h3>
          <span className="provider-card__type">
            {PROVIDER_TYPE_LABELS[provider.providerType] ?? provider.providerType}
          </span>
        </div>
        <span className="badge badge-verified">Verified</span>
      </div>
      <p className="provider-card__address">
        {provider.address.line1}, {provider.address.city}, {provider.address.state}
      </p>
      <div className="provider-card__meta">
        {provider.consultationFee !== null && <span>Consultation: ₹{provider.consultationFee}</span>}
        {distance && <span>{distance}</span>}
      </div>
      {provider.operatingHoursNote && <p className="text-muted provider-card__hours">{provider.operatingHoursNote}</p>}
      <div className="provider-card__actions">
        <a className="btn btn-secondary btn-sm" href={`tel:${provider.contactPhone}`}>
          Call
        </a>
        <a className="btn btn-secondary btn-sm" href={mapsUrl(provider)} target="_blank" rel="noreferrer">
          Directions
        </a>
        <Link className="btn btn-primary btn-sm" to={`/providers/${provider.id}`}>
          View details
        </Link>
      </div>
    </div>
  );
}
