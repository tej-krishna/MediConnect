import { useState, type FormEvent } from 'react';
import { searchCamps, registerForCamp } from '../services/diagnosticsService';
import { ApiError } from '../services/apiClient';
import type { HealthCamp } from '../types/diagnostics';
import './ProviderSearchPage.css';

export function HealthCampSearchPage() {
  const [city, setCity] = useState('');
  const [camps, setCamps] = useState<HealthCamp[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!city.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      setCamps(await searchCamps(city.trim()));
    } catch {
      setMessage('Could not search camps right now.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(campId: string) {
    setMessage(null);
    try {
      await registerForCamp(campId);
      setMessage('Registered! See it under "My camps".');
      if (city) setCamps(await searchCamps(city));
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Could not register for this camp.');
    }
  }

  return (
    <div className="container search-page">
      <div className="page-head">
        <span className="eyebrow">Health camps</span>
        <h1>Find health camps near you</h1>
        <p className="text-muted">Free and low-cost community health camps, organized by city.</p>
      </div>
      <p className="text-muted">Free and low-cost health camps run by mobile medical vans and NGOs.</p>
      <form onSubmit={handleSearch} className="city-form" style={{ maxWidth: 420, margin: '16px 0' }}>
        <input placeholder="City or village" value={city} onChange={(e) => setCity(e.target.value)} />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {message && <div className="alert alert-success">{message}</div>}
      {loading && <div className="page-loading">Searching…</div>}
      {!loading && camps && camps.length === 0 && <div className="page-empty">No upcoming camps found in this area.</div>}
      {!loading && camps && camps.length > 0 && (
        <div className="provider-list">
          {camps.map((camp) => (
            <div key={camp.id} className="card">
              <h3>{camp.title}</h3>
              <p className="text-muted">{camp.locationDescription}</p>
              <p>
                {new Date(camp.scheduledDate).toLocaleDateString()} · {camp.startTime}–{camp.endTime}
              </p>
              {camp.servicesOffered.length > 0 && <p className="text-muted">{camp.servicesOffered.join(', ')}</p>}
              <p className="text-muted">{camp.remaining} spots left</p>
              <button className="btn btn-primary" disabled={camp.remaining === 0} onClick={() => handleRegister(camp.id)}>
                {camp.remaining === 0 ? 'Full' : 'Register'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
