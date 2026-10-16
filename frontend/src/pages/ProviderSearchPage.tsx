import { useEffect, useState } from 'react';
import { useUserLocation } from '../app/UserLocationContext';
import { searchProviders, PROVIDER_TYPE_LABELS } from '../services/providerService';
import type { PublicProvider } from '../types/provider';
import { ProviderMap } from '../components/ProviderMap';
import { MOCK_NANDIGAMA_PROVIDERS, NANDIGAMA_CENTER, NANDIGAMA_PINCODE } from '../data/mockNandigamaProviders';
import { NEARBY_RADIUS_METERS } from '../utils/geo';
import './ProviderSearchPage.css';

const NEARBY_RADIUS_KM = NEARBY_RADIUS_METERS / 1000;
const CITY_DEBOUNCE_MS = 350;

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
  const { status, coords, requestLocation } = useUserLocation();
  const [cityInput, setCityInput] = useState('');
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [providerType, setProviderType] = useState('');
  const [providers, setProviders] = useState<PublicProvider[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Live search: re-derive the active city from what's typed, a little after
  // the user stops typing, instead of requiring an explicit Search click.
  useEffect(() => {
    const trimmed = cityInput.trim();
    const timer = setTimeout(() => {
      setActiveCity(trimmed ? trimmed : null);
    }, CITY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [cityInput]);

  const hasSearchContext = coords !== null || activeCity !== null;
  const displayProviders = hasSearchContext ? providers ?? [] : MOCK_NANDIGAMA_PROVIDERS;
  const mapCenter = hasSearchContext ? coords ?? displayProviders.find((p) => p.location)?.location ?? NANDIGAMA_CENTER : NANDIGAMA_CENTER;

  useEffect(() => {
    if (!hasSearchContext) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchProviders({
      lat: activeCity ? undefined : coords?.lat,
      lng: activeCity ? undefined : coords?.lng,
      city: activeCity ?? undefined,
      providerType: providerType || undefined,
      radiusKm: NEARBY_RADIUS_KM,
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

  function handleClearCity() {
    setActiveCity(null);
    setProviders(null);
    setCityInput('');
  }

  return (
    <div className="map-page">
      <ProviderMap
        providers={displayProviders}
        center={mapCenter}
        radiusMeters={activeCity ? undefined : NEARBY_RADIUS_METERS}
        radiusCenter={coords ?? NANDIGAMA_CENTER}
        userLocation={coords ?? undefined}
        fullscreen
      />

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
            <p className="text-muted">Verified doctors, hospitals, clinics, and labs within 2 km of your location.</p>

            {(status === 'denied' || status === 'unavailable') && !activeCity && (
              <>
                <p className="alert alert-error" style={{ marginTop: 12 }}>
                  {status === 'denied'
                    ? 'Location access was denied. You can retry, or search by city below.'
                    : "Location isn't available on this device. Search by city below."}
                </p>
                <button className="btn btn-primary btn-block" onClick={requestLocation}>
                  Retry location
                </button>
                <div className="location-prompt__divider">or search by city</div>
              </>
            )}

            {status === 'requesting' && !activeCity && (
              <p className="text-muted map-search__status">Finding your location…</p>
            )}

            <div className="city-form">
              <input
                placeholder="e.g. Pune, Nashik"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
              />
            </div>

            {!hasSearchContext && (
              <p className="text-muted map-search__demo-note">
                Showing sample providers near Nandigama ({NANDIGAMA_PINCODE}) until your location or a city search is available.
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
                  {activeCity
                    ? `Showing results in "${activeCity}"`
                    : `Showing results within ${NEARBY_RADIUS_KM} km of your location`}
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

                {activeCity && (
                  <button type="button" className="btn btn-ghost btn-sm map-search__reset" onClick={handleClearCity}>
                    Clear city search
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
