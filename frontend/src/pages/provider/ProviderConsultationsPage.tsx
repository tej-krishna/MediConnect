import { Link } from 'react-router-dom';
import { useProviderDashboard } from './ProviderDashboardContext';
import '../ProviderDashboardPage.css';

export function ProviderConsultationsPage() {
  const {
    application,
    consultations,
    confirmDateTimes,
    setConfirmDateTimes,
    handleConfirmConsultation,
    handleCompleteConsultation,
    handleCancelConsultationAsDoctor,
  } = useProviderDashboard();

  if (!application || application.status !== 'approved') return null;

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <h1>Consultations</h1>
      </div>

      <div className="card">
        <h3>Requests</h3>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Patient visit</th>
              <th>Preferred time</th>
              <th>Confirmed time</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {consultations.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.visitType === 'online' ? 'Online' : 'Home visit'}
                  {c.homeVisitAddress && (
                    <>
                      <br />
                      <span className="text-muted">
                        {c.homeVisitAddress.line1}, {c.homeVisitAddress.city}
                      </span>
                    </>
                  )}
                </td>
                <td>{new Date(c.preferredDateTime).toLocaleString()}</td>
                <td>{c.confirmedDateTime ? new Date(c.confirmedDateTime).toLocaleString() : '—'}</td>
                <td>{c.status.replace(/_/g, ' ')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {c.status === 'requested' && (
                      <>
                        <input
                          type="datetime-local"
                          value={confirmDateTimes[c.id] ?? ''}
                          onChange={(e) => setConfirmDateTimes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        />
                        <button className="btn btn-secondary" onClick={() => handleConfirmConsultation(c.id)}>
                          Accept &amp; set time
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleCancelConsultationAsDoctor(c.id)}>
                          Decline
                        </button>
                      </>
                    )}
                    {c.status === 'confirmed' && c.visitType === 'online' && (
                      <Link to={`/consultations/${c.id}/call`} className="btn btn-primary">
                        Join call
                      </Link>
                    )}
                    {c.status === 'confirmed' && c.visitType === 'home_visit' && (
                      <Link to={`/consultations/${c.id}/check-in`} className="btn btn-primary">
                        Check in
                      </Link>
                    )}
                    {c.status === 'confirmed' && (
                      <button className="btn btn-secondary" onClick={() => handleCompleteConsultation(c.id)}>
                        Mark completed
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {consultations.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted">
                  No consultation requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
