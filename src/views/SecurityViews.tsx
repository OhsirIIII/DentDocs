import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClinic } from '../context/ClinicContext';
import { request } from '../data/apiClient';
import type { StaffUser, UserRole } from '../types/dental';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InactivityWarningBanner } from '../components/InactivityWarningBanner';
import logo from '../assets/logo-mark.png';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-2 focus:outline-brand-600';
const actionClass =
  'rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-50';
const roleNames: Record<UserRole, string> = {
  admin: 'Administrator',
  dentist: 'Dentist',
  assistant: 'Dental Assistant',
  front_desk: 'Front Desk',
};

function SignInFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="" width={44} height={44} />
          <div className="font-semibold text-brand-900">
            San Nicolas Dental Clinic
            <div className="text-sm font-normal text-slate-600">
              DentDocs staff access
            </div>
          </div>
        </div>
        {children}
        <p className="mt-8 text-xs leading-relaxed text-slate-600">
          Use your individual staff account. This installation contains
          fictional records for testing.
        </p>
      </section>
    </main>
  );
}

export function LoginView() {
  const { login } = useClinic();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <SignInFrame>
      <h1 className="text-2xl font-bold text-brand-950">Sign in</h1>
      <p className="mt-2 mb-6 text-sm text-slate-600">
        Access the records your clinic role permits.
      </p>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          try {
            await login(email, password);
            setPassword('');
            const from = location.state?.from;
            navigate(
              typeof from === 'string' &&
                from.startsWith('/') &&
                !from.startsWith('//') &&
                from !== '/login'
                ? from
                : '/dashboard',
              { replace: true },
            );
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to sign in');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm font-semibold text-slate-800">
          Email
          <input
            className={inputClass + ' mt-2'}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold text-slate-800">
          Password
          <input
            className={inputClass + ' mt-2'}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-rose-800">
            {error}
          </p>
        )}
        <button className={actionClass + ' w-full'} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm text-slate-600">
          Forgot your password? Ask your clinic administrator for a reset.
        </p>
      </form>
    </SignInFrame>
  );
}

export function PasswordChangeView() {
  const { changePassword, logout } = useClinic();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <SignInFrame>
      <h1 className="text-2xl font-bold text-brand-950">Set your password</h1>
      <p className="mt-2 mb-6 text-sm text-slate-600">
        Replace your temporary password before opening clinic records. Use at
        least 12 characters.
      </p>
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setError('');
          if (next !== confirmation) {
            setError('The new passwords do not match');
            return;
          }
          setBusy(true);
          try {
            await changePassword(current, next);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : 'Unable to change password',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-sm font-semibold">
          Temporary password
          <input
            className={inputClass + ' mt-2'}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          New password
          <input
            className={inputClass + ' mt-2'}
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          Confirm new password
          <input
            className={inputClass + ' mt-2'}
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-rose-800">
            {error}
          </p>
        )}
        <button className={actionClass + ' w-full'} disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
        <button
          type="button"
          className="w-full text-sm underline text-brand-800"
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </form>
    </SignInFrame>
  );
}

export function SessionMonitor() {
  const { logout } = useClinic();
  const lastActivity = useRef(Date.now());
  const lastSent = useRef(0);
  const warning = useRef(false);
  const [remaining, setRemaining] = useState(600);
  useEffect(() => {
    const activity = () => {
      if (warning.current) return;
      lastActivity.current = Date.now();
      if (Date.now() - lastSent.current > 30000) {
        lastSent.current = Date.now();
        void request('/auth/activity', { method: 'POST' }).catch(() => {});
      }
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((name) =>
      window.addEventListener(name, activity, { passive: true }),
    );
    const timer = window.setInterval(() => {
      const seconds = Math.max(
        0,
        600 - Math.floor((Date.now() - lastActivity.current) / 1000),
      );
      warning.current = seconds <= 60;
      setRemaining(seconds);
      if (seconds === 0) {
        window.clearInterval(timer);
        void logout();
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, activity));
    };
  }, []);
  return remaining <= 60 ? (
    <InactivityWarningBanner
      secondsRemaining={remaining}
      onStaySignedIn={() => {
        void request('/auth/activity', { method: 'POST' }).then(() => {
          lastActivity.current = Date.now();
          lastSent.current = Date.now();
          warning.current = false;
          setRemaining(600);
        });
      }}
    />
  ) : null;
}

export function UsersView() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [temporary, setTemporary] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<UserRole>('assistant');
  const [confirmation, setConfirmation] = useState<{
    user: StaffUser;
    action: 'disable' | 'enable' | 'role' | 'reset';
    role?: UserRole;
  } | null>(null);
  const refresh = () => request<StaffUser[]>('/admin/users').then(setUsers);
  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  async function run(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setTemporary('');
    try {
      await operation();
      await refresh();
      setConfirmation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update account');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-brand-950">Staff accounts</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create individual accounts and manage access. Changes to roles,
          passwords or account status end existing sessions.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-4 text-sm text-rose-900"
        >
          {error}
        </p>
      )}
      {temporary && (
        <div
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <p className="font-semibold">Temporary password — shown once</p>
          <output className="block my-2 break-all select-all font-mono text-sm">
            {temporary}
          </output>
          <p className="text-sm">
            Share privately with this staff member. They must change it at
            sign-in.
          </p>
          <button
            className="mt-3 text-sm font-semibold underline"
            onClick={() => setTemporary('')}
          >
            I have saved it securely
          </button>
        </div>
      )}
      <section className="border border-slate-200 rounded-xl bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-brand-950">
          Create staff account
        </h2>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const result = await request<{ temporaryPassword: string }>(
                '/admin/users',
                {
                  method: 'POST',
                  body: JSON.stringify({ name, email, title, role }),
                },
              );
              setTemporary(result.temporaryPassword);
              setName('');
              setEmail('');
              setTitle('');
            });
          }}
        >
          <label className="text-sm font-semibold">
            Full name
            <input
              className={inputClass + ' mt-2'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Email
            <input
              type="email"
              className={inputClass + ' mt-2'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Job title
            <input
              className={inputClass + ' mt-2'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Role
            <select
              aria-label="Role"
              className={inputClass + ' mt-2'}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {Object.entries(roleNames).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button className={actionClass} disabled={busy}>
              {busy ? 'Saving…' : 'Create account'}
            </button>
          </div>
        </form>
      </section>
      <section>
        <h2 className="text-lg font-semibold text-brand-950 mb-4">
          Clinic staff
        </h2>
        {loading ? (
          <p role="status">Loading staff…</p>
        ) : (
          <ul className="divide-y divide-slate-200 border-y border-slate-200">
            {users.map((user) => (
              <li
                key={user.id}
                className="py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {user.name}{' '}
                    <span
                      className={
                        'ml-2 text-xs ' +
                        (user.enabled ? 'text-emerald-800' : 'text-slate-600')
                      }
                    >
                      {user.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600 break-all">
                    {user.email} · {user.title}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="sr-only" htmlFor={'role-' + user.id}>
                    Role for {user.name}
                  </label>
                  <select
                    id={'role-' + user.id}
                    className={inputClass + ' sm:w-auto'}
                    value={user.role}
                    disabled={busy}
                    onChange={(e) =>
                      setConfirmation({
                        user,
                        action: 'role',
                        role: e.target.value as UserRole,
                      })
                    }
                  >
                    {Object.entries(roleNames).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={busy}
                    className="text-sm font-semibold underline text-brand-800"
                    onClick={() => setConfirmation({ user, action: 'reset' })}
                  >
                    Reset password
                  </button>
                  <button
                    disabled={busy}
                    className="text-sm font-semibold underline text-rose-800"
                    onClick={() =>
                      setConfirmation({
                        user,
                        action: user.enabled ? 'disable' : 'enable',
                      })
                    }
                  >
                    {user.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ConfirmDialog
        isOpen={!!confirmation}
        title={
          confirmation
            ? `${confirmation.action === 'role' ? 'Change role for' : confirmation.action === 'reset' ? 'Reset password for' : confirmation.action === 'disable' ? 'Disable' : 'Enable'} ${confirmation.user.name}?`
            : ''
        }
        description="Existing sessions for this account will end. The change will be recorded in the audit log."
        confirmLabel={busy ? 'Saving…' : 'Confirm change'}
        onCancel={() => {
          if (!busy) setConfirmation(null);
        }}
        onConfirm={() => {
          if (!confirmation) return;
          void run(async () => {
            const item = confirmation;
            if (item.action === 'reset') {
              const result = await request<{ temporaryPassword: string }>(
                `/admin/users/${item.user.id}/reset-password`,
                { method: 'POST' },
              );
              setTemporary(result.temporaryPassword);
            } else {
              await request(`/admin/users/${item.user.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  expectedRevision: item.user.revision,
                  ...(item.action === 'role'
                    ? { role: item.role }
                    : { enabled: item.action === 'enable' }),
                }),
              });
            }
          });
        }}
      >
        {error && (
          <p role="alert" className="text-sm text-rose-800">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
