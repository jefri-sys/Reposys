import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';

const isValidPassword = (value) =>
  value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (formData.newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(formData.newPassword)) score += 1;
    if (/[0-9]/.test(formData.newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(formData.newPassword)) score += 1;
    return score;
  }, [formData.newPassword]);

  const passwordLabel = useMemo(() => {
    if (!formData.newPassword) {
      return { className: 'pw-label', text: 'Must contain uppercase, number and special character' };
    }
    if (passwordStrength <= 1) {
      return { className: 'pw-label weak', text: 'Weak - add uppercase, numbers and symbols' };
    }
    if (passwordStrength <= 2) {
      return { className: 'pw-label medium', text: 'Medium - add more complexity' };
    }
    if (passwordStrength === 3) {
      return { className: 'pw-label medium', text: 'Good - one more character type for Strong' };
    }
    return { className: 'pw-label strong', text: 'Strong password' };
  }, [formData.newPassword, passwordStrength]);

  const criteria = [
    { label: 'At least 8 characters', valid: formData.newPassword.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(formData.newPassword) },
    { label: 'One number', valid: /[0-9]/.test(formData.newPassword) },
    { label: 'One special character', valid: /[^A-Za-z0-9]/.test(formData.newPassword) },
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!token) {
      setStatus('error');
      setMessage('This reset link is missing or invalid. Request a fresh password reset email.');
      return;
    }

    if (!isValidPassword(formData.newPassword)) {
      setStatus('error');
      setMessage(
        'Password must be at least 8 characters long and include 1 uppercase letter, 1 number, and 1 special character.'
      );
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setStatus('loading');

    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword: formData.newPassword,
      });
      setStatus('success');
      setMessage(response.data.message || 'Password reset successful.');
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Failed to reset password.');
    }
  };

  return (
    <AuthLayout
      containerClassName="auth-container-forgot"
      leftTagline="Password Recovery"
      headline="Set a new<br /><em>secure</em><br />password."
      description="Create a strong replacement password to restore access to your Reposys account and protect your workflow."
      note={{
        tone: 'gold',
        content:
          'Reset links expire in 1 hour. If the link has expired or already been used, request a fresh reset email from the recovery page.',
      }}
      features={[
        {
          text: 'Live password-strength feedback',
          icon: (
            <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
        },
        {
          text: 'Policy aligned with Reposys security rules',
          icon: (
            <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          text: 'Fast recovery back to sign in',
          icon: (
            <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ]}
      rightPanelClassName={status === 'success' ? 'forgot-step2' : ''}
    >
      <Link className="back-link" to="/forgot-password">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Recovery
      </Link>

      <div className="form-header">
        <h1 className="form-title">Set new password</h1>
        <p className="form-subtitle">
          {token
            ? 'Choose a strong password that meets the Reposys security policy'
            : 'This reset link is incomplete. Request a fresh password reset email to continue'}
        </p>
      </div>

      {status === 'success' ? (
        <div className="forgot-success">
          <div className="forgot-success-icon">
            <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="form-title">Password updated</h1>
          <p className="forgot-success-copy">
            {message || 'Your password has been reset successfully. You can now sign in with your new credentials.'}
          </p>

          <div className="alert alert-success">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span>Your old reset token can no longer be used. For security, sign in again with the new password.</span>
          </div>

          <Link
            className="btn-primary"
            to="/login"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Continue to Login
          </Link>
          <Link
            className="btn-secondary"
            to="/forgot-password"
          >
            Request another reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {status === 'error' ? <div className="alert alert-error">{message}</div> : null}

          {!token ? (
            <div className="alert alert-info">
              <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>Open the full reset link from your email, or request a new one if this link was copied incorrectly.</span>
            </div>
          ) : null}

          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="input-wrap">
              <svg className="input-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={formData.newPassword}
                onChange={handleChange}
                disabled={!token || status === 'loading'}
                required
              />
              <button className="input-suffix" type="button" onClick={() => setShowNewPassword((current) => !current)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
            <div className="pw-strength">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`pw-bar ${bar <= passwordStrength ? (passwordStrength <= 1 ? 'weak' : passwordStrength <= 3 ? 'medium' : 'strong') : ''}`}
                />
              ))}
            </div>
            <div className={passwordLabel.className}>{passwordLabel.text}</div>
          </div>

          <div className="reset-criteria">
            {criteria.map((criterion) => (
              <div key={criterion.label} className={`reset-criteria-item ${criterion.valid ? 'active' : ''}`}>
                <span className="reset-criteria-dot" />
                <span>{criterion.label}</span>
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: '16px', marginBottom: '18px' }}>
            <label className="form-label">Confirm New Password</label>
            <div className="input-wrap">
              <svg className="input-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Re-enter your new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={!token || status === 'loading'}
                required
              />
              <button
                className="input-suffix"
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={!token || status === 'loading'}>
            {status === 'loading' ? 'Updating Password...' : 'Set New Password'}
          </button>

          <div className="form-footer" style={{ marginTop: '16px' }}>
            Need a fresh link? <Link to="/forgot-password">Request password reset</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
