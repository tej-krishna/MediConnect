import { useEffect, useState } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { searchProviders, PROVIDER_TYPE_LABELS } from '../services/providerService';
import { listActiveGuides } from '../services/emergencyService';
import type { PublicProvider } from '../types/provider';
import type { EmergencyGuide } from '../types/emergency';
import './EmergencyPage.css';

const NATIONAL_EMERGENCY_NUMBER = '112';
const RELEVANT_TYPES = ['ambulance_provider', 'hospital', 'clinic'];

function formatDistance(meters?: number) {
  if (meters === undefined) return null;
  return meters < 1000 ? `${meters} m away` : `${(meters / 1000).toFixed(1)} km away`;
}

export function EmergencyPage() {
  const { status, coords, requestLocation } = useGeolocation();
  const [guides, setGuides] = useState<EmergencyGuide[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [providers, setProviders] = useState<PublicProvider[] | null>(null);
  const [providersLoading, setProvidersLoading] = useState(false);

  useEffect(() => {
    requestLocation();
    listActiveGuides()
      .then(setGuides)
      .catch(() => {
        // Guidance content is a nice-to-have on this page; the call button and nearby
        // providers below still work if it fails to load.
      });
  }, [requestLocation]);

  useEffect(() => {
    if (!coords) return;
    setProvidersLoading(true);
    Promise.all(
      RELEVANT_TYPES.map((providerType) =>
        searchProviders({ lat: coords.lat, lng: coords.lng, radiusKm: 25, providerType }).then((r) => r.providers),
      ),
    )
      .then((results) => {
        const merged = results.flat().sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
        setProviders(merged);
      })
      .catch(() => setProviders([]))
      .finally(() => setProvidersLoading(false));
  }, [coords]);

  const anyChecked = checked.size > 0;

  function toggleSymptom(symptom: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(symptom)) next.delete(symptom);
      else next.add(symptom);
      return next;
    });
  }

  return (
    <div className="emergency-page">
      <div className="emergency-page__call-section">
        <div className="container">
          <h1>Medical emergency?</h1>
          <a className="emergency-call-button" href={`tel:${NATIONAL_EMERGENCY_NUMBER}`}>
            Call {NATIONAL_EMERGENCY_NUMBER} now
          </a>
          <p className="emergency-page__disclaimer">
            This page cannot diagnose you or dispatch help. For any life-threatening emergency,
            call {NATIONAL_EMERGENCY_NUMBER} immediately rather than searching here first.
          </p>
        </div>
      </div>

      <div className="container">
        {guides.length > 0 && (
          <section className="card emergency-page__section">
            <h2>Do you have any of these warning signs?</h2>
            <p className="text-muted">
              Checking any of these means you should call {NATIONAL_EMERGENCY_NUMBER} right away —
              this list doesn't diagnose you, it's here to help you decide fast.
            </p>
            {anyChecked && (
              <div className="alert alert-error emergency-page__urgent-banner">
                Based on what you selected, call {NATIONAL_EMERGENCY_NUMBER} now.{' '}
                <a href={`tel:${NATIONAL_EMERGENCY_NUMBER}`}>Call now</a>
              </div>
            )}
            {guides.map((guide) => (
              <div key={guide.id} className="emergency-page__guide">
                <h3>{guide.title}</h3>
                {!guide.clinicallyReviewed && (
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                    General guidance, not yet confirmed by a clinical reviewer.
                  </p>
                )}
                <ul>
                  {guide.redFlagSymptoms.map((symptom) => (
                    <li key={symptom}>
                      <label>
                        <input
                          type="checkbox"
                          checked={checked.has(symptom)}
                          onChange={() => toggleSymptom(symptom)}
                        />{' '}
                        {symptom}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <section className="card emergency-page__section">
          <h2>Nearby emergency-relevant services</h2>
          {status === 'idle' || status === 'requesting' ? (
            <p className="text-muted">Finding your location…</p>
          ) : status === 'denied' || status === 'unavailable' ? (
            <p className="text-muted">
              We couldn't get your location. Call {NATIONAL_EMERGENCY_NUMBER} directly, or visit{' '}
              <a href="/providers">Find Care</a> to search by city.
            </p>
          ) : providersLoading ? (
            <p className="text-muted">Looking for nearby ambulances, hospitals, and clinics…</p>
          ) : providers && providers.length === 0 ? (
            <div className="alert alert-error">
              No verified emergency-relevant providers found near you. Call {NATIONAL_EMERGENCY_NUMBER} —
              don't wait while searching.
            </div>
          ) : (
            <div className="emergency-provider-list">
              {providers?.map((provider) => (
                <div key={provider.id} className="emergency-provider-card">
                  <div>
                    <strong>{provider.organizationName}</strong>
                    <p className="text-muted" style={{ margin: '2px 0' }}>
                      {PROVIDER_TYPE_LABELS[provider.providerType] ?? provider.providerType} ·{' '}
                      {formatDistance(provider.distanceMeters)}
                    </p>
                  </div>
                  <a className="btn btn-primary" href={`tel:${provider.contactPhone}`}>
                    Call
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
