import { useCallback, useEffect, useState } from 'react';
import { listMyAppointments, cancelAppointment } from '../services/schedulingService';
import { ApiError } from '../services/apiClient';
import type { Appointment } from '../types/scheduling';
import './ProviderDashboardPage.css';

export function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setAppointments(await listMyAppointments());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleCancel(id: string) {
    setError(null);
    try {
      await cancelAppointment(id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel this appointment.');
    }
  }

  if (loading) return <div className="page-loading">Loading your appointments…</div>;

  return (
    <div className="container dashboard-page">
      <h1>My appointments</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {appointments.length === 0 ? (
        <div className="page-empty">You don't have any appointments yet.</div>
      ) : (
        <table className="simple-table">
          <thead>
            <tr>
              <th>Booked at</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr key={appt.id}>
                <td>{new Date(appt.bookedAt).toLocaleString()}</td>
                <td>{appt.status}</td>
                <td>
                  {appt.status === 'booked' && (
                    <button className="btn btn-secondary" onClick={() => handleCancel(appt.id)}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
