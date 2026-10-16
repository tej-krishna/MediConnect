const POINTS = [
  'Every provider is manually verified before listing',
  'Fees and availability shown before you book',
  'Your medical records stay private — even from admins',
];

export function AuthBrandPanel() {
  return (
    <div className="auth-split__brand">
      <div className="auth-split__brand-top">
        <span className="eyebrow">MediConnect</span>
        <h2>Healthcare access shouldn't take guesswork.</h2>
        <ul className="auth-split__points">
          {POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <p className="auth-split__brand-foot">Trusted by patients across urban and rural India.</p>
    </div>
  );
}
