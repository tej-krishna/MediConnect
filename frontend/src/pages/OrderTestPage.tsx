import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTest, createDiagnosticOrder } from '../services/diagnosticsService';
import { ApiError } from '../services/apiClient';
import type { DiagnosticTest } from '../types/diagnostics';
import './AuthForm.css';

export function OrderTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<DiagnosticTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [collectionMethod, setCollectionMethod] = useState<'at_lab' | 'home_collection'>('at_lab');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getTest(id)
      .then(setTest)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!test || !date || !time) return;
    setError(null);
    setSubmitting(true);
    try {
      await createDiagnosticOrder({
        labId: test.labId,
        testIds: [test.id],
        collectionMethod,
        homeAddress: collectionMethod === 'home_collection' ? { line1, city, state, postalCode } : undefined,
        preferredDateTime: new Date(`${date}T${time}`).toISOString(),
      });
      navigate('/diagnostic-orders', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not book this test.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!test) return <div className="page-error">Test not found.</div>;

  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <h1>Book {test.name}</h1>
        <p className="text-muted">
          ₹{test.price} · {test.sampleType} sample · {test.turnaroundHours}h turnaround
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="collectionMethod">Collection method</label>
            <select
              id="collectionMethod"
              value={collectionMethod}
              onChange={(e) => setCollectionMethod(e.target.value as 'at_lab' | 'home_collection')}
            >
              <option value="at_lab">Visit the lab</option>
              {test.homeCollectionAvailable && <option value="home_collection">Home sample collection</option>}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="date">Preferred date</label>
            <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="time">Preferred time</label>
            <input id="time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          {collectionMethod === 'home_collection' && (
            <>
              <div className="form-field">
                <label htmlFor="line1">Address</label>
                <input id="line1" required value={line1} onChange={(e) => setLine1(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="city">City</label>
                <input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="state">State</label>
                <input id="state" required value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="postalCode">Postal code</label>
                <input id="postalCode" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
            </>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Booking…' : 'Book test'}
          </button>
        </form>
      </div>
    </div>
  );
}
