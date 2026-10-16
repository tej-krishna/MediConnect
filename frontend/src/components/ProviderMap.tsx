import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import type { LatLng, PublicProvider } from '../types/provider';
import { PROVIDER_TYPE_LABELS } from '../services/providerService';
import './ProviderMap.css';

export const PROVIDER_TYPE_COLORS: Record<string, string> = {
  doctor: '#2563eb',
  hospital: '#dc2626',
  clinic: '#7c3aed',
  pharmacy: '#059669',
  diagnostic_lab: '#d97706',
  ambulance_provider: '#b91c1c',
  equipment_provider: '#0891b2',
  mobile_van_operator: '#4338ca',
  ngo_coordinator: '#be185d',
  insurance_provider: '#475569',
};

const DEFAULT_PIN_COLOR = '#334155';

function pinIcon(color: string) {
  return L.divIcon({
    className: 'provider-map__pin-wrapper',
    html: `<span class="provider-map__pin" style="background:${color}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function RecenterOnChange({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);
  return null;
}

interface ProviderMapProps {
  providers: PublicProvider[];
  center: LatLng;
  zoom?: number;
  heightPx?: number;
  fullscreen?: boolean;
  radiusMeters?: number;
  radiusCenter?: LatLng;
}

export function ProviderMap({
  providers,
  center,
  zoom = 14,
  heightPx = 440,
  fullscreen = false,
  radiusMeters,
  radiusCenter,
}: ProviderMapProps) {
  const located = providers.filter((p): p is PublicProvider & { location: LatLng } => p.location !== null);
  const typesPresent = Array.from(new Set(located.map((p) => p.providerType)));

  return (
    <div className={`provider-map${fullscreen ? ' provider-map--fullscreen' : ''}`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        scrollWheelZoom={fullscreen}
        style={{ height: fullscreen ? '100%' : heightPx, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnChange center={center} zoom={zoom} />
        {radiusMeters !== undefined && (
          <Circle
            center={[(radiusCenter ?? center).lat, (radiusCenter ?? center).lng]}
            radius={radiusMeters}
            pathOptions={{ color: '#0d9488', weight: 1.5, fillColor: '#0d9488', fillOpacity: 0.08 }}
          />
        )}
        {located.map((provider) => (
          <Marker
            key={provider.id}
            position={[provider.location.lat, provider.location.lng]}
            icon={pinIcon(PROVIDER_TYPE_COLORS[provider.providerType] ?? DEFAULT_PIN_COLOR)}
          >
            <Popup>
              <div className="provider-map__popup">
                <strong>{provider.organizationName}</strong>
                <span>{PROVIDER_TYPE_LABELS[provider.providerType] ?? provider.providerType}</span>
                <span>
                  {provider.address.line1}, {provider.address.city}
                </span>
                <Link to={`/providers/${provider.id}`}>View details</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {typesPresent.length > 0 && (
        <div className="provider-map__legend">
          {typesPresent.map((type) => (
            <span key={type} className="provider-map__legend-item">
              <span
                className="provider-map__legend-dot"
                style={{ background: PROVIDER_TYPE_COLORS[type] ?? DEFAULT_PIN_COLOR }}
              />
              {PROVIDER_TYPE_LABELS[type] ?? type}
            </span>
          ))}
        </div>
      )}

      {located.length === 0 && (
        <p className="text-muted provider-map__empty">No providers with a map location in this area.</p>
      )}
    </div>
  );
}
