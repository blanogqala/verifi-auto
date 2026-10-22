import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Car, MailCheck, ShieldCheck, Wrench } from 'lucide-react';
import { api, setCsrf } from './api';
import { Card } from '../components/ui/Card';

export function LiveAuth({ page, go, onSession, run }: any) {
  const mode = page.split('?')[0];
  const [role, setRole] = useState('CUSTOMER');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const verificationRequest = useRef<Promise<unknown> | null>(null);
  const pendingBooking = Boolean(sessionStorage.getItem('verifi-pending-professional'));
  useEffect(() => {
    if (mode !== 'verify') return;
    let active = true;
    const token = new URLSearchParams(page.split('?')[1] || '').get('token');
    if (!token) {
      setVerificationError(
        'This verification link is incomplete. Open the full link from your email.',
      );
      return;
    }
    verificationRequest.current ||= api('/auth/verify', 'POST', { token });
    verificationRequest.current
      .then(() => {
        if (!active) return;
        window.history.replaceState(null, '', '#login?verified=1');
        go('login?verified=1');
      })
      .catch((error) => {
        if (active)
          setVerificationError(
            error.message || 'We could not verify your email. Please try again.',
          );
      });
    return () => {
      active = false;
    };
  }, [mode, page, go]);
  const verified =
    mode === 'login' && new URLSearchParams(page.split('?')[1] || '').get('verified') === '1';
  const title =
    mode === 'register'
      ? 'Start your journey.'
      : mode === 'forgot'
        ? 'Let’s get you back in.'
        : mode === 'reset'
          ? 'Choose a new password.'
          : mode === 'verify'
            ? 'Verify your email.'
            : 'Welcome back.';
  const story =
    mode === 'register'
      ? {
          kicker: 'Your next chapter.',
          emphasis: 'Driven by trust.',
          text: 'Find trusted care for your car, or build your professional presence. Your journey starts here.',
        }
      : mode === 'forgot' || mode === 'reset'
        ? {
            kicker: 'A fresh start.',
            emphasis: 'Back on the road.',
            text: 'One simple step towards reconnecting with your vehicle’s story.',
          }
        : {
            kicker: 'Good care.',
            emphasis: 'For every journey.',
            text: 'Your professionals, appointments and vehicle history. Together in one place.',
          };
  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <img className="auth-visual-image" src="/images/auth-workshop.webp" alt="" />
      </div>
      <aside className="auth-story auth-visual" aria-label="Verifi Auto">
        <div className="auth-visual-copy">
          <span className="eyebrow">VERIFIED PROFESSIONALS. TRUSTED REPAIRS.</span>
          <h1>
            {story.kicker}
            <br />
            <em>{story.emphasis}</em>
          </h1>
          <p>{story.text}</p>
        </div>
        <div className="auth-visual-caption">
          <ShieldCheck size={22} />
          <span>
            A clearer standard of care.<small>Connected journeys. Lasting confidence.</small>
          </span>
        </div>
      </aside>
      <div className="auth-form-side">
        <Card as="section" className="auth-card">
          <button
            className="auth-brand"
            type="button"
            onClick={() => go('home')}
            aria-label="Verifi Auto home"
          >
            <img src="/logo.png" alt="" />
            <span>
              verifi<span className="auth-brand-auto">auto</span>
              <i>.</i>
            </span>
          </button>
          <h2>{registeredEmail ? 'Check your email.' : title}</h2>
          {verified ? (
            <p className="auth-confirmation" role="status">
              Your email is verified. Sign in to continue.
            </p>
          ) : null}
          {registeredEmail ? (
            <div className="auth-email-state" role="status">
              <span className="auth-email-icon" aria-hidden="true">
                <MailCheck size={32} />
              </span>
              <p>
                Check <strong>{registeredEmail}</strong> for a verification email.
              </p>
              <p>
                Click <strong>Verify email</strong> in the message. We’ll confirm your email and
                take you to sign in.
              </p>
              <p className="auth-email-hint">
                The link expires in 24 hours. If it hasn’t arrived, check your spam folder. Already
                registered? Sign in to continue or request another verification email.
              </p>
              <button type="button" className="primary full" onClick={() => go('login')}>
                Go to sign in <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setRegisteredEmail('');
                  setSent('');
                }}
              >
                Use a different email
              </button>
            </div>
          ) : mode === 'verify' ? (
            <div className="auth-email-state">
              <span className="auth-email-icon" aria-hidden="true">
                <MailCheck size={32} />
              </span>
              {verificationError ? (
                <>
                  <p role="alert">{verificationError}</p>
                  <p>
                    Already verified? Sign in. If your link expired, sign in and request a new
                    verification email.
                  </p>
                  <button type="button" className="primary full" onClick={() => go('login')}>
                    Go to sign in <ArrowRight size={18} />
                  </button>
                </>
              ) : (
                <p role="status" aria-live="polite">
                  Verifying your email… You’ll be taken to sign in automatically.
                </p>
              )}
            </div>
          ) : (
            <>
              <p>
                {pendingBooking && mode === 'login'
                  ? 'Sign in as a customer to continue your booking.'
                  : mode === 'register'
                    ? 'Choose how you’ll use Verifi Auto.'
                    : mode === 'forgot'
                      ? 'Enter your email and we’ll send a reset link.'
                      : mode === 'reset'
                        ? 'Choose a new password for your account.'
                        : 'Sign in to your Verifi Auto account.'}
              </p>
              {sent ? <p role="status">{sent}</p> : null}
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (busy) return;
                  setBusy(true);
                  const values = Object.fromEntries(new FormData(event.currentTarget));
                  await run(async () => {
                    if (mode === 'login') {
                      const result = await api('/auth/login', 'POST', values);
                      setCsrf(result.csrf);
                      onSession(result.user);
                    } else if (mode === 'register') {
                      const result = await api('/auth/register', 'POST', { ...values, role });
                      setRegisteredEmail(String(values.email).trim());
                      setSent(result.message);
                    } else if (mode === 'forgot') {
                      const result = await api('/auth/forgot', 'POST', values);
                      setSent(result.message);
                    } else {
                      const token = new URLSearchParams(page.split('?')[1] || '').get('token');
                      const result = await api(`/auth/${mode}`, 'POST', { ...values, token });
                      setSent(result.message);
                    }
                  }, '');
                  setBusy(false);
                }}
              >
                {mode === 'register' ? (
                  <>
                    <div className="role-picker">
                      <button
                        type="button"
                        className={role === 'CUSTOMER' ? 'selected' : ''}
                        aria-pressed={role === 'CUSTOMER'}
                        onClick={() => setRole('CUSTOMER')}
                      >
                        <Car />
                        <span>Customer</span>
                      </button>
                      <button
                        type="button"
                        className={role === 'MECHANIC' ? 'selected' : ''}
                        aria-pressed={role === 'MECHANIC'}
                        onClick={() => setRole('MECHANIC')}
                      >
                        <Wrench />
                        <span>Mechanic</span>
                      </button>
                    </div>
                    <label>
                      Full name
                      <input
                        name="name"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={120}
                      />
                    </label>
                  </>
                ) : null}
                {['login', 'register', 'forgot'].includes(mode) ? (
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      maxLength={254}
                    />
                  </label>
                ) : null}
                {['login', 'register', 'reset'].includes(mode) ? (
                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={mode === 'login' ? 1 : 8}
                      maxLength={128}
                      pattern={mode === 'login' ? undefined : '(?=.*[0-9]).{8,128}'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    {mode !== 'login' ? (
                      <small>
                        At least eight characters including a number. A longer unique passphrase is
                        stronger.
                      </small>
                    ) : null}
                  </label>
                ) : null}
                {mode === 'login' ? (
                  <div className="auth-sub">
                    <span />
                    <button type="button" className="text-link" onClick={() => go('forgot')}>
                      Forgot password?
                    </button>
                  </div>
                ) : null}
                <button className="primary full" disabled={busy}>
                  {busy
                    ? 'Please wait…'
                    : mode === 'login'
                      ? 'Sign in'
                      : mode === 'register'
                        ? 'Create account'
                        : mode === 'forgot'
                          ? 'Send reset link'
                          : 'Continue'}
                  {busy ? null : <ArrowRight size={18} />}
                </button>
              </form>
              <div className="auth-switch">
                {mode === 'login' ? (
                  <>
                    New to Verifi? <button onClick={() => go('register')}>Create an account</button>
                  </>
                ) : (
                  <button onClick={() => go('login')}>Back to sign in</button>
                )}
              </div>
              <button className="text-link" type="button" onClick={() => go('find')}>
                Browse professionals first <ArrowUpRight size={16} />
              </button>
            </>
          )}
        </Card>
        <button type="button" className="auth-home-link" onClick={() => go('home')}>
          Back to home <ArrowUpRight size={15} />
        </button>
      </div>
    </main>
  );
}
