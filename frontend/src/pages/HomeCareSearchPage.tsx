import { useMemo, useState } from 'react';
import { MOCK_HOME_VISIT_DOCTORS } from '../data/mockHomeVisitDoctors';
import { MOCK_MEDICAL_RENTALS, type RentalOfferingType } from '../data/mockMedicalRentals';
import './ProviderSearchPage.css';
import './HomeCareSearchPage.css';

type HomeCareTab = 'home_visit' | 'rentals';

const RENTAL_TYPE_LABELS: Record<RentalOfferingType, string> = {
  equipment_rental: 'Rental',
  equipment_purchase: 'Purchase',
};

function RatingStars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="home-care-rating" aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(rounded)}
      {'☆'.repeat(5 - rounded)}
    </span>
  );
}

export function HomeCareSearchPage() {
  const [tab, setTab] = useState<HomeCareTab>('home_visit');
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [rentalType, setRentalType] = useState<RentalOfferingType | ''>('');
  const [requestedDoctorIds, setRequestedDoctorIds] = useState<Set<string>>(new Set());
  const [requestedRentalIds, setRequestedRentalIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const specialties = useMemo(
    () => Array.from(new Set(MOCK_HOME_VISIT_DOCTORS.map((d) => d.specialty))).sort(),
    [],
  );

  const doctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_HOME_VISIT_DOCTORS.filter((doctor) => {
      if (specialty && doctor.specialty !== specialty) return false;
      if (!q) return true;
      const haystack = `${doctor.name} ${doctor.specialty} ${doctor.qualification}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, specialty]);

  const rentals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_MEDICAL_RENTALS.filter((item) => {
      if (rentalType && item.offeringType !== rentalType) return false;
      if (!q) return true;
      const haystack = `${item.name} ${item.category} ${item.providerName}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, rentalType]);

  function handleRequestDoctor(id: string, name: string) {
    setRequestedDoctorIds((prev) => new Set(prev).add(id));
    setMessage(`Home visit requested with ${name}. (Demo data — booking opens once doctors register for home visits in your area.)`);
  }

  function handleRequestRental(id: string, name: string) {
    setRequestedRentalIds((prev) => new Set(prev).add(id));
    setMessage(`Request sent for ${name}. (Demo data — ordering opens once equipment providers register in your area.)`);
  }

  function handleTabChange(next: HomeCareTab) {
    setTab(next);
    setMessage(null);
  }

  return (
    <div className="container search-page">
      <div className="page-head">
        <span className="eyebrow">Home care</span>
        <h1>Medical equipment & home healthcare</h1>
        <p className="text-muted">Book a doctor's home visit, or rent/buy medical equipment.</p>
      </div>

      <div className="city-form home-care__controls">
        <input
          placeholder={tab === 'home_visit' ? 'Search doctors by name or specialty' : 'Search equipment e.g. wheelchair, oxygen'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {tab === 'home_visit' ? (
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            <option value="">All specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <select value={rentalType} onChange={(e) => setRentalType(e.target.value as RentalOfferingType | '')}>
            <option value="">Rental &amp; purchase</option>
            <option value="equipment_rental">Rental only</option>
            <option value="equipment_purchase">Purchase only</option>
          </select>
        )}

        <div className="view-toggle">
          <button type="button" className={tab === 'home_visit' ? 'active' : ''} onClick={() => handleTabChange('home_visit')}>
            Home Visit
          </button>
          <button type="button" className={tab === 'rentals' ? 'active' : ''} onClick={() => handleTabChange('rentals')}>
            Medical Rentals
          </button>
        </div>
      </div>

      <p className="text-muted home-care__demo-note">
        {tab === 'home_visit'
          ? 'Demo data — booking opens once doctors register for home visits in your area.'
          : 'Demo data — ordering opens once equipment providers register in your area.'}
      </p>

      {message && <div className="alert alert-success">{message}</div>}

      {tab === 'home_visit' ? (
        doctors.length === 0 ? (
          <div className="page-empty">No doctors match this search.</div>
        ) : (
          <div className="provider-list">
            {doctors.map((doctor) => {
              const requested = requestedDoctorIds.has(doctor.id);
              return (
                <div key={doctor.id} className="card home-care-card">
                  <div className="home-care-card__head">
                    <h3>{doctor.name}</h3>
                    {doctor.availableToday && <span className="badge badge-verified">Available today</span>}
                  </div>
                  <p className="text-muted">
                    {doctor.specialty} · {doctor.qualification}
                  </p>
                  <p className="text-muted">{doctor.experienceYears} years experience</p>
                  <div className="home-care-card__rating">
                    <RatingStars rating={doctor.rating} />
                    <span className="text-muted">
                      {doctor.rating.toFixed(1)} ({doctor.reviewCount} reviews)
                    </span>
                  </div>
                  <p className="text-muted">{doctor.serviceArea}</p>
                  <p className="text-muted">Speaks {doctor.languages.join(', ')}</p>
                  <p className="home-care-card__price">₹{doctor.consultationFee} / home visit</p>
                  <button
                    className="btn btn-primary"
                    disabled={requested}
                    onClick={() => handleRequestDoctor(doctor.id, doctor.name)}
                  >
                    {requested ? 'Requested' : 'Request home visit'}
                  </button>
                </div>
              );
            })}
          </div>
        )
      ) : rentals.length === 0 ? (
        <div className="page-empty">No equipment matches this search.</div>
      ) : (
        <div className="provider-list">
          {rentals.map((item) => {
            const requested = requestedRentalIds.has(item.id);
            return (
              <div key={item.id} className="card home-care-card">
                <h3>{item.name}</h3>
                <p className="text-muted">
                  {item.category} · {RENTAL_TYPE_LABELS[item.offeringType]}
                </p>
                <p className="text-muted">{item.providerName}</p>
                <p className="home-care-card__price">
                  ₹{item.price}
                  {item.offeringType === 'equipment_rental' && '/day'}
                </p>
                {item.availableQuantity !== null && (
                  <p className="text-muted">{item.availableQuantity} available</p>
                )}
                <button
                  className="btn btn-primary"
                  disabled={requested}
                  onClick={() => handleRequestRental(item.id, item.name)}
                >
                  {requested ? 'Requested' : item.offeringType === 'equipment_purchase' ? 'Request to buy' : 'Request rental'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
