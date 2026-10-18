import { useProviderDashboard } from './ProviderDashboardContext';
import '../ProviderDashboardPage.css';

export function ProviderListingPage() {
  const {
    application,
    fee,
    setFee,
    hoursNote,
    setHoursNote,
    savingListing,
    handleSaveListing,
    togglingAvailability,
    handleToggleAvailability,
    togglingConsultationAvailability,
    handleToggleConsultationAvailability,
    config,
  } = useProviderDashboard();

  if (!application || application.status !== 'approved') return null;

  return (
    <div className="dashboard-page">
      <div className="page-head">
        <h1>Listing settings</h1>
      </div>

      <div className="card">
        <h3>Listing details</h3>
        <form onSubmit={handleSaveListing} className="inline-form">
          <div className="form-field">
            <label htmlFor="fee">Consultation fee (₹)</label>
            <input id="fee" type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="hoursNote">Operating hours</label>
            <input id="hoursNote" value={hoursNote} onChange={(e) => setHoursNote(e.target.value)} placeholder="e.g. Mon-Sat 9am-8pm" />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={savingListing}>
            {savingListing ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>

      {config.hasConsultationsTab && (
        <div className="card">
          <h3>Consultation availability</h3>
          <p className="text-muted">
            Turn these on to let patients request a consultation from you directly. You'll accept
            each request yourself and pick the time on the Consultations tab.
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p>
                Online consultations:{' '}
                <strong>{application.acceptsOnlineConsultations ? 'On' : 'Off'}</strong>
              </p>
              <button
                className="btn btn-secondary"
                disabled={togglingConsultationAvailability}
                onClick={() => handleToggleConsultationAvailability('acceptsOnlineConsultations')}
              >
                {application.acceptsOnlineConsultations ? 'Turn off' : 'Turn on'}
              </button>
            </div>
            <div>
              <p>
                Home visits: <strong>{application.acceptsHomeVisits ? 'On' : 'Off'}</strong>
              </p>
              <button
                className="btn btn-secondary"
                disabled={togglingConsultationAvailability}
                onClick={() => handleToggleConsultationAvailability('acceptsHomeVisits')}
              >
                {application.acceptsHomeVisits ? 'Turn off' : 'Turn on'}
              </button>
            </div>
          </div>
        </div>
      )}

      {config.hasAvailabilityToggle && (
        <div className="card">
          <h3>Availability</h3>
          <p className="text-muted">
            Patients searching for emergency ambulance services see this status. Toggle it off when your vehicle is busy or offline.
          </p>
          <p>
            Currently: <strong>{application.isCurrentlyAvailable ? 'Available' : 'Not available'}</strong>
          </p>
          <button className="btn btn-primary" disabled={togglingAvailability} onClick={handleToggleAvailability}>
            {togglingAvailability ? 'Updating…' : application.isCurrentlyAvailable ? 'Mark as unavailable' : 'Mark as available'}
          </button>
        </div>
      )}
    </div>
  );
}
