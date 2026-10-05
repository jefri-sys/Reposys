import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';
import { toAppPath } from '../../utils/appPath';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.data?.resetUrl) {
        navigate(toAppPath(response.data.resetUrl, '/reset-password'), { replace: true });
        return;
      }

      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send recovery link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      containerClassName="auth-container-forgot"
      leftTagline="Account Recovery"
      headline="Recover your<br><em>access</em> in<br>seconds."
      description="Enter your registered email and we'll send you a secure link to reset your password."
      note={{
        tone: 'gold',
        content:
          'Reset links expire in 1 hour. For security, we never confirm whether an email is registered.',
      }}
      rightPanelClassName={step === 2 ? 'forgot-step2' : ''}
    >
      {step === 1 ? (
        <>
          <Link className="back-link" to="/login">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Login
          </Link>

          <div className="form-header">
            <h1 className="form-title">Reset password</h1>
            <p className="form-subtitle">We&apos;ll send a recovery link to your email</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error ? <div className="alert alert-error">{error}</div> : null}

            <div className="form-group">
              <label className="form-label">Institutional Email</label>
              <div className="input-wrap">
                <svg className="input-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  placeholder="your.name@saintgits.org"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <p className="helper-text">Enter the email address associated with your Reposys account.</p>
            </div>

            <button className="btn-primary" type="submit" style={{ marginTop: '6px' }} disabled={loading}>
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <div className="form-footer" style={{ marginTop: '16px' }}>
              Remembered it? <Link to="/login">Sign in</Link>
            </div>
          </form>
        </>
      ) : (
        <div className="forgot-success">
          <div className="forgot-success-icon">
            <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0L9.75 14.5" />
            </svg>
          </div>

          <h1 className="form-title">Check your inbox</h1>
          <p className="forgot-success-copy">
            We&apos;ve sent a password reset link to
            <strong>{email || 'your email'}</strong>
          </p>

          <div className="alert alert-info">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>
              The link expires in <strong>1 hour</strong>. Check your spam folder if you don&apos;t see it within 2 minutes.
            </span>
          </div>

          <button className="btn-secondary" type="button" onClick={() => setStep(1)}>
            Resend email
          </button>
          <Link className="btn-primary" to="/login" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Back to Login
          </Link>
        </div>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
