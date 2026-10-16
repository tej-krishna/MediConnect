import { Link } from 'react-router-dom';
import './LandingPage.css';

const STEPS = [
  {
    title: 'Tell us what you need',
    body: 'Search by condition, specialty, or location — or jump straight to medicines, diagnostics, or home care.',
  },
  {
    title: 'Compare verified options',
    body: 'Every result has been through a manual review. Fees, hours, and distance are shown up front, before you commit to anything.',
  },
  {
    title: 'Book and go',
    body: 'Reserve a slot, place an order, or register for a camp in a few taps — no phone tag, no walking in blind.',
  },
];

export function LandingPage() {
  return (
    <div className="landing">
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__copy">
            <span className="eyebrow">Healthcare access, made findable</span>
            <h1>Find the right care, fast — without the guesswork or the extra cost.</h1>
            <p className="hero__subtitle">
              MediConnect helps you discover verified doctors, hospitals, clinics, pharmacies, and
              diagnostic labs near you — with real consultation fees and availability, not
              guesswork.
            </p>
            <div className="hero__actions">
              <Link to="/providers" className="btn btn-primary">
                Find care near me
              </Link>
              <Link to="/register" className="btn btn-secondary">
                Create a free account
              </Link>
            </div>
          </div>

          <div className="hero__panel" aria-hidden="true">
            <div className="snapshot-card">
              <div className="snapshot-card__row">
                <div className="snapshot-card__avatar">DR</div>
                <div>
                  <strong>Dr. A. Krishnan</strong>
                  <span className="text-muted">General Physician · 2.3 km</span>
                </div>
                <span className="badge badge-verified">Verified</span>
              </div>
              <div className="snapshot-card__meta">
                <div>
                  <span className="snapshot-card__label">Consultation</span>
                  <strong>₹400</strong>
                </div>
                <div>
                  <span className="snapshot-card__label">Next slot</span>
                  <strong>Today, 5:30 PM</strong>
                </div>
              </div>
            </div>
            <div className="snapshot-card snapshot-card--secondary">
              <div className="snapshot-card__row">
                <div className="snapshot-card__avatar snapshot-card__avatar--alt">PH</div>
                <div>
                  <strong>Sunrise Pharmacy</strong>
                  <span className="text-muted">Open now · delivers in 40 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container how-it-works">
        <h2>How it works</h2>
        <div className="steps">
          {STEPS.map((step, index) => (
            <div className="step" key={step.title}>
              <span className="step__number">{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p className="text-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="feature-band">
        <div className="container feature-rows">
          <div className="feature-row">
            <h3>Verified providers only</h3>
            <p className="text-muted">
              Every doctor, hospital, pharmacy, and lab you see has gone through a manual
              verification review before appearing on MediConnect. No listings, no paid
              placement — just providers our team has actually checked.
            </p>
          </div>
          <div className="feature-row">
            <h3>Transparent fees</h3>
            <p className="text-muted">
              See consultation fees and operating hours up front, so you're not surprised at the
              clinic desk or quoted a different price once you've already made the trip.
            </p>
          </div>
          <div className="feature-row">
            <h3>Built for every area</h3>
            <p className="text-muted">
              Whether you're new in a city or looking for care closer to home in a rural area,
              search by your current location or by city name — MediConnect doesn't assume
              you're already somewhere well-served.
            </p>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="mission">
          <span className="eyebrow">Our mission</span>
          <p>
            Reduce unnecessary cost, not necessary care. MediConnect exists to help people find
            trustworthy healthcare quickly — especially when they're new to an area, uncertain
            where to go, or trying to avoid an expensive visit for something a local provider
            could have handled. Patient safety always comes before price.
          </p>
        </div>
      </section>
    </div>
  );
}
