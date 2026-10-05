import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  CreditCard,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContextObject';
import api from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';
import { toAppPath } from '../../utils/appPath';

const features = [
  {
    icon: <Sparkles style={{ width: '18px', height: '18px' }} />,
    text: 'AI-powered document analysis & cost estimation',
  },
  {
    icon: <Clock style={{ width: '18px', height: '18px' }} />,
    text: 'Live queue monitoring & SMS/email ready alerts',
  },
  {
    icon: <CreditCard style={{ width: '18px', height: '18px' }} />,
    text: 'Instant UPI, Razorpay & Reposys wallet pay',
  },
];

const ModernProcessingGraphic = () => (
  <svg width="260" height="170" viewBox="0 0 260 170" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cardGrad" x1="0" y1="0" x2="260" y2="170" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1e293b" stopOpacity="0.8" />
        <stop offset="1" stopColor="#0f172a" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="scanBeam" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" stopOpacity="0.4" />
        <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
      </linearGradient>
      <filter id="glow" x="0" y="0" width="260" height="170" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Backdrop Terminal Card */}
    <rect x="25" y="15" width="210" height="140" rx="16" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

    {/* Terminal Header */}
    <circle cx="45" cy="32" r="3.5" fill="#ef4444" opacity="0.8" />
    <circle cx="56" cy="32" r="3.5" fill="#f59e0b" opacity="0.8" />
    <circle cx="67" cy="32" r="3.5" fill="#10b981" opacity="0.8" />
    <rect x="85" y="28" width="80" height="8" rx="4" fill="rgba(255,255,255,0.08)" />

    {/* Paper Sheet in Processing */}
    <rect x="65" y="48" width="130" height="88" rx="6" fill="#ffffff" fillOpacity="0.07" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

    {/* Document Skeleton Lines */}
    <rect x="80" y="62" width="70" height="5" rx="2.5" fill="#3b82f6" fillOpacity="0.7" />
    <rect x="80" y="74" width="100" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
    <rect x="80" y="84" width="90" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
    <rect x="80" y="94" width="60" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
    <rect x="80" y="104" width="85" height="4" rx="2" fill="rgba(255,255,255,0.25)" />

    {/* Dynamic Laser Scanning Beam */}
    <g>
      <rect x="65" y="48" width="130" height="30" fill="url(#scanBeam)">
        <animate attributeName="y" values="48;105;48" dur="3s" repeatCount="indefinite" />
      </rect>
      <line x1="65" y1="48" x2="195" y2="48" stroke="#60a5fa" strokeWidth="2">
        <animate attributeName="y1" values="48;135;48" dur="3s" repeatCount="indefinite" />
        <animate attributeName="y2" values="48;135;48" dur="3s" repeatCount="indefinite" />
      </line>
    </g>

    {/* Status Chip */}
    <rect x="150" y="120" width="40" height="12" rx="6" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="0.8" />
    <circle cx="156" cy="126" r="2" fill="#10b981" />
  </svg>
);

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setNotice(location.state?.message || '');
  }, [location.state]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setResendStatus('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      login(response.data.user, response.data.token);

      const role = response.data.user.role;
      if (role === 'Student' || role === 'Faculty') navigate('/dashboard');
      else if (role === 'Staff') navigate('/staff');
      else if (role === 'Admin') navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('Enter your email first so we can resend the verification link.');
      return;
    }

    setResendStatus('loading');
    try {
      const response = await api.post('/auth/resend-verification', { email: formData.email });
      if (response.data?.verificationUrl) {
        navigate(toAppPath(response.data.verificationUrl, '/verify-email'), { replace: true });
        return;
      }

      setResendStatus('success');
      setError(response.data.message || 'Verification email resent.');
    } catch (err) {
      setResendStatus('error');
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    }
  };

  const verificationBlocked = error === 'Please verify your email before logging in.';

  return (
    <AuthLayout
      headline="Campus printing,<br><em>reimagined.</em>"
      description="A high-speed unified platform for print, scan, photocopy, binding and document management."
      features={features}
      leftGraphic={<ModernProcessingGraphic />}
    >
      <div className="form-header">
        <h1 className="form-title">Welcome back</h1>
        <p className="form-subtitle">Enter your institutional credentials to access your Reposys portal</p>
      </div>

      <form onSubmit={handleSubmit}>
        {notice && !error ? (
          <div className="alert alert-info">
            <CheckCircle2 />
            <div>{notice}</div>
          </div>
        ) : null}

        {error ? (
          <div className={`alert ${verificationBlocked || resendStatus === 'success' ? 'alert-info' : 'alert-error'}`}>
            <AlertCircle />
            <div style={{ width: '100%' }}>
              <div>{error}</div>
              {verificationBlocked ? (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: 0, width: 'auto', padding: '0 16px', height: '36px', fontSize: '13px' }}
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'loading'}
                  >
                    {resendStatus === 'loading' ? (
                      <>
                        <RefreshCw className="spin" style={{ width: '14px', height: '14px' }} />
                        Sending...
                      </>
                    ) : (
                      'Resend verification email'
                    )}
                  </button>
                  <Link
                    to={`/verify-email?email=${encodeURIComponent(formData.email)}`}
                    className="btn-secondary"
                    style={{ marginTop: 0, width: 'auto', padding: '0 16px', height: '36px', fontSize: '13px' }}
                  >
                    Open verify page
                    <ExternalLink style={{ width: '13px', height: '13px' }} />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="form-group">
          <label className="form-label">
            <span>Institutional Email</span>
          </label>
          <div className="input-wrap">
            <Mail className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="e.g. yourname@saintgits.org"
              required
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <span>Password</span>
          </label>
          <div className="input-wrap">
            <Lock className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter your password"
              required
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            <button
              className="input-suffix"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff style={{ width: '18px', height: '18px' }} />
              ) : (
                <Eye style={{ width: '18px', height: '18px' }} />
              )}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div className="check-row" style={{ margin: 0 }}>
            <input type="checkbox" id="remember" />
            <label htmlFor="remember" className="check-label">
              Remember me
            </label>
          </div>
          <Link
            to="/forgot-password"
            style={{ fontSize: '13.5px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
          >
            Forgot password?
          </Link>
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="spin" style={{ width: '18px', height: '18px' }} />
              Signing in...
            </>
          ) : (
            <>
              <span>Sign In to Reposys</span>
              <ArrowRight style={{ width: '18px', height: '18px' }} />
            </>
          )}
        </button>

        <div className="divider">or</div>

        <Link className="btn-secondary" to="/register">
          Create new account
        </Link>

        {/* Walk-in Guest Kiosk Callout */}
        <Link to="/guest" className="guest-kiosk-banner">
          <div className="guest-kiosk-info">
            <div className="guest-kiosk-icon">
              <Compass style={{ width: '20px', height: '20px' }} />
            </div>
            <div className="guest-kiosk-text">
              <h4>Walk-in without an account?</h4>
              <p>Place immediate one-time orders via Guest Kiosk</p>
            </div>
          </div>
          <div className="guest-kiosk-arrow">
            <span>Kiosk</span>
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </div>
        </Link>
      </form>
    </AuthLayout>
  );
};

export default Login;
