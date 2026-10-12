import { useAuth } from '../app/AuthContext';

export function AccountPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: 560 }}>
      <h1>My account</h1>
      <div className="card">
        <p>
          <strong>Name:</strong> {user.fullName}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        {user.phone && (
          <p>
            <strong>Phone:</strong> {user.phone}
          </p>
        )}
        <p>
          <strong>Account type:</strong> {user.roles.join(', ')}
        </p>
      </div>
    </div>
  );
}
