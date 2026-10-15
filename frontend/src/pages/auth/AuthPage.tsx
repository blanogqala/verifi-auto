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
      <div className="auth-story">
        <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
        <h1>
          Good care.
          <br />
          <em>
            One connected
            <br />
            experience.
          </em>
        </h1>
        <p>
          From finding the right professional to keeping every service record. It all comes together
          here.
        </p>
        <div className="auth-benefits">
          <span>
            <ShieldCheck />
            Trust you can see
          </span>
          <span>
            <Calendar />
            Appointments made simpler
          </span>
          <span>
            <Car />
            Your vehicle’s story, organised
          </span>
        </div>
        <small>INTERACTIVE PREVIEW · USE SAMPLE INFORMATION ONLY</small>
      </div>
      <Card as="section" className="auth-card">
        <span className="chip">
          {mode === 'register'
            ? 'CREATE AN ACCOUNT'
            : mode === 'forgot'
              ? 'ACCOUNT RECOVERY'
              : 'WELCOME TO VERIFI AUTO'}
        </span>
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
              : 'Choose a workspace to explore the experience.'}
        </p>
        {mode !== 'forgot' && (
          <div className="role-picker">
            {(['customer', 'mechanic', ...(mode === 'login' ? ['admin'] : [])] as Role[]).map(
              (r) => (
                <button
                  key={r}
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
              <div className="success-note">
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
    </main>
  );
}
