import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, Printer, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import OrderWizard from '../user/OrderWizard';

const GUEST_SESSION_STORAGE_KEY = 'reposysGuestSession';
const GUEST_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getStoredGuestSession = () => {
  try {
    const storedSession = JSON.parse(window.sessionStorage.getItem(GUEST_SESSION_STORAGE_KEY) || 'null');

    if (!storedSession?.email || !storedSession?.sessionId || storedSession.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
      return null;
    }

    return storedSession;
  } catch {
    window.sessionStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
    return null;
  }
};

const saveGuestSession = (session) => {
  const sessionPayload = {
    email: session.email,
    sessionId: session.sessionId,
    restored: Boolean(session.restored),
    activeOrderId: session.activeOrderId || '',
    expiresAt: Date.now() + GUEST_SESSION_TTL_MS,
  };

  window.sessionStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(sessionPayload));
  return sessionPayload;
};

const clearGuestSession = () => {
  window.sessionStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
};

const GuestKiosk = () => {
  const storedSession = getStoredGuestSession();
  const [email, setEmail] = useState(storedSession?.email || '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(storedSession ? 'order' : 'request');
  const [session, setSession] = useState(storedSession);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const [loadingAction, setLoadingAction] = useState('');
  const [trackOrderId, setTrackOrderId] = useState('');
  const [trackError, setTrackError] = useState('');

  const normalizedEmail = email.trim().toLowerCase();

  const requestOtp = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!emailRegex.test(normalizedEmail)) {
      setError('Enter a valid email address to receive the guest OTP.');
      return;
    }

    setLoadingAction('request');

    try {
      const response = await api.post('/guest/request-otp', { email: normalizedEmail });
      if (response.data?.debugOtp) {
        setOtp(String(response.data.debugOtp));
      }
      setNotice(response.data?.message || 'OTP sent to your email');
      setStep('verify');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not send the OTP. Please try again.');
    } finally {
      setLoadingAction('');
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!emailRegex.test(normalizedEmail) || !otp.trim()) {
      setError('Enter the email and OTP sent to your inbox.');
      return;
    }

    setLoadingAction('verify');

    try {
      const response = await api.post('/guest/verify-otp', {
        email: normalizedEmail,
        otp: otp.trim(),
      });
      const nextSession = saveGuestSession({
        email: normalizedEmail,
        ...response.data,
      });

      setSession(nextSession);
      setNotice(response.data?.restored
        ? 'Your guest session was restored.'
        : 'Guest session verified. You can create an order now.');
      setStep(response.data?.restored && response.data?.activeOrderId ? 'restored' : 'order');
    } catch (verifyError) {
      setError(verifyError.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoadingAction('');
    }
  };

  const endGuestSession = async () => {
    setLoadingAction('end');
    setError('');

    try {
      await api.post('/guest/end-session');
    } catch {
      // The local kiosk state should still be cleared if the cookie already expired.
    } finally {
      clearGuestSession();
      setSession(null);
      setOtp('');
      setStep('request');
      setNotice('Guest session ended.');
      setLoadingAction('');
    }
  };

  if (step === 'order' && session) {
    return (
      <OrderWizard
        guestEmail={session.email}
        isGuestMode
        onEndGuestSession={endGuestSession}
      />
    );
  }

  if (step === 'restored' && session) {
    return <Navigate to={`/guest/confirmation/${session.activeOrderId}`} replace />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),linear-gradient(135deg,_#f8fbff,_#eef4ff_58%,_#f8fafc)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:grid lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
        <section className="rounded-[36px] bg-slate-950 p-8 text-white shadow-[0_30px_100px_-55px_rgba(15,23,42,0.8)]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
            Back to Home
          </Link>
          <div className="mt-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
              <Printer className="h-8 w-8" strokeWidth={2.2} />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.32em] text-sky-300">Reposys Guest Kiosk</p>
            <h1 className="mt-4 max-w-lg text-5xl font-semibold tracking-tight">Walk-in printing without account signup</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Verify your email with a one-time code, upload documents, and submit a pay-at-counter order.
            </p>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_30px_120px_-60px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
              {step === 'verify' ? 'Step 2 of 2' : 'Step 1 of 2'}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {step === 'verify' ? 'Enter your OTP' : 'Start guest access'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {step === 'verify'
                ? `We sent a six-digit access code to ${normalizedEmail}.`
                : 'Use any reachable email address for the guest access code.'}
            </p>
          </div>

          {notice ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {step === 'verify' ? (
            <form className="space-y-5" onSubmit={verifyOtp}>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
                  <Mail className="h-5 w-5 text-sky-700" strokeWidth={2.2} />
                  <input
                    className="w-full bg-transparent text-base text-slate-950 outline-none"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>

              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Guest OTP</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
                  <KeyRound className="h-5 w-5 text-sky-700" strokeWidth={2.2} />
                  <input
                    className="w-full bg-transparent text-base tracking-[0.35em] text-slate-950 outline-none"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
              </label>

              <button
                className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={loadingAction === 'verify'}
                type="submit"
              >
                {loadingAction === 'verify' ? 'Verifying...' : 'Verify and Continue'}
              </button>

              <button
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loadingAction === 'request'}
                type="button"
                onClick={requestOtp}
              >
                {loadingAction === 'request' ? 'Sending...' : 'Resend OTP'}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={requestOtp}>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
                  <Mail className="h-5 w-5 text-sky-700" strokeWidth={2.2} />
                  <input
                    className="w-full bg-transparent text-base text-slate-950 outline-none"
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </label>

              <button
                className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={loadingAction === 'request'}
                type="submit"
              >
                {loadingAction === 'request' ? 'Sending OTP...' : 'Send Guest OTP'}
              </button>

              <p className="text-center text-sm text-slate-500">
                Have an account?{' '}
                <Link className="font-semibold text-sky-700 hover:text-sky-600" to="/login">
                  Sign in instead
                </Link>
              </p>
            </form>
          )}

          <div className="mt-10 border-t border-slate-200 pt-8">
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">Already placed an order?</h3>
            <p className="mt-1 text-sm text-slate-500">Track your order instantly using your token or order ID.</p>
            <div className="mt-5 flex flex-col gap-3">
              {trackError && <p className="text-sm font-medium text-rose-600">{trackError}</p>}
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none"
                placeholder="Enter your Order ID"
                value={trackOrderId}
                onChange={(e) => setTrackOrderId(e.target.value)}
              />
              <button
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={() => {
                  const id = trackOrderId.trim();
                  if (!id) {
                    setTrackError('Please enter an Order ID');
                    return;
                  }
                  navigate('/guest/track/' + id);
                }}
              >
                Track Order
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GuestKiosk;
