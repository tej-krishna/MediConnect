import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { SplitSearchLayout } from '../components/SplitSearchLayout';
import { LocationMap, type LocationMapMarker } from '../components/LocationMap';
import { MOCK_HEALTH_CAMPS } from '../data/mockHealthCamps';
import { NANDIGAMA_CENTER, NANDIGAMA_PINCODE } from '../data/mockNandigamaProviders';
import { distanceMeters, formatDistance } from '../utils/geo';
import '../components/SplitSearchLayout.css';
import './ProviderSearchPage.css';

const CAMP_COLOR = '#be185d';

export function HealthCampSearchPage() {
  const { coords, requestLocation } = useGeolocation();
  const [city, setCity] = useState('');
  const [activeCity, setActiveCity] = useState('');
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setActiveCity(city);
  }

  function handleRegister(campId: string) {
    setRegisteredIds((prev) => new Set(prev).add(campId));
    setMessage('Registered! (Demo data — this will sync to "My camps" once camps go live in your area.)');
  }

  const results = useMemo(() => {
    const c = activeCity.trim().toLowerCase();
    return MOCK_HEALTH_CAMPS.filter((camp) => (c ? camp.locationDescription.toLowerCase().includes(c) : true))
      .map((camp) => ({
        camp,
        distance: coords && camp.location ? distanceMeters(coords, camp.location) : undefined,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [activeCity, coords]);

  const mapCenter = coords ?? NANDIGAMA_CENTER;

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

  return (
    <SplitSearchLayout map={<LocationMap markers={markers} center={mapCenter} />}>
      <div className="page-head">
        <span className="eyebrow">Health camps</span>
        <h1>Find health camps near you</h1>
        <p className="text-muted">Free and low-cost community health camps, run by mobile medical vans and NGOs.</p>
      </div>

      <form onSubmit={handleSearch} className="city-form split-search__form">
        <input placeholder="City or village" value={city} onChange={(e) => setCity(e.target.value)} />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <p className="text-muted split-search__status">
        {coords
          ? `Showing ${results.length} camp${results.length === 1 ? '' : 's'} near your location`
          : `Showing sample camps near Nandigama (${NANDIGAMA_PINCODE})`}
      </p>
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
