import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  CreditCard,
  Mail,
  Building2,
  Phone,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
} from 'lucide-react';
import api from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';
import { toAppPath } from '../../utils/appPath';

const registerFeatures = [
  {
    icon: <GraduationCap style={{ width: '18px', height: '18px' }} />,
    text: 'Student & Faculty dedicated queues with priority dispatch',
  },
  {
    icon: <Sparkles style={{ width: '18px', height: '18px' }} />,
    text: 'Automated page-count, orientation & binding analysis',
  },
  {
    icon: <CreditCard style={{ width: '18px', height: '18px' }} />,
    text: 'Built-in Reposys wallet & fast Razorpay integration',
  },
];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    collegeId: '',
    email: '',
    department: '',
    phone: '',
    role: 'Student',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'collegeId' ? value.toUpperCase() : value,
    }));
  };

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (formData.password.length >= 8) score += 1;
    if (/[A-Z]/.test(formData.password)) score += 1;
    if (/[0-9]/.test(formData.password)) score += 1;
    if (/[^A-Za-z0-9]/.test(formData.password)) score += 1;
    return score;
  }, [formData.password]);

  const passwordLabel = useMemo(() => {
    if (!formData.password) {
      return { className: 'pw-label', text: 'Must contain at least 8 characters, uppercase, number and symbol' };
    }
    if (passwordStrength <= 1) {
      return { className: 'pw-label weak', text: 'Weak — add uppercase, numbers and symbols' };
    }
    if (passwordStrength <= 2) {
      return { className: 'pw-label medium', text: 'Medium — add special character or extra length' };
    }
    if (passwordStrength === 3) {
      return { className: 'pw-label medium', text: 'Good — add one more character type for maximum security' };
    }
    return { className: 'pw-label strong', text: 'Strong password' };
  }, [formData.password, passwordStrength]);

  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword: _confirmPassword, ...registerData } = formData;
      const response = await api.post('/auth/register', registerData);
      if (response.data?.verificationUrl) {
        navigate(toAppPath(response.data.verificationUrl, '/verify-email'), { replace: true });
        return;
      }

      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      wrapperClassName="auth-wrapper-top"
      rightPanelClassName="register-panel"
      leftTagline="New Account Registration"
      headline="Join the<br><em>Reposys</em><br>system."
      description="Register with your institutional credentials to access modern printing, scanning, photocopy, and binding services."
      features={registerFeatures}
      note={{
        label: 'Registration Note',
        content:
          'Faculty accounts are reviewed by the administration before role activation. Students receive immediate access upon email verification.',
      }}
    >
      <div className="form-header" style={{ marginBottom: '18px' }}>
        <h1 className="form-title">Create your account</h1>
        <p className="form-subtitle">Fill in your institutional credentials to get started with Reposys</p>
      </div>

      <div className="steps">
        <div className={`step ${formData.name || formData.collegeId || formData.email ? 'active' : ''}`} />
        <div className={`step ${formData.department || formData.role ? 'active' : ''}`} />
        <div className={`step ${passwordStrength >= 3 && passwordsMatch ? 'active' : ''}`} />
      </div>

      <form className="form-scroll" onSubmit={handleSubmit}>
        {error ? (
          <div className="alert alert-error">
            <AlertCircle />
            <div>{error}</div>
          </div>
        ) : null}

        {/* Section 1: Personal Details */}
        <div className="section-divider" style={{ marginTop: '4px' }}>
          <span className="section-divider-title">1. Personal Information</span>
          <div className="section-divider-line" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-wrap">
              <User className="input-icon" />
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                required
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">College ID</label>
            <div className="input-wrap">
              <CreditCard className="input-icon" />
              <input
                type="text"
                name="collegeId"
                placeholder="Enter your college ID"
                required
                value={formData.collegeId}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Institutional Email</label>
          <div className="input-wrap">
            <Mail className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="Enter institutional email"
              required
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Department</label>
            <div className="input-wrap">
              <Building2 className="input-icon" />
              <select
                name="department"
                required
                value={formData.department}
                onChange={handleChange}
              >
                <option value="" disabled>
                  Select department
                </option>
                <option>Computer Science & Engineering</option>
                <option>Electronics & Communication</option>
                <option>Mechanical Engineering</option>
                <option>Civil Engineering</option>
                <option>Information Technology</option>
                <option>Electrical Engineering</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Phone</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '11px' }}>Optional</span>
            </label>
            <div className="input-wrap">
              <Phone className="input-icon" />
              <input
                type="tel"
                name="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Institutional Role */}
        <div className="section-divider">
          <span className="section-divider-title">2. Institutional Role</span>
          <div className="section-divider-line" />
        </div>

        <div className="form-group">
          <div className="role-toggle">
            <div className="role-option">
              <input
                type="radio"
                name="role"
                id="role-student"
                value="Student"
                checked={formData.role === 'Student'}
                onChange={handleChange}
              />
              <label className="role-label" htmlFor="role-student">
                <div className="role-label-icon">
                  <GraduationCap style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <div style={{ lineHeight: 1.2, marginTop: '2px' }}>Student</div>
                </div>
              </label>
            </div>

            <div className="role-option">
              <input
                type="radio"
                name="role"
                id="role-faculty"
                value="Faculty"
                checked={formData.role === 'Faculty'}
                onChange={handleChange}
              />
              <label className="role-label" htmlFor="role-faculty">
                <div className="role-label-icon">
                  <Briefcase style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <div style={{ lineHeight: 1.2, marginTop: '2px' }}>Faculty</div>
                </div>
              </label>
            </div>
          </div>

          {formData.role === 'Faculty' ? (
            <div style={{ marginTop: '10px' }}>
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <Info />
                <span>
                  Faculty role requires administrative validation. You will be registered as a Student until approved — usually within 24 hours.
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Section 3: Security & Credentials */}
        <div className="section-divider">
          <span className="section-divider-title">3. Security Credentials</span>
          <div className="section-divider-line" />
        </div>

        <div className="form-group">
          <label className="form-label">Create Password</label>
          <div className="input-wrap">
            <Lock className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Min 8 characters, 1 uppercase, 1 number"
              required
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
            <button
              className="input-suffix"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff style={{ width: '17px', height: '17px' }} />
              ) : (
                <Eye style={{ width: '17px', height: '17px' }} />
              )}
            </button>
          </div>
          <div className="pw-strength">
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className={`pw-bar ${
                  bar <= passwordStrength
                    ? passwordStrength <= 1
                      ? 'weak'
                      : passwordStrength <= 3
                      ? 'medium'
                      : 'strong'
                    : ''
                }`}
              />
            ))}
          </div>
          <div className={passwordLabel.className}>
            <ShieldCheck style={{ width: '13px', height: '13px' }} />
            <span>{passwordLabel.text}</span>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label className="form-label">
            <span>Confirm Password</span>
            {formData.confirmPassword ? (
              passwordsMatch ? (
                <span style={{ color: 'var(--emerald)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check style={{ width: '12px', height: '12px' }} />
                  Matches
                </span>
              ) : (
                <span style={{ color: 'var(--rose)', fontSize: '11px' }}>Does not match</span>
              )
            ) : null}
          </label>
          <div className="input-wrap">
            <ShieldCheck className="input-icon" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Re-enter your password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
            <button
              className="input-suffix"
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <EyeOff style={{ width: '17px', height: '17px' }} />
              ) : (
                <Eye style={{ width: '17px', height: '17px' }} />
              )}
            </button>
          </div>
        </div>

        <div className="check-row" style={{ marginBottom: '8px' }}>
          <input type="checkbox" id="terms" required />
          <label htmlFor="terms" className="check-label">
            I agree to the <Link to="/terms" target="_blank" rel="noreferrer">Terms of Service</Link> and{' '}
            <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Policy</Link>
          </label>
        </div>

        <button className="btn-primary" type="submit" style={{ marginTop: '16px' }} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="spin" style={{ width: '18px', height: '18px' }} />
              Creating Account...
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight style={{ width: '18px', height: '18px' }} />
            </>
          )}
        </button>

        <div className="form-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
