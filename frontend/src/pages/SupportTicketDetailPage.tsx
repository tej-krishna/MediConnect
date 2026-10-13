import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { getTicket, addMessage, updateTicketStatus } from '../services/supportService';
import { ApiError } from '../services/apiClient';
import { TICKET_CATEGORY_LABELS } from '../types/support';
import type { SupportTicket } from '../types/support';
import './ProviderDashboardPage.css';

export function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  const isStaff = user?.roles.includes('support') || user?.roles.includes('super_admin');

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      setTicket(await getTicket(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this ticket.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!id || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await addMessage(id, body.trim());
      setBody('');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  }

  async function handleStatusAction(action: 'assign_to_me' | 'start_progress' | 'resolve' | 'close' | 'reopen') {
    if (!id) return;
    setError(null);
    try {
      if (action === 'resolve' && !resolutionNote.trim()) {
        setError('Add a resolution note before resolving.');
        return;
      }
      await updateTicketStatus(id, action, action === 'resolve' ? resolutionNote.trim() : undefined);
      setResolutionNote('');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this ticket.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!ticket) return <div className="page-error">{error ?? 'Ticket not found.'}</div>;

  return (
    <div className="container dashboard-page">
      <h1>{ticket.subject}</h1>
      <p className="text-muted">
        {TICKET_CATEGORY_LABELS[ticket.category]} · {ticket.status.replace(/_/g, ' ')}
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <p>{ticket.description}</p>
        {ticket.resolutionNote && (
          <p className="alert alert-success">Resolution: {ticket.resolutionNote}</p>
        )}
      </div>

      <div className="card">
        <h3>Messages</h3>
        {ticket.messages.length === 0 && <p className="text-muted">No messages yet.</p>}
        {ticket.messages.map((m, i) => (
          <p key={i}>
            <strong>{m.senderId === user?.id ? 'You' : m.senderId === ticket.createdBy ? 'Patient' : 'Support'}:</strong> {m.body}
          </p>
        ))}
        {ticket.status !== 'closed' && (
          <form onSubmit={handleSendMessage} className="inline-form">
            <div className="form-field" style={{ flexBasis: '100%' }}>
              <label htmlFor="body">Message</label>
              <input id="body" required value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
        {ticket.status === 'closed' && <p className="text-muted">This ticket is closed. Reopen it to add more messages.</p>}
      </div>

      {isStaff && (
        <div className="card">
          <h3>Staff actions</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {!ticket.assignedTo && (
              <button className="btn btn-secondary" onClick={() => handleStatusAction('assign_to_me')}>
                Assign to me
              </button>
            )}
            {ticket.status === 'open' && (
              <button className="btn btn-secondary" onClick={() => handleStatusAction('start_progress')}>
                Start progress
              </button>
            )}
            {(ticket.status === 'open' || ticket.status === 'in_progress') && (
              <button className="btn btn-secondary" onClick={() => handleStatusAction('close')}>
                Close
              </button>
            )}
            {(ticket.status === 'resolved' || ticket.status === 'closed') && (
              <button className="btn btn-secondary" onClick={() => handleStatusAction('reopen')}>
                Reopen
              </button>
            )}
          </div>
          {(ticket.status === 'open' || ticket.status === 'in_progress') && (
            <div className="inline-form">
              <div className="form-field" style={{ flexBasis: '100%' }}>
                <label htmlFor="resolutionNote">Resolution note</label>
                <input id="resolutionNote" value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={() => handleStatusAction('resolve')}>
                Mark resolved
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
