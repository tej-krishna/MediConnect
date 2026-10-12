import './StaticPage.css';

export function PrivacyPage() {
  return (
    <div className="static-page">
      <h1>Privacy policy</h1>
      <p className="text-muted">
        <em>
          Draft for development purposes. This page has not yet been reviewed by legal counsel
          against applicable data-protection and healthcare regulations, and should not be relied
          on as a finalized policy.
        </em>
      </p>

      <section>
        <h2>What we collect</h2>
        <p>
          Account details you provide (name, email, phone), and, for patients, health-related
          information you choose to add to your medical records — allergies, medications,
          prescriptions, and diagnostic reports.
        </p>
      </section>

      <section>
        <h2>How medical records are protected</h2>
        <p>
          Medical records and identity/verification documents are stored separately from ordinary
          profile data, with stricter access control: only you, caregivers you explicitly grant
          access to, and clinicians directly involved in your care can view them. Access to
          sensitive records is logged.
        </p>
      </section>

      <section>
        <h2>Location data</h2>
        <p>
          If you grant location permission to search for nearby providers, your coordinates are
          used only to compute distance for that search and are not stored against your account.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can request correction or deletion of your personal data, subject to records we are
          legally required to retain.
        </p>
      </section>
    </div>
  );
}
