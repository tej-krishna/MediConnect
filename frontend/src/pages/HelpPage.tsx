import './StaticPage.css';

export function HelpPage() {
  return (
    <div className="static-page">
      <h1>Help centre</h1>

      <section>
        <h2>Finding a provider</h2>
        <p>
          Use "Find Care" to search doctors, hospitals, clinics, pharmacies, and diagnostic labs
          near you. Allow location access for distance-sorted results, or search by city if you'd
          rather not share your location.
        </p>
      </section>

      <section>
        <h2>What does "Verified" mean?</h2>
        <p>
          A verified provider has gone through MediConnect's manual review process, including a
          check of their professional registration or facility licence details. Verification
          reduces the risk of fraudulent listings, but you should still use your own judgement,
          especially for urgent or serious conditions.
        </p>
      </section>

      <section>
        <h2>Account and login issues</h2>
        <p>
          Forgot your password? Use "Forgot password" on the login page. If your account is
          temporarily locked after repeated failed login attempts, wait 15 minutes and try again.
        </p>
      </section>

      <section>
        <h2>Is this a substitute for emergency care?</h2>
        <p>
          No. MediConnect helps you find routine and urgent care faster, but it does not replace
          emergency services. If you believe you are facing a medical emergency, contact your
          local emergency number right away.
        </p>
      </section>
    </div>
  );
}
