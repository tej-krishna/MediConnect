import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createApplication, PROVIDER_TYPE_LABELS } from '../services/providerService';
import { ApiError } from '../services/apiClient';
import { PROVIDER_TYPE_FIELDS, type ProviderTypeField } from '../data/providerTypeFields';
import './AuthForm.css';

type TypeDetailsState = Record<string, string | boolean>;

function defaultTypeDetails(fields: ProviderTypeField[]): TypeDetailsState {
  const next: TypeDetailsState = {};
  for (const field of fields) {
    next[field.name] = field.kind === 'checkbox' ? false : '';
  }
  return next;
}

function buildTypeDetailsPayload(fields: ProviderTypeField[], state: TypeDetailsState): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    const value = state[field.name];
    if (field.kind === 'number') {
      payload[field.name] = Number(value) || 0;
    } else if (field.kind === 'checkbox') {
      payload[field.name] = Boolean(value);
    } else {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      // Optional text fields (no `required`) are left out entirely when empty, matching the
      // backend's `.optional()` fields (e.g. pharmacy's GSTIN) rather than sending "".
      if (trimmed || field.required) {
        payload[field.name] = trimmed;
      }
    }
  }
  return payload;
}

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

  const fields = PROVIDER_TYPE_FIELDS[providerType] ?? [];
  const [typeDetails, setTypeDetails] = useState<TypeDetailsState>(() => defaultTypeDetails(fields));

  // Switching provider type changes which fields apply — stale values from the previous type
  // (e.g. a hospital's bed count) should never leak into a different type's typeDetails payload.
  useEffect(() => {
    setTypeDetails(defaultTypeDetails(PROVIDER_TYPE_FIELDS[providerType] ?? []));
  }, [providerType]);

  function updateTypeDetail(name: string, value: string | boolean) {
    setTypeDetails((prev) => ({ ...prev, [name]: value }));
  }

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
        typeDetails: buildTypeDetailsPayload(fields, typeDetails),
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

          {fields.length > 0 && (
            <div className="become-provider__type-fields">
              <span className="eyebrow">{PROVIDER_TYPE_LABELS[providerType]} details</span>
              {fields.map((field) => {
                const fieldId = `typeDetails-${field.name}`;
                if (field.kind === 'checkbox') {
                  return (
                    <div className="form-field" key={field.name}>
                      <label htmlFor={fieldId} className="become-provider__checkbox-label">
                        <input
                          id={fieldId}
                          type="checkbox"
                          checked={Boolean(typeDetails[field.name])}
                          onChange={(e) => updateTypeDetail(field.name, e.target.checked)}
                        />
                        {field.label}
                      </label>
                    </div>
                  );
                }
                if (field.kind === 'select') {
                  return (
                    <div className="form-field" key={field.name}>
                      <label htmlFor={fieldId}>{field.label}</label>
                      <select
                        id={fieldId}
                        required={field.required}
                        value={(typeDetails[field.name] as string) ?? ''}
                        onChange={(e) => updateTypeDetail(field.name, e.target.value)}
                      >
                        <option value="" disabled>
                          Select one
                        </option>
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                return (
                  <div className="form-field" key={field.name}>
                    <label htmlFor={fieldId}>{field.label}</label>
                    <input
                      id={fieldId}
                      type={field.kind === 'number' ? 'number' : 'text'}
                      min={field.kind === 'number' ? field.min : undefined}
                      max={field.kind === 'number' ? field.max : undefined}
                      required={field.required}
                      placeholder={field.kind === 'text' ? field.placeholder : undefined}
                      value={(typeDetails[field.name] as string) ?? ''}
                      onChange={(e) => updateTypeDetail(field.name, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}

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
