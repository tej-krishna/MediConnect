import { useMemo, useState } from 'react';
import { useUserLocation } from '../app/UserLocationContext';
import { SplitSearchLayout } from '../components/SplitSearchLayout';
import { LocationMap, type LocationMapMarker } from '../components/LocationMap';
import { MOCK_LABS } from '../data/mockLabs';
import { NANDIGAMA_CENTER, NANDIGAMA_PINCODE } from '../data/mockNandigamaProviders';
import { distanceMeters, formatDistance, NEARBY_RADIUS_METERS } from '../utils/geo';
import '../components/SplitSearchLayout.css';
import './ProviderSearchPage.css';

const LAB_COLOR = '#d97706';
const NEARBY_RADIUS_KM = NEARBY_RADIUS_METERS / 1000;

export function DiagnosticTestSearchPage() {
  const { coords } = useUserLocation();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const c = city.trim().toLowerCase();

    return MOCK_LABS.map((lab) => {
      const tests = q
        ? lab.tests.filter((test) => test.name.toLowerCase().includes(q) || test.category.toLowerCase().includes(q))
        : lab.tests;
      return { lab, tests };
    }).filter(({ lab, tests }) => {
      if (q && tests.length === 0) return false;
      if (c && !lab.address.city.toLowerCase().includes(c)) return false;
      return true;
    });
  }, [query, city]);

  const cityActive = city.trim() !== '';

  const { results, usingFallback } = useMemo(() => {
    const withDistance = matched.map((entry) => ({
      ...entry,
      distance: coords ? distanceMeters(coords, entry.lab.location) : undefined,
    }));

    if (!coords || cityActive) {
      return { results: withDistance, usingFallback: false };
    }

    const nearby = withDistance
      .filter((entry) => (entry.distance ?? Infinity) <= NEARBY_RADIUS_METERS)
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    if (nearby.length === 0 && withDistance.length > 0) {
      return { results: matched.map((entry) => ({ ...entry, distance: undefined })), usingFallback: true };
    }

    return { results: nearby, usingFallback: false };
  }, [matched, coords, cityActive]);

  const mapCenter = !coords || usingFallback ? NANDIGAMA_CENTER : coords;

  const markers: LocationMapMarker[] = results.map(({ lab, tests }) => ({
    id: lab.id,
    position: lab.location,
    color: LAB_COLOR,
    popup: (
      <>
        <strong>{lab.name}</strong>
        <span>
          {lab.address.line1}, {lab.address.city}
        </span>
        {tests.length > 0 && <span>{tests.length} matching test(s)</span>}
      </>
    ),
  }));

  let statusText: string;
  if (cityActive) {
    statusText = `Showing labs in "${city}"`;
  } else if (usingFallback) {
    statusText = `No demo labs within ${NEARBY_RADIUS_KM} km of you — showing samples near Nandigama (${NANDIGAMA_PINCODE})`;
  } else if (coords) {
    statusText = `Showing ${results.length} lab${results.length === 1 ? '' : 's'} within ${NEARBY_RADIUS_KM} km of your location`;
  } else {
    statusText = `Showing sample labs near Nandigama (${NANDIGAMA_PINCODE})`;
  }

  return (
    <SplitSearchLayout
      map={
        <LocationMap
          markers={markers}
          center={mapCenter}
          radiusMeters={cityActive ? undefined : NEARBY_RADIUS_METERS}
          radiusCenter={mapCenter}
          userLocation={cityActive ? undefined : coords ?? undefined}
        />
      }
    >
      <div className="page-head">
        <span className="eyebrow">Diagnostics</span>
        <h1>Find diagnostic tests</h1>
        <p className="text-muted">Compare prices and home-collection options across nearby labs.</p>
      </div>

      <div className="city-form split-search__form">
        <input placeholder="Test or category (e.g. CBC, X-Ray)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} style={{ maxWidth: 140 }} />
      </div>

      <p className="text-muted split-search__status">{statusText}</p>
      <p className="text-muted split-search__demo-note">
        Demo data — booking opens once labs register in your area.
      </p>

      {results.length === 0 && <div className="page-empty">No labs offer a matching test right now.</div>}

      <div className="split-search__list">
        {results.map(({ lab, tests, distance }) => (
          <div key={lab.id} className="card split-search__item">
            <h3>{lab.name}</h3>
            <p className="text-muted">
              {lab.address.line1}, {lab.address.city}
              {distance !== undefined && ` · ${formatDistance(distance)}`}
            </p>
            <div className="split-search__item-rows">
              {tests.map((test) => (
                <div key={test.id} className="split-search__item-row">
                  <span>
                    <span className="split-search__item-row-label">{test.name}</span>{' '}
                    <span className="text-muted">
                      ({test.sampleType}, {test.turnaroundHours}h)
                    </span>
                  </span>
                  <span>
                    ₹{test.price}{' '}
                    {test.homeCollectionAvailable && <span className="badge badge-verified">Home collection</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SplitSearchLayout>
  );
}
