import './StaticPage.css';

export function ContactPage() {
  return (
    <div className="static-page">
      <h1>Contact us</h1>
      <p>
        For account or billing questions, reach the MediConnect support team through the Help
        Centre's contact form once you're signed in, so we can verify your account securely.
      </p>
      <p className="text-muted">
        <strong>Medical emergency?</strong> Do not wait for a reply here — call your local
        emergency number immediately.
      </p>
      <h2>Providers</h2>
      <p>
        If you run a clinic, hospital, pharmacy, diagnostic lab, or other healthcare service and
        want to join MediConnect, register for an account and submit a provider verification
        application from your dashboard.
      </p>
    </div>
  );
}
