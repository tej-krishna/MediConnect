import { useMemo, useState } from 'react';
import { useUserLocation } from '../app/UserLocationContext';
import { SplitSearchLayout } from '../components/SplitSearchLayout';
import { LocationMap, type LocationMapMarker } from '../components/LocationMap';
import { MOCK_HEALTH_CAMPS } from '../data/mockHealthCamps';
import { NANDIGAMA_CENTER, NANDIGAMA_PINCODE } from '../data/mockNandigamaProviders';
import { distanceMeters, formatDistance, NEARBY_RADIUS_METERS } from '../utils/geo';
import '../components/SplitSearchLayout.css';
import './ProviderSearchPage.css';

const CAMP_COLOR = '#be185d';
const NEARBY_RADIUS_KM = NEARBY_RADIUS_METERS / 1000;

export function HealthCampSearchPage() {
  const { coords } = useUserLocation();
  const [city, setCity] = useState('');
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  function handleRegister(campId: string) {
    setRegisteredIds((prev) => new Set(prev).add(campId));
    setMessage('Registered! (Demo data — this will sync to "My camps" once camps go live in your area.)');
  }

  const matched = useMemo(() => {
    const c = city.trim().toLowerCase();
    return MOCK_HEALTH_CAMPS.filter((camp) => (c ? camp.locationDescription.toLowerCase().includes(c) : true));
  }, [city]);

  const cityActive = city.trim() !== '';

  const { results, usingFallback } = useMemo(() => {
    const withDistance = matched.map((camp) => ({
      camp,
      distance: coords && camp.location ? distanceMeters(coords, camp.location) : undefined,
    }));

    if (!coords || cityActive) {
      return { results: withDistance, usingFallback: false };
    }

    const nearby = withDistance
      .filter((entry) => (entry.distance ?? Infinity) <= NEARBY_RADIUS_METERS)
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    if (nearby.length === 0 && withDistance.length > 0) {
      return { results: matched.map((camp) => ({ camp, distance: undefined })), usingFallback: true };
    }

    return { results: nearby, usingFallback: false };
  }, [matched, coords, cityActive]);

  const mapCenter = !coords || usingFallback ? NANDIGAMA_CENTER : coords;

  const markers: LocationMapMarker[] = results
    .filter(({ camp }) => camp.location !== null)
    .map(({ camp }) => ({
      id: camp.id,
      position: camp.location!,
      color: CAMP_COLOR,
      popup: (
        <>
          <strong>{camp.title}</strong>
          <span>{camp.locationDescription}</span>
          <span>
            {new Date(camp.scheduledDate).toLocaleDateString()} · {camp.startTime}–{camp.endTime}
          </span>
        </>
      ),
    }));

  let statusText: string;
  if (cityActive) {
    statusText = `Showing camps in "${city}"`;
  } else if (usingFallback) {
    statusText = `No demo camps within ${NEARBY_RADIUS_KM} km of you — showing samples near Nandigama (${NANDIGAMA_PINCODE})`;
  } else if (coords) {
    statusText = `Showing ${results.length} camp${results.length === 1 ? '' : 's'} within ${NEARBY_RADIUS_KM} km of your location`;
  } else {
    statusText = `Showing sample camps near Nandigama (${NANDIGAMA_PINCODE})`;
  }

  return (
    <SplitSearchLayout
      map={
        <LocationMap
          markers={markers}
          center={mapCenter}
          radiusMeters={cityActive ? undefined : NEARBY_RADIUS_METERS}
          radiusCenter={mapCenter}
        />
      }
    >
      <div className="page-head">
        <span className="eyebrow">Health camps</span>
        <h1>Find health camps near you</h1>
        <p className="text-muted">Free and low-cost community health camps, run by mobile medical vans and NGOs.</p>
      </div>

      <div className="city-form split-search__form">
        <input placeholder="City or village" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      <p className="text-muted split-search__status">{statusText}</p>
      <p className="text-muted split-search__demo-note">
        Demo data — these camps are samples until real ones are scheduled in your area.
      </p>

      {message && <div className="alert alert-success">{message}</div>}
      {results.length === 0 && <div className="page-empty">No upcoming camps found in this area.</div>}

      <div className="split-search__list">
        {results.map(({ camp, distance }) => {
          const registered = registeredIds.has(camp.id);
          const remaining = camp.remaining - (registered ? 1 : 0);
          return (
            <div key={camp.id} className="card split-search__item">
              <h3>{camp.title}</h3>
              <p className="text-muted">
                {camp.locationDescription}
                {distance !== undefined && ` · ${formatDistance(distance)}`}
              </p>
              <p>
                {new Date(camp.scheduledDate).toLocaleDateString()} · {camp.startTime}–{camp.endTime}
              </p>
              {camp.servicesOffered.length > 0 && <p className="text-muted">{camp.servicesOffered.join(', ')}</p>}
              <p className="text-muted">{remaining} spots left</p>
              <button
                className="btn btn-primary"
                disabled={remaining === 0 || registered}
                onClick={() => handleRegister(camp.id)}
              >
                {registered ? 'Registered' : remaining === 0 ? 'Full' : 'Register'}
              </button>
            </div>
          );
        })}
      </div>
    </SplitSearchLayout>
  );
}
