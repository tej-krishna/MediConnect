import { useEffect, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LatLng } from '../types/provider';
import './LocationMap.css';

function pinIcon(color: string) {
  return L.divIcon({
    className: 'location-map__pin-wrapper',
    html: `<span class="location-map__pin" style="background:${color}"></span>`,
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

export interface LocationMapMarker {
  id: string;
  position: LatLng;
  color: string;
  popup: ReactNode;
}

interface LocationMapProps {
  markers: LocationMapMarker[];
  center: LatLng;
  zoom?: number;
  radiusMeters?: number;
  radiusCenter?: LatLng;
}

export function LocationMap({ markers, center, zoom = 14, radiusMeters, radiusCenter }: LocationMapProps) {
  return (
    <div className="location-map">
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
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
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.position.lat, marker.position.lng]} icon={pinIcon(marker.color)}>
            <Popup>
              <div className="location-map__popup">{marker.popup}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {markers.length === 0 && <p className="text-muted location-map__empty">No results to show on the map yet.</p>}
    </div>
  );
}
