import { useEffect, useState, type FormEvent } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { searchProviders, PROVIDER_TYPE_LABELS } from '../services/providerService';
import type { PublicProvider } from '../types/provider';
import { ProviderMap } from '../components/ProviderMap';
import { MOCK_NANDIGAMA_PROVIDERS, NANDIGAMA_CENTER, NANDIGAMA_PINCODE } from '../data/mockNandigamaProviders';
import './ProviderSearchPage.css';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ProviderSearchPage() {
  const { status, coords, requestLocation, reset: resetLocation } = useGeolocation();
  const [cityInput, setCityInput] = useState('');
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [providerType, setProviderType] = useState('');
  const [providers, setProviders] = useState<PublicProvider[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const hasSearchContext = coords !== null || activeCity !== null;
  const displayProviders = hasSearchContext ? providers ?? [] : MOCK_NANDIGAMA_PROVIDERS;
  const mapCenter = coords ?? displayProviders.find((p) => p.location)?.location ?? NANDIGAMA_CENTER;

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

  function handleUseLocation() {
    requestLocation();
  }

  function handleReset() {
    setActiveCity(null);
    setProviders(null);
    setCityInput('');
    resetLocation();
  }

  return (
    <div className="map-page">
      <ProviderMap providers={displayProviders} center={mapCenter} fullscreen />

      <div className={`map-search${panelOpen ? ' map-search--open' : ''}`}>
        <button
          type="button"
          className="map-search__toggle"
          onClick={() => setPanelOpen((open) => !open)}
          aria-label={panelOpen ? 'Close search' : 'Open search'}
          aria-expanded={panelOpen}
        >
          {panelOpen ? <CloseIcon /> : <SearchIcon />}
        </button>

        {panelOpen && (
          <div className="map-search__panel card">
            <span className="eyebrow">Find care</span>
            <h2>Find care near you</h2>

            {!hasSearchContext && (
              <>
                <p className="text-muted">Search verified doctors, hospitals, clinics, and labs by location or city.</p>
                <button className="btn btn-primary btn-block" onClick={handleUseLocation} disabled={status === 'requesting'}>
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
              </>
            )}

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

            {!hasSearchContext && (
              <p className="text-muted map-search__demo-note">
                Showing sample providers near Nandigama ({NANDIGAMA_PINCODE}) until you search above.
              </p>
            )}

            {hasSearchContext && (
              <>
                <select value={providerType} onChange={(e) => setProviderType(e.target.value)}>
                  <option value="">All provider types</option>
                  {Object.entries(PROVIDER_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <p className="text-muted map-search__status">
                  {coords ? 'Showing results near your current location' : `Showing results in "${activeCity}"`}
                </p>

                {loading && <div className="page-loading">Loading providers…</div>}
                {!loading && error && <div className="page-error">{error}</div>}
                {!loading && !error && providers && providers.length === 0 && (
                  <div className="page-empty">
                    No verified providers found in this area yet. Try a larger search or a different city.
                  </div>
                )}
                {!loading && !error && providers && providers.length > 0 && (
                  <ul className="map-search__results">
                    {providers.map((provider) => (
                      <li key={provider.id}>
                        <span className="map-search__result-name">{provider.organizationName}</span>
                        <span className="text-muted">{PROVIDER_TYPE_LABELS[provider.providerType] ?? provider.providerType}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button type="button" className="btn btn-ghost btn-sm map-search__reset" onClick={handleReset}>
                  Start a new search
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
