import { Card } from '../../components/ui/Card';
import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Wrench,
  Car,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Role, roleLabel } from '../../demo';
export function AuthPage({ mode, role, setRole, onLogin, go, pending }: any) {
  const [choice, setChoice] = useState<Role>(
    pending ? 'customer' : mode === 'register' ? 'mechanic' : role || 'customer',
  );
  const [reset, setReset] = useState(false);
  return (
    <main className="auth-page">
      <aside className="auth-story auth-visual" aria-label="Verifi Auto">
        <img className="auth-visual-image" src="/images/auth-workshop.webp" alt="" />
        <div className="auth-visual-copy">
          <span className="eyebrow">VERIFIED PROFESSIONALS. TRUSTED REPAIRS.</span>
          <h1>
            {mode === 'register' ? (
              <>
                Your next chapter.
                <br />
                <em>Driven by trust.</em>
              </>
            ) : mode === 'forgot' ? (
              <>
                A fresh start.
                <br />
                <em>Back on the road.</em>
              </>
            ) : (
              <>
                Good care.
                <br />
                <em>For every journey.</em>
              </>
            )}
          </h1>
          <p>
            {mode === 'register'
              ? 'Find trusted care for your car, or build your professional presence. Your journey starts here.'
              : mode === 'forgot'
                ? 'One simple step towards reconnecting with your vehicle’s story.'
                : 'Your professionals, appointments and vehicle history. Together in one place.'}
          </p>
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
          <h2>
            {mode === 'register'
              ? 'Start your journey.'
              : mode === 'forgot'
                ? 'Let’s get you back in.'
                : 'Welcome back.'}
          </h2>
          <p>
            {pending
              ? 'Sign in as a customer to continue booking ' + pending.name + '.'
              : mode === 'register'
                ? 'Choose how you’ll use Verifi Auto.'
                : mode === 'forgot'
                  ? 'Enter your email to preview account recovery.'
                  : 'Choose a workspace to explore the experience.'}
          </p>
          {mode !== 'forgot' && (
            <div className="role-picker">
              {(['customer', 'mechanic', ...(mode === 'login' ? ['admin'] : [])] as Role[]).map(
                (r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={choice === r}
                    className={choice === r ? 'selected' : ''}
                    onClick={() => setChoice(r)}
                  >
                    {r === 'customer' ? <Car /> : r === 'mechanic' ? <Wrench /> : <ShieldCheck />}
                    <span>{roleLabel[r]}</span>
                  </button>
                ),
              )}
            </div>
          )}
          {mode === 'register' && choice === 'admin' ? (
            <p>Admin accounts are invitation-only.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (mode === 'forgot') {
                  setReset(true);
                  return;
                }
                onLogin(
                  choice,
                  mode === 'register',
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
              }}
            >
              {mode === 'register' && (
                <label>
                  Full name
                  <input
                    name="name"
                    required
                    placeholder="Use a sample name"
                    defaultValue="Alex Morgan"
                    autoComplete="off"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={
                    choice === 'admin'
                      ? 'admin@example.com'
                      : choice === 'mechanic'
                        ? 'mechanic@example.com'
                        : 'alex@example.com'
                  }
                  key={choice}
                  autoComplete="off"
                />
              </label>
              {mode !== 'forgot' && (
                <>
                  <label>
                    Password
                    <input type="password" value="demoonly" readOnly aria-describedby="auth-note" />
                  </label>
                  <div className="auth-sub">
                    <span>Demo password prefilled</span>
                    {mode === 'login' && (
                      <button type="button" className="text-link" onClick={() => go('forgot')}>
                        Forgot password?
                      </button>
                    )}
                  </div>
                </>
              )}
              <div className="notice" id="auth-note">
                {choice === 'admin' && mode !== 'forgot'
                  ? 'Admin preview only. In the live platform, admin access will be invitation-only and checked by the server.'
                  : 'Preview accounts only. No real authentication, account creation, or email delivery is connected. Don’t enter a real password.'}
              </div>
              {reset ? (
                <div className="success-note" role="status">
                  <CheckCircle2 size={18} /> Recovery screen demonstrated. No email was sent.
                </div>
              ) : (
                <button className="primary full" type="submit">
                  {mode === 'forgot'
                    ? 'Preview recovery request'
                    : mode === 'register'
                      ? 'Create demo ' + roleLabel[choice].toLowerCase() + ' account'
                      : 'Enter ' + roleLabel[choice].toLowerCase() + ' preview'}
                  <ArrowRight size={18} />
                </button>
              )}
            </form>
          )}
          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                New to Verifi? <button onClick={() => go('register')}>Create an account</button>
              </>
            ) : (
              <button onClick={() => go('login')}>Back to sign in</button>
            )}
          </div>
          <button className="text-link" onClick={() => go('find')}>
            Browse professionals first <ArrowUpRight size={16} />
          </button>
        </Card>
        <button type="button" className="auth-home-link" onClick={() => go('home')}>
          Back to home <ArrowUpRight size={15} />
        </button>
      </div>
    </main>
  );
}
