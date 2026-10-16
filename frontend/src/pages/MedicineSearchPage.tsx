import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { SplitSearchLayout } from '../components/SplitSearchLayout';
import { LocationMap, type LocationMapMarker } from '../components/LocationMap';
import { MOCK_PHARMACIES } from '../data/mockPharmacies';
import { NANDIGAMA_CENTER, NANDIGAMA_PINCODE } from '../data/mockNandigamaProviders';
import { distanceMeters, formatDistance } from '../utils/geo';
import '../components/SplitSearchLayout.css';
import './ProviderSearchPage.css';

const PHARMACY_COLOR = '#059669';

export function MedicineSearchPage() {
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

    return MOCK_PHARMACIES.map((pharmacy) => {
      const medicines = q
        ? pharmacy.medicines.filter(
            (med) => med.name.toLowerCase().includes(q) || med.genericName.toLowerCase().includes(q),
          )
        : pharmacy.medicines;
      return { pharmacy, medicines };
    })
      .filter(({ pharmacy, medicines }) => {
        if (q && medicines.length === 0) return false;
        if (c && !pharmacy.address.city.toLowerCase().includes(c)) return false;
        return true;
      })
      .map((entry) => ({
        ...entry,
        distance: coords ? distanceMeters(coords, entry.pharmacy.location) : undefined,
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [activeQuery, activeCity, coords]);

  const mapCenter = coords ?? NANDIGAMA_CENTER;

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

  return (
    <SplitSearchLayout map={<LocationMap markers={markers} center={mapCenter} />}>
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

      <p className="text-muted split-search__status">
        {coords
          ? `Showing ${results.length} pharmac${results.length === 1 ? 'y' : 'ies'} near your location`
          : `Showing sample pharmacies near Nandigama (${NANDIGAMA_PINCODE})`}
      </p>
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
