import { useEffect, useRef, useState } from 'react';
import { MailCheck } from 'lucide-react';
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
        // Replace the token URL so Back does not attempt to use the same link again.
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
        ? 'Reset your password.'
        : mode === 'reset'
          ? 'Choose a new password.'
          : mode === 'verify'
            ? 'Verify your email.'
            : 'Welcome back.';
  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <img className="auth-visual-image" src="/images/auth-workshop.webp" alt="" />
      </div>
      <aside className="auth-story auth-visual">
        <div className="auth-visual-copy">
          <h1>
            Good care.
            <br />
            <em>For every journey.</em>
          </h1>
          <p>Your professionals, appointments and vehicle history. Together in one place.</p>
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
              verifi<span className="auth-brand-auto">auto</span>.
            </span>
          </button>
          <h1>{registeredEmail ? 'Check your email.' : title}</h1>
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
                Go to sign in
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
                    Go to sign in
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
                        Customer
                      </button>
                      <button
                        type="button"
                        className={role === 'MECHANIC' ? 'selected' : ''}
                        aria-pressed={role === 'MECHANIC'}
                        onClick={() => setRole('MECHANIC')}
                      >
                        Mechanic / workshop
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
                <button className="primary full" disabled={busy}>
                  {busy
                    ? 'Please wait…'
                    : mode === 'login'
                      ? 'Sign in'
                      : mode === 'register'
                        ? 'Create account'
                        : mode === 'verify'
                          ? 'Verify email'
                          : 'Continue'}
                </button>
              </form>
              <div className="button-row">
                <button
                  type="button"
                  className="text-link"
                  onClick={() => go(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? 'Create an account' : 'Back to sign in'}
                </button>
                {mode === 'login' ? (
                  <button type="button" className="text-link" onClick={() => go('forgot')}>
                    Forgot password?
                  </button>
                ) : null}
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
