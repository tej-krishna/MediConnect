import { Link } from 'react-router-dom';
import './LandingPage.css';

export function LandingPage() {
  return (
    <div>
      <section className="hero">
        <div className="container hero__inner">
          <h1>Find the right care, fast — without the guesswork or the extra cost.</h1>
          <p className="hero__subtitle">
            MediConnect helps you discover verified doctors, hospitals, clinics, pharmacies, and
            diagnostic labs near you — with real consultation fees and availability, not guesswork.
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
      </section>

      <section className="container">
        <div className="feature-grid">
          <div className="card">
            <h3>Verified providers only</h3>
            <p className="text-muted">
              Every doctor, hospital, pharmacy, and lab you see has gone through a manual
              verification review before appearing on MediConnect.
            </p>
          </div>
          <div className="card">
            <h3>Transparent fees</h3>
            <p className="text-muted">
              See consultation fees and operating hours up front, so you're not surprised at the
              clinic desk.
            </p>
          </div>
          <div className="card">
            <h3>Built for every area</h3>
            <p className="text-muted">
              Whether you're new in a city or looking for care closer to home in a rural area,
              search by your current location or by city name.
            </p>
          </div>
        </div>
      </section>

      <section className="container mission">
        <h2>Our mission</h2>
        <p>
          Reduce unnecessary cost, not necessary care. MediConnect exists to help people find
          trustworthy healthcare quickly — especially when they're new to an area, uncertain where
          to go, or trying to avoid an expensive visit for something a local provider could have
          handled. Patient safety always comes before price.
        </p>
      </section>
    </div>
  );
}
