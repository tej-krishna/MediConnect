import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../app/AuthContext';
import { listTransactions, settleTransaction } from '../services/transactionService';
import { ApiError } from '../services/apiClient';
import type { Transaction } from '../types/payments';
import './ProviderDashboardPage.css';

export function AdminTransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const isAdmin = user?.roles.includes('super_admin');

  const reload = useCallback(async () => {
    try {
      const { transactions: items } = await listTransactions();
      setTransactions(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) reload();
    else setLoading(false);
  }, [isAdmin, reload]);

  if (!isAdmin) {
    return <div className="page-error">Only platform admins can settle transactions.</div>;
  }

  async function handleSettle(id: string, outcome: 'completed' | 'rejected') {
    setError(null);
    try {
      await settleTransaction(id, outcome, notesDraft[id]?.trim() || undefined);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not settle this transaction.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="container dashboard-page">
      <h1>Refund transactions</h1>
      <p className="text-muted">
        No payment gateway is integrated yet — these are manual-review refund requests raised from support
        tickets. Settling one here only records that a human processed it outside the platform.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      <table className="simple-table">
        <thead>
          <tr>
            <th>Amount</th>
            <th>Status</th>
            <th>Ticket</th>
            <th>Notes</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>₹{t.amount}</td>
              <td>{t.status.replace(/_/g, ' ')}</td>
              <td>{t.supportTicketId.slice(-6)}</td>
              <td>
                {t.status === 'pending_manual_review' ? (
                  <input
                    placeholder="e.g. refunded via bank transfer"
                    value={notesDraft[t.id] ?? ''}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  />
                ) : (
                  t.notes ?? '—'
                )}
              </td>
              <td style={{ display: 'flex', gap: 6 }}>
                {t.status === 'pending_manual_review' && (
                  <>
                    <button className="btn btn-primary" onClick={() => handleSettle(t.id, 'completed')}>
                      Mark completed
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleSettle(t.id, 'rejected')}>
                      Reject
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                No refund transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
