import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { searchTests } from '../services/diagnosticsService';
import type { DiagnosticTest } from '../types/diagnostics';
import './ProviderSearchPage.css';

export function DiagnosticTestSearchPage() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [tests, setTests] = useState<DiagnosticTest[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setTests(await searchTests(query.trim(), city.trim() || undefined));
    } catch {
      setError('Could not search tests right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container search-page">
      <h1>Find diagnostic tests</h1>
      <form onSubmit={handleSearch} className="city-form" style={{ maxWidth: 480, margin: '16px 0' }}>
        <input placeholder="Test or category (e.g. CBC, X-Ray)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} style={{ maxWidth: 160 }} />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {loading && <div className="page-loading">Searching…</div>}
      {!loading && error && <div className="page-error">{error}</div>}
      {!loading && tests && tests.length === 0 && <div className="page-empty">No matching tests found.</div>}
      {!loading && tests && tests.length > 0 && (
        <div className="provider-list">
          {tests.map((test) => (
            <div key={test.id} className="card">
              <h3>{test.name}</h3>
              <p className="text-muted">
                {test.category} · {test.sampleType} · {test.turnaroundHours}h turnaround
              </p>
              <p>
                ₹{test.price} {test.homeCollectionAvailable && <span className="badge badge-verified">Home collection</span>}
              </p>
              <Link className="btn btn-primary" to={`/diagnostic-tests/${test.id}/order`}>
                Book
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
