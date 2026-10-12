import './StaticPage.css';

export function TermsPage() {
  return (
    <div className="static-page">
      <h1>Terms of use</h1>
      <p className="text-muted">
        <em>
          Draft for development purposes, not yet reviewed by legal counsel. Do not treat this as
          a finalized or enforceable agreement.
        </em>
      </p>

      <section>
        <h2>What MediConnect is</h2>
        <p>
          MediConnect is a directory and booking platform that helps you find verified healthcare
          providers. MediConnect does not itself provide medical advice, diagnosis, or treatment.
        </p>
      </section>

      <section>
        <h2>Not for emergencies</h2>
        <p>
          MediConnect is not an emergency dispatch service. In a medical emergency, contact your
          local emergency number directly rather than searching for a provider on this platform.
        </p>
      </section>

      <section>
        <h2>Verification has limits</h2>
        <p>
          "Verified" means a provider passed MediConnect's manual review of submitted registration
          or licence information at the time of approval. It is not a guarantee of ongoing
          licensure, clinical competence, or service quality.
        </p>
      </section>

      <section>
        <h2>Account responsibilities</h2>
        <p>
          You're responsible for keeping your login credentials confidential and for the accuracy
          of information you submit, including as part of a provider verification application.
        </p>
      </section>
    </div>
  );
}
