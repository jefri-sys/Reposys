import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';
import { toAppPath } from '../../utils/appPath';

const VERIFIED_EMAIL_STORAGE_KEY = 'reposys:lastVerifiedEmail';

const verificationFeatures = [
  {
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
        <path d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0L9.75 14.5" />
      </svg>
    ),
    text: 'Verification link sent to your inbox',
  },
  {
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    text: 'Links remain active for 24 hours',
  },
  {
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    text: 'Secure activation before first login',
  },
];

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const initialEmail = searchParams.get('email') || '';

  const [status, setStatus] = useState(token ? 'loading' : initialEmail ? 'pending' : 'error');
  const [message, setMessage] = useState(
    token
      ? 'Verifying your email now...'
      : initialEmail
        ? 'We sent a verification link to your inbox. Open it to activate your account.'
        : 'This verification link is incomplete. Enter your email below and we will resend a fresh one.'
  );
  const [email, setEmail] = useState(initialEmail);
  const [resendStatus, setResendStatus] = useState('');

  const markVerifiedLocally = (verifiedEmail) => {
    if (!verifiedEmail) return;

    window.localStorage.setItem(
      VERIFIED_EMAIL_STORAGE_KEY,
      JSON.stringify({
        email: verifiedEmail.toLowerCase(),
        verifiedAt: Date.now(),
      })
    );
  };

  useEffect(() => {
    if (!initialEmail || token) return;

    const syncFromLocalVerification = () => {
      const storedValue = window.localStorage.getItem(VERIFIED_EMAIL_STORAGE_KEY);
      if (!storedValue) return;

      try {
        const parsed = JSON.parse(storedValue);
        if (parsed?.email?.toLowerCase() === initialEmail.toLowerCase()) {
          setStatus('success');
          setMessage('This email is already verified. Redirecting you to login...');
          window.setTimeout(() => navigate('/login', { replace: true }), 1200);
        }
      } catch {
        window.localStorage.removeItem(VERIFIED_EMAIL_STORAGE_KEY);
      }
    };

    syncFromLocalVerification();
    window.addEventListener('storage', syncFromLocalVerification);

    return () => window.removeEventListener('storage', syncFromLocalVerification);
  }, [initialEmail, navigate, token]);

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const response = await api.get(`/auth/verify-email?token=${token}`);
        markVerifiedLocally(response.data.email);
        setStatus('success');
        setMessage('Email verified. You can now log in. Redirecting you to login...');
        window.setTimeout(() => navigate('/login', { replace: true }), 1800);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification link is invalid or has expired');
      }
    };

    verify();
  }, [navigate, token]);

  const handleResend = async (event) => {
    event.preventDefault();
    if (!email) return;

    setResendStatus('loading');

    try {
      const response = await api.post('/auth/resend-verification', { email });
      if (response.data?.verificationUrl) {
        navigate(toAppPath(response.data.verificationUrl, '/verify-email'), { replace: true });
        return;
      }

      setResendStatus('success');
      setStatus('pending');
      setMessage(response.data.message || 'Verification email resent.');
    } catch (error) {
      setResendStatus('error');
      setStatus('error');
      setMessage(error.response?.data?.message || 'Failed to resend verification email.');
    }
  };

  const showResendForm = status === 'pending' || status === 'error';

  return (
    <AuthLayout
      containerClassName="auth-container-forgot"
      leftTagline="Account Verification"
      headline="Activate your<br /><em>account</em><br />securely."
      description="Use the verification link from your institutional inbox to unlock access to Reposys and complete your onboarding."
      note={{
        tone: 'gold',
        content:
          'Verification links expire in 24 hours. If the email does not appear, check spam or request a new link below.',
      }}
      features={verificationFeatures}
      previewLabel="VERIFY EMAIL"
      rightPanelClassName={status === 'success' ? 'forgot-step2' : ''}
    >
      {status === 'success' ? (
        <div className="forgot-success">
          <div className="forgot-success-icon">
            <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="form-title">Email verified</h1>
          <p className="forgot-success-copy">
            {message}
          </p>

          <div className="alert alert-success">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span>Your account is active now. You will be redirected to the login page automatically.</span>
          </div>

          <Link
            className="btn-primary"
            to="/login"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Continue to Login
          </Link>
        </div>
      ) : (
        <>
          <Link className="back-link" to="/login">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Login
          </Link>

          <div className="form-header">
            <h1 className="form-title">{status === 'pending' ? 'Check your inbox' : 'Verify your email'}</h1>
            <p className="form-subtitle">
              {status === 'pending'
                ? 'Use the verification link we sent to finish setting up your account'
                : 'If your link expired or failed, request a fresh verification email below'}
            </p>
          </div>

          <div className={`alert ${status === 'error' ? 'alert-error' : status === 'loading' ? 'alert-info' : 'alert-success'}`}>
            <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{message}</span>
          </div>

          {status === 'pending' && email ? (
            <div className="email-display">
              <span>Email sent to</span>
              <strong>{email}</strong>
            </div>
          ) : null}

          {showResendForm ? (
            <form onSubmit={handleResend}>
              <div className="form-group">
                <label className="form-label">Institutional Email</label>
                <div className="input-wrap">
                  <svg className="input-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    placeholder="you@saintgits.org"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={resendStatus === 'loading'}
                  />
                </div>
                <p className="helper-text">
                  Enter the email you used to register. We&apos;ll send a fresh activation link immediately.
                </p>
              </div>

              <button className="btn-primary" type="submit" disabled={resendStatus === 'loading'} style={{ marginTop: '8px' }}>
                {resendStatus === 'loading' ? 'Sending verification...' : 'Resend Verification Email'}
              </button>

              <div className="form-footer" style={{ marginTop: '16px' }}>
                Already activated? <Link to="/login">Sign in</Link>
              </div>
            </form>
          ) : null}
        </>
      )}
    </AuthLayout>
  );
};

export default VerifyEmail;
