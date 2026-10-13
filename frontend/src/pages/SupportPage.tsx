import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createTicket, listMyTickets } from '../services/supportService';
import { ApiError } from '../services/apiClient';
import { TICKET_CATEGORY_LABELS } from '../types/support';
import type { SupportTicket, TicketCategory } from '../types/support';
import './ProviderDashboardPage.css';

export function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { tickets: items } = await listMyTickets();
      setTickets(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createTicket({ subject, category, description });
      setSubject('');
      setDescription('');
      setMessage('Your ticket has been submitted — our support team will respond here.');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="container dashboard-page">
      <h1>Help & support</h1>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <h3>Raise a new ticket</h3>
        <form onSubmit={handleSubmit} className="inline-form">
          <div className="form-field">
            <label htmlFor="subject">Subject</label>
            <input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="category">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
              {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field" style={{ flexBasis: '100%' }}>
            <label htmlFor="description">Describe the issue</label>
            <textarea id="description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>My tickets</h3>
        {tickets.length === 0 ? (
          <p className="text-muted">You haven't raised any support tickets yet.</p>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {tickets.map((t) => (
              <li key={t.id}>
                <Link to={`/support/${t.id}`}>
                  {t.subject} — {TICKET_CATEGORY_LABELS[t.category]} ({t.status.replace(/_/g, ' ')})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
