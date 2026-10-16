import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/apiClient';
import { AuthBrandPanel } from '../components/AuthBrandPanel';
import './AuthForm.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } finally {
      // Always show the same confirmation, whether or not the email exists on the platform.
      setSubmitting(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="auth-split">
      <AuthBrandPanel />
      <div className="auth-split__form">
      <div className="card auth-card">
        <h1>Forgot password</h1>
        {submitted ? (
          <p>If an account with that email exists, a password reset link has been sent to it.</p>
        ) : (
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
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="auth-switch">
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
      </div>
    </div>
  );
}
