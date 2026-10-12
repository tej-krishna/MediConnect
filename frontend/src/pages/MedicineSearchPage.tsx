import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { searchMedicines } from '../services/pharmacyService';
import type { Medicine } from '../types/pharmacy';
import './ProviderSearchPage.css';

export function MedicineSearchPage() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setMedicines(await searchMedicines(query.trim(), city.trim() || undefined));
    } catch {
      setError('Could not search medicines right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container search-page">
      <h1>Find medicines</h1>
      <form onSubmit={handleSearch} className="city-form" style={{ maxWidth: 480, margin: '16px 0' }}>
        <input placeholder="Medicine or generic name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} style={{ maxWidth: 160 }} />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {loading && <div className="page-loading">Searching…</div>}
      {!loading && error && <div className="page-error">{error}</div>}
      {!loading && medicines && medicines.length === 0 && (
        <div className="page-empty">No matching medicines found in stock right now.</div>
      )}
      {!loading && medicines && medicines.length > 0 && (
        <div className="provider-list">
          {medicines.map((med) => (
            <div key={med.id} className="card">
              <h3>{med.name}</h3>
              <p className="text-muted">
                {med.genericName} · {med.strength} · {med.dosageForm}
              </p>
              <p>
                ₹{med.unitPrice} {med.requiresPrescription && <span className="badge badge-verified">Rx required</span>}
              </p>
              <p className="text-muted">{med.stockQuantity} in stock</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Link className="btn btn-primary" to={`/medicines/${med.id}/order`}>
                  Order
                </Link>
                <Link className="btn btn-secondary" to={`/medicines/${med.id}/alternatives`}>
                  Compare alternatives
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
