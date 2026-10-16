import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../app/AuthContext';
import { listAllGuides, createGuide, updateGuide, deleteGuide } from '../services/emergencyService';
import { ApiError } from '../services/apiClient';
import type { EmergencyGuide } from '../types/emergency';
import './ProviderDashboardPage.css';

export function AdminEmergencyGuidesPage() {
  const { user } = useAuth();
  const [guides, setGuides] = useState<EmergencyGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [guidance, setGuidance] = useState('');
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    try {
      setGuides(await listAllGuides());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load guides.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.roles.includes('super_admin')) reload();
    else setLoading(false);
  }, [user, reload]);

  if (!user?.roles.includes('super_admin')) {
    return <div className="page-error">Only platform admins can manage emergency guidance.</div>;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await createGuide({
        title,
        redFlagSymptoms: symptoms.split('\n').map((s) => s.trim()).filter(Boolean),
        guidance,
      });
      setTitle('');
      setSymptoms('');
      setGuidance('');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create guide.');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleReviewed(guide: EmergencyGuide) {
    setError(null);
    try {
      await updateGuide(guide.id, { clinicallyReviewed: !guide.clinicallyReviewed });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update guide.');
    }
  }

  async function handleToggleActive(guide: EmergencyGuide) {
    setError(null);
    try {
      if (guide.isActive) {
        await deleteGuide(guide.id);
      } else {
        await updateGuide(guide.id, { isActive: true });
      }
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update guide.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="container dashboard-page">
      <div className="page-head"><h1>Emergency guidance content</h1></div>
      <p className="text-muted">
        This content is shown on the public emergency page without login. Mark a guide "clinically
        reviewed" only once an actual qualified clinician has signed off on it.
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <h3>Add a guide</h3>
        <form onSubmit={handleCreate}>
          <div className="form-field">
            <label htmlFor="title">Title</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="symptoms">Red-flag symptoms (one per line)</label>
            <textarea id="symptoms" required rows={4} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="guidance">Guidance</label>
            <textarea id="guidance" required rows={3} value={guidance} onChange={(e) => setGuidance(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Adding…' : 'Add guide'}
          </button>
        </form>
      </div>

      {guides.map((guide) => (
        <div key={guide.id} className="card" style={{ marginTop: 16 }}>
          <h3>
            {guide.title} {!guide.isActive && <span className="text-muted">(inactive)</span>}
          </h3>
          <ul>
            {guide.redFlagSymptoms.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p>{guide.guidance}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => handleToggleReviewed(guide)}>
              {guide.clinicallyReviewed ? 'Mark as unreviewed' : 'Mark as clinically reviewed'}
            </button>
            <button className="btn btn-secondary" onClick={() => handleToggleActive(guide)}>
              {guide.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
