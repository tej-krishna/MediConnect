import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { searchOfferings } from '../services/homecareService';
import { OFFERING_TYPE_LABELS } from '../types/homecare';
import type { CareOffering, OfferingType } from '../types/homecare';
import './ProviderSearchPage.css';

export function HomeCareSearchPage() {
  const [query, setQuery] = useState('');
  const [offeringType, setOfferingType] = useState<OfferingType | ''>('');
  const [offerings, setOfferings] = useState<CareOffering[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setOfferings(await searchOfferings(query.trim(), offeringType || undefined));
    } catch {
      setError('Could not search right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container search-page">
      <div className="page-head">
        <span className="eyebrow">Home care</span>
        <h1>Medical equipment & home healthcare</h1>
        <p className="text-muted">Rent equipment or book in-home nursing and care services.</p>
      </div>
      <p className="text-muted">Rent or buy equipment, or book a home nursing / physiotherapy visit.</p>
      <form onSubmit={handleSearch} className="city-form" style={{ maxWidth: 480, margin: '16px 0' }}>
        <input placeholder="e.g. wheelchair, nursing, physiotherapy" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={offeringType} onChange={(e) => setOfferingType(e.target.value as OfferingType | '')}>
          <option value="">Any type</option>
          {Object.entries(OFFERING_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {loading && <div className="page-loading">Searching…</div>}
      {!loading && error && <div className="page-error">{error}</div>}
      {!loading && offerings && offerings.length === 0 && (
        <div className="page-empty">No matching offerings found.</div>
      )}
      {!loading && offerings && offerings.length > 0 && (
        <div className="provider-list">
          {offerings.map((offering) => (
            <div key={offering.id} className="card">
              <h3>{offering.name}</h3>
              <p className="text-muted">
                {offering.category} · {OFFERING_TYPE_LABELS[offering.offeringType]}
              </p>
              <p>
                ₹{offering.price}
                {offering.offeringType === 'equipment_rental' && '/day'}
              </p>
              {offering.availableQuantity !== null && (
                <p className="text-muted">{offering.availableQuantity} available</p>
              )}
              <Link className="btn btn-primary" to={`/home-care/${offering.id}/book`} style={{ marginTop: 8 }}>
                Book
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
