import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { searchProviders, PROVIDER_TYPE_LABELS } from '../services/providerService';
import type { PublicProvider } from '../types/provider';
import { ProviderCard } from '../components/ProviderCard';
import './ProviderSearchPage.css';

export function ProviderSearchPage() {
  const { status, coords, requestLocation, reset: resetLocation } = useGeolocation();
  const [cityInput, setCityInput] = useState('');
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [providerType, setProviderType] = useState('');
  const [providers, setProviders] = useState<PublicProvider[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSearchContext = coords !== null || activeCity !== null;

  useEffect(() => {
    if (!hasSearchContext) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchProviders({
      lat: coords?.lat,
      lng: coords?.lng,
      city: coords ? undefined : activeCity ?? undefined,
      providerType: providerType || undefined,
      radiusKm: 30,
    })
      .then((res) => {
        if (!cancelled) setProviders(res.providers);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load providers right now. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coords, activeCity, providerType, hasSearchContext]);

  function handleCitySubmit(e: FormEvent) {
    e.preventDefault();
    if (cityInput.trim()) {
      setActiveCity(cityInput.trim());
    }
  }

  return (
    <div className="container search-page">
      <div className="page-head">
        <span className="eyebrow">Find care</span>
        <h1>Find care near you</h1>
        <p className="text-muted">Search verified doctors, hospitals, clinics, and labs by location or city.</p>
      </div>

      {!hasSearchContext && (
        <div className="card location-prompt">
          <p>Share your location to see the closest verified providers, sorted by distance.</p>
          <button className="btn btn-primary" onClick={requestLocation} disabled={status === 'requesting'}>
            {status === 'requesting' ? 'Requesting location…' : 'Use my location'}
          </button>

          {(status === 'denied' || status === 'unavailable') && (
            <p className="alert alert-error" style={{ marginTop: 12 }}>
              {status === 'denied'
                ? "Location access was denied. You can still search by city below."
                : "Location isn't available on this device. Search by city below."}
            </p>
          )}

          <div className="location-prompt__divider">or search by city</div>
          <form onSubmit={handleCitySubmit} className="city-form">
            <input
              placeholder="e.g. Pune, Nashik"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>
        </div>
      )}

      {hasSearchContext && (
        <>
          <div className="search-controls">
            <span className="text-muted">
              {coords ? 'Showing results near your current location' : `Showing results in "${activeCity}"`}
            </span>
            <select value={providerType} onChange={(e) => setProviderType(e.target.value)}>
              <option value="">All provider types</option>
              {Object.entries(PROVIDER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {loading && <div className="page-loading">Loading providers…</div>}
          {!loading && error && <div className="page-error">{error}</div>}
          {!loading && !error && providers && providers.length === 0 && (
            <div className="page-empty">
              No verified providers found in this area yet. Try a larger search or a different city.
            </div>
          )}
          {!loading && !error && providers && providers.length > 0 && (
            <div className="provider-list">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          )}
        </>
      )}

      {hasSearchContext && (
        <p className="text-muted search-page__reset">
          <Link
            to="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveCity(null);
              setProviders(null);
              resetLocation();
            }}
          >
            Start a new search
          </Link>
        </p>
      )}
    </div>
  );
}
