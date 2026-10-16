import { useMemo, useState, type FormEvent } from 'react';
import { useUserLocation } from '../app/UserLocationContext';
import { SplitSearchLayout } from '../components/SplitSearchLayout';
import { LocationMap, type LocationMapMarker } from '../components/LocationMap';
import { MOCK_PHARMACIES } from '../data/mockPharmacies';
import { NANDIGAMA_CENTER, NANDIGAMA_PINCODE } from '../data/mockNandigamaProviders';
import { distanceMeters, formatDistance, NEARBY_RADIUS_METERS } from '../utils/geo';
import '../components/SplitSearchLayout.css';
import './ProviderSearchPage.css';

const PHARMACY_COLOR = '#059669';
const NEARBY_RADIUS_KM = NEARBY_RADIUS_METERS / 1000;

export function MedicineSearchPage() {
  const { coords } = useUserLocation();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeCity, setActiveCity] = useState('');

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setActiveQuery(query);
    setActiveCity(city);
  }

  const matched = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();
    const c = activeCity.trim().toLowerCase();

    return MOCK_PHARMACIES.map((pharmacy) => {
      const medicines = q
        ? pharmacy.medicines.filter(
            (med) => med.name.toLowerCase().includes(q) || med.genericName.toLowerCase().includes(q),
          )
        : pharmacy.medicines;
      return { pharmacy, medicines };
    }).filter(({ pharmacy, medicines }) => {
      if (q && medicines.length === 0) return false;
      if (c && !pharmacy.address.city.toLowerCase().includes(c)) return false;
      return true;
    });
  }, [activeQuery, activeCity]);

  const cityActive = activeCity.trim() !== '';

  const { results, usingFallback } = useMemo(() => {
    const withDistance = matched.map((entry) => ({
      ...entry,
      distance: coords ? distanceMeters(coords, entry.pharmacy.location) : undefined,
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

  const markers: LocationMapMarker[] = results.map(({ pharmacy, medicines }) => ({
    id: pharmacy.id,
    position: pharmacy.location,
    color: PHARMACY_COLOR,
    popup: (
      <>
        <strong>{pharmacy.name}</strong>
        <span>
          {pharmacy.address.line1}, {pharmacy.address.city}
        </span>
        {medicines.length > 0 && <span>{medicines.length} matching medicine(s)</span>}
      </>
    ),
  }));

  let statusText: string;
  if (cityActive) {
    statusText = `Showing pharmacies in "${activeCity}"`;
  } else if (usingFallback) {
    statusText = `No demo pharmacies within ${NEARBY_RADIUS_KM} km of you — showing samples near Nandigama (${NANDIGAMA_PINCODE})`;
  } else if (coords) {
    statusText = `Showing ${results.length} pharmac${results.length === 1 ? 'y' : 'ies'} within ${NEARBY_RADIUS_KM} km of your location`;
  } else {
    statusText = `Showing sample pharmacies near Nandigama (${NANDIGAMA_PINCODE})`;
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
        <span className="eyebrow">Pharmacy</span>
        <h1>Find medicines</h1>
        <p className="text-muted">Search in-stock medicines and generic alternatives from nearby pharmacies.</p>
      </div>

      <form onSubmit={handleSearch} className="city-form split-search__form">
        <input placeholder="Medicine or generic name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} style={{ maxWidth: 140 }} />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <p className="text-muted split-search__status">{statusText}</p>
      <p className="text-muted split-search__demo-note">
        Demo data — ordering opens once pharmacies register in your area.
      </p>

      {results.length === 0 && <div className="page-empty">No pharmacies stock a matching medicine right now.</div>}

      <div className="split-search__list">
        {results.map(({ pharmacy, medicines, distance }) => (
          <div key={pharmacy.id} className="card split-search__item">
            <h3>{pharmacy.name}</h3>
            <p className="text-muted">
              {pharmacy.address.line1}, {pharmacy.address.city}
              {distance !== undefined && ` · ${formatDistance(distance)}`}
            </p>
            <div className="split-search__item-rows">
              {medicines.map((med) => (
                <div key={med.id} className="split-search__item-row">
                  <span>
                    <span className="split-search__item-row-label">{med.name}</span>{' '}
                    <span className="text-muted">
                      ({med.strength}, {med.dosageForm})
                    </span>
                  </span>
                  <span>
                    ₹{med.unitPrice} {med.requiresPrescription && <span className="badge badge-verified">Rx</span>}
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
