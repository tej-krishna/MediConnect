import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { SplitSearchLayout } from '../components/SplitSearchLayout';
import { LocationMap, type LocationMapMarker } from '../components/LocationMap';
import { MOCK_LABS } from '../data/mockLabs';
import { NANDIGAMA_CENTER, NANDIGAMA_PINCODE } from '../data/mockNandigamaProviders';
import { distanceMeters, formatDistance } from '../utils/geo';
import '../components/SplitSearchLayout.css';
import './ProviderSearchPage.css';

const LAB_COLOR = '#d97706';

export function DiagnosticTestSearchPage() {
  const { coords, requestLocation } = useGeolocation();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeCity, setActiveCity] = useState('');

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setActiveQuery(query);
    setActiveCity(city);
  }

  const results = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();
    const c = activeCity.trim().toLowerCase();

    return MOCK_LABS.map((lab) => {
      const tests = q
        ? lab.tests.filter(
            (test) => test.name.toLowerCase().includes(q) || test.category.toLowerCase().includes(q),
          )
        : lab.tests;
      return { lab, tests };
    })
      .filter(({ lab, tests }) => {
        if (q && tests.length === 0) return false;
        if (c && !lab.address.city.toLowerCase().includes(c)) return false;
        return true;
      })
      .map((entry) => ({
        ...entry,
        distance: coords ? distanceMeters(coords, entry.lab.location) : undefined,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [activeQuery, activeCity, coords]);

  const mapCenter = coords ?? NANDIGAMA_CENTER;

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

  return (
    <SplitSearchLayout map={<LocationMap markers={markers} center={mapCenter} />}>
      <div className="page-head">
        <span className="eyebrow">Diagnostics</span>
        <h1>Find diagnostic tests</h1>
        <p className="text-muted">Compare prices and home-collection options across nearby labs.</p>
      </div>

      <form onSubmit={handleSearch} className="city-form split-search__form">
        <input placeholder="Test or category (e.g. CBC, X-Ray)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} style={{ maxWidth: 140 }} />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <p className="text-muted split-search__status">
        {coords
          ? `Showing ${results.length} lab${results.length === 1 ? '' : 's'} near your location`
          : `Showing sample labs near Nandigama (${NANDIGAMA_PINCODE})`}
      </p>
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
