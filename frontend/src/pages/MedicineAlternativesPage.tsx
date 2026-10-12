import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMedicine, getAlternatives } from '../services/pharmacyService';
import type { Medicine } from '../types/pharmacy';
import './StaticPage.css';

export function MedicineAlternativesPage() {
  const { id } = useParams<{ id: string }>();
  const [reference, setReference] = useState<Medicine | null>(null);
  const [alternatives, setAlternatives] = useState<Medicine[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getMedicine(id), getAlternatives(id)])
      .then(([med, alt]) => {
        setReference(med);
        setAlternatives(alt.alternatives);
        setDisclaimer(alt.disclaimer);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!reference) return <div className="page-error">Medicine not found.</div>;

  return (
    <div className="static-page">
      <h1>Alternatives for {reference.name}</h1>
      <p className="text-muted">
        {reference.genericName} · {reference.strength} · {reference.dosageForm} · ₹{reference.unitPrice} at this
        pharmacy
      </p>
      <div className="alert alert-success">{disclaimer}</div>

      {alternatives.length === 0 ? (
        <p className="text-muted">No alternatives from other pharmacies right now.</p>
      ) : (
        alternatives.map((alt) => (
          <div key={alt.id} className="card" style={{ marginBottom: 12 }}>
            <h3>{alt.name}</h3>
            <p className="text-muted">
              {alt.genericName} · {alt.strength} · {alt.dosageForm}
            </p>
            <p>₹{alt.unitPrice}</p>
            <Link className="btn btn-primary" to={`/medicines/${alt.id}/order`}>
              Order this instead
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
