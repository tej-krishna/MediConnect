import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createApplication, PROVIDER_TYPE_LABELS } from '../services/providerService';
import { ApiError } from '../services/apiClient';
import './AuthForm.css';

export function BecomeProviderPage() {
  const navigate = useNavigate();
  const [providerType, setProviderType] = useState('doctor');
  const [organizationName, setOrganizationName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const application = await createApplication({
        providerType,
        organizationName,
        registrationNumber,
        issuingAuthority,
        contactPhone,
        contactEmail,
        address: { line1, city, state, postalCode, country: 'India' },
      });
      navigate(`/dashboard/providers/${application.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container auth-page">
      <div className="card auth-card" style={{ maxWidth: 560 }}>
        <h1>Register as a provider</h1>
        <p className="text-muted">
          Submit your details for review. Your listing won't be visible to patients until a
          MediConnect admin verifies and approves your application.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="providerType">Provider type</label>
            <select id="providerType" value={providerType} onChange={(e) => setProviderType(e.target.value)}>
              {Object.entries(PROVIDER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="organizationName">Organization / practice name</label>
            <input id="organizationName" required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="registrationNumber">Registration / licence number</label>
            <input id="registrationNumber" required value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="issuingAuthority">Issuing authority</label>
            <input id="issuingAuthority" required value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="contactPhone">Contact phone</label>
            <input id="contactPhone" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="contactEmail">Contact email</label>
            <input id="contactEmail" type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="line1">Address</label>
            <input id="line1" required placeholder="Street address" value={line1} onChange={(e) => setLine1(e.target.value)} />
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
            {submitting ? 'Submitting…' : 'Create application'}
          </button>
        </form>
      </div>
    </div>
  );
}
