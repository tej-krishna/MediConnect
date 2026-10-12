import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMedicine, createOrder, uploadPrescription } from '../services/pharmacyService';
import { ApiError } from '../services/apiClient';
import type { Medicine, Order } from '../types/pharmacy';
import './AuthForm.css';

export function OrderMedicinePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getMedicine(id)
      .then(setMedicine)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!medicine) return;
    setError(null);
    setSubmitting(true);
    try {
      const order = await createOrder({
        pharmacyId: medicine.pharmacyId,
        items: [{ medicineItemId: medicine.id, quantity: Number(quantity) || 1 }],
        deliveryAddress: { line1, city, state, postalCode },
      });
      if (order.status === 'pending_prescription') {
        setPlacedOrder(order);
      } else {
        navigate('/orders', { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place the order.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadPrescription() {
    if (!placedOrder || !prescriptionFile) return;
    setUploading(true);
    setError(null);
    try {
      await uploadPrescription(placedOrder.id, prescriptionFile);
      navigate('/orders', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload the prescription.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!medicine) return <div className="page-error">Medicine not found.</div>;

  if (placedOrder) {
    return (
      <div className="container auth-page">
        <div className="card auth-card">
          <h1>Prescription required</h1>
          <p className="text-muted">
            {medicine.name} requires a prescription. Upload it to complete your order.
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setPrescriptionFile(e.target.files?.[0] ?? null)}
          />
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 12 }}
            disabled={!prescriptionFile || uploading}
            onClick={handleUploadPrescription}
          >
            {uploading ? 'Uploading…' : 'Upload prescription'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container auth-page">
      <div className="card auth-card">
        <h1>Order {medicine.name}</h1>
        <p className="text-muted">
          ₹{medicine.unitPrice} each {medicine.requiresPrescription && '· prescription required'}
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="quantity">Quantity</label>
            <input id="quantity" type="number" min={1} max={medicine.stockQuantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="line1">Delivery address</label>
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
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </form>
      </div>
    </div>
  );
}
