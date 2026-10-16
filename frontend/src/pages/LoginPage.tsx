import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { ApiError } from '../services/apiClient';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { CrossIcon, DropIcon, PillIcon, PulseIcon, StethoscopeIcon, SyringeIcon } from '../components/MedicalIcons';
import './AuthForm.css';
import './LoginPage.css';

const FEATURES = [
  'Every provider is manually verified before listing',
  'Fees and availability shown before you book',
  'Your medical records stay private — even from admins',
];

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_auth_cancelled: 'Google sign-in was cancelled.',
  google_auth_failed: 'Google sign-in failed. Please try again.',
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const googleError = new URLSearchParams(location.search).get('error');
  const [error, setError] = useState<string | null>(
    googleError ? (GOOGLE_ERROR_MESSAGES[googleError] ?? 'Google sign-in failed. Please try again.') : null,
  );
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/account';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 423) {
        setError('This account is temporarily locked due to repeated failed attempts. Please try again later.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-canvas">
      <div className="login-canvas__decor" aria-hidden="true">
        <div className="feature-float feature-float--1">{FEATURES[0]}</div>
        <div className="feature-float feature-float--2">{FEATURES[1]}</div>
        <div className="feature-float feature-float--3">{FEATURES[2]}</div>
        <span className="icon-float icon-float--1"><CrossIcon /></span>
        <span className="icon-float icon-float--2"><StethoscopeIcon /></span>
        <span className="icon-float icon-float--3"><PulseIcon /></span>
        <span className="icon-float icon-float--4"><PillIcon /></span>
        <span className="icon-float icon-float--5"><DropIcon /></span>
        <span className="icon-float icon-float--6"><SyringeIcon /></span>
      </div>

      <div className="card auth-card login-canvas__card">
        <h1>Log in</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <p className="auth-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <GoogleAuthButton />
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
