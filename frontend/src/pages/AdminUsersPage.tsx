import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../app/AuthContext';
import { listUsers, setUserStatus } from '../services/adminService';
import { ApiError } from '../services/apiClient';
import type { AdminUser } from '../types/admin';
import './ProviderDashboardPage.css';

export function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.roles.includes('super_admin');

  const reload = useCallback(async (searchTerm?: string) => {
    try {
      const { users: items } = await listUsers({ search: searchTerm });
      setUsers(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) reload();
    else setLoading(false);
  }, [isAdmin, reload]);

  if (!isAdmin) {
    return <div className="page-error">Only platform admins can moderate user accounts.</div>;
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await reload(search.trim() || undefined);
  }

  async function handleToggleStatus(target: AdminUser) {
    setError(null);
    try {
      const nextStatus = target.status === 'suspended' ? 'active' : 'suspended';
      await setUserStatus(target.id, nextStatus);
      await reload(search.trim() || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this user.');
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="container dashboard-page">
      <h1>Users</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSearch} className="city-form" style={{ maxWidth: 420, margin: '16px 0' }}>
        <input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>
      <table className="simple-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Roles</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.fullName}</td>
              <td>{u.email}</td>
              <td>{u.roles.join(', ')}</td>
              <td>{u.status}</td>
              <td>
                {!u.roles.includes('super_admin') && (
                  <button className="btn btn-secondary" onClick={() => handleToggleStatus(u)}>
                    {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
