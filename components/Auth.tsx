import React, { useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

type Mode = 'password' | 'magic';
type Message = { type: 'success' | 'error'; text: string } | null;

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [mode, setMode] = useState<Mode>('password');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [message, setMessage] = useState<Message>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (mode === 'magic') return true;
    return password.trim().length >= 6;
  }, [email, password, mode]);

  const normalizeError = (err: any) => {
    const raw = String(err?.message ?? err ?? 'Okänt fel');
    if (raw === 'Invalid login credentials') return 'Fel e-post eller lösenord.';
    if (raw === 'User already registered') return 'Användaren finns redan. Prova att logga in.';
    if (raw === 'Failed to fetch')
      return 'Kunde inte ansluta till servern. Kontrollera din internetuppkoppling eller Supabase-konfigurationen.';
    return raw;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setMessage(null);

    try {
      const emailTrimmed = email.trim();

      if (mode === 'magic') {
        // Passwordless / Magic Link
        const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

        const { error } = await supabase.auth.signInWithOtp({
          email: emailTrimmed,
          options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
        });

        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Magic link skickad! Kolla din e-post och öppna länken för att logga in.',
        });
        setLoading(false);
        return;
      }

      // Password flow
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: emailTrimmed,
          password,
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setMessage({
            type: 'success',
            text: 'Konto skapat! Om e-postbekräftelse är på: bekräfta via mail. Annars kan du logga in direkt.',
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailTrimmed,
          password,
        });

        if (error) throw error;
        // Vid success: App.tsx tar över via onAuthStateChange
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: normalizeError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative flex items-center justify-center px-6 py-12">
      {/* Decorative “lab glow” */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-56 right-[-12rem] h-[32rem] w-[32rem] rounded-full bg-gradient-to-br from-emerald-200/55 to-cyan-200/35 blur-3xl" />
        <div className="absolute -bottom-56 left-[-12rem] h-[32rem] w-[32rem] rounded-full bg-gradient-to-tr from-indigo-200/45 to-violet-200/35 blur-3xl" />
        <div className="absolute top-24 left-1/2 -translate-x-1/2 h-48 w-[48rem] max-w-[90vw] rounded-full bg-gradient-to-r from-transparent via-slate-200/25 to-transparent blur-2xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-display font-extrabold shadow-sm relative">
            HJ
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/15" />
          </div>
          <h1 className="mt-4 text-3xl font-display font-bold text-slate-900 tracking-tight">HälsoJournalen</h1>
          <p className="mt-2 text-sm text-slate-600">
            Premium spårning av biomarkörer för professionella biohackers.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white/85 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm overflow-hidden">
          {/* Mode tabs */}
          <div className="p-3 border-b border-slate-200/70">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-2xl p-1 ring-1 ring-slate-900/5">
              <button
                type="button"
                onClick={() => setMode('password')}
                className={cx(
                  'py-2 rounded-xl text-sm font-semibold transition-colors',
                  mode === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                Lösenord
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('magic');
                  setIsSignUp(false);
                  setPassword('');
                  setMessage(null);
                }}
                className={cx(
                  'py-2 rounded-xl text-sm font-semibold transition-colors',
                  mode === 'magic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                Magic link
              </button>
            </div>
          </div>

          <form onSubmit={handleAuth} className="p-6 space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">E-post</label>
              <div className="relative">
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namn@exempel.se"
                  className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>
            </div>

            {/* Password */}
            {mode === 'password' && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Lösenord</label>
                <div className="relative">
                  <svg
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <input
                    type="password"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    placeholder="Minst 6 tecken"
                    className="w-full rounded-2xl bg-white ring-1 ring-slate-900/10 shadow-sm pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    required
                  />
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Tips: För teams/pro kan Magic link vara smidigare (lösenordsfritt).
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div
                className={cx(
                  'rounded-2xl p-4 text-sm font-semibold ring-1',
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 ring-emerald-900/10'
                    : 'bg-rose-50 text-rose-900 ring-rose-900/10',
                )}
              >
                {message.text}
              </div>
            )}

            {/* Password mode: toggle signup/login */}
            {mode === 'password' && (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp((v) => !v);
                    setMessage(null);
                  }}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  {isSignUp ? 'Har du redan konto? Logga in' : 'Inget konto? Skapa ett'}
                </button>

                <span className="text-xs text-slate-500">{isSignUp ? 'Sign up' : 'Login'}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className={cx(
                'w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-sm shadow-slate-900/10 transition-all active:scale-[0.99]',
                'bg-slate-900 hover:bg-slate-800',
                'disabled:bg-slate-400 disabled:cursor-not-allowed',
              )}
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Vänta…
                </span>
              ) : mode === 'magic' ? (
                'Skicka magic link'
              ) : isSignUp ? (
                'Skapa konto'
              ) : (
                'Logga in'
              )}
            </button>

            {/* Footer note */}
            <div className="pt-2 text-[11px] text-slate-500 leading-relaxed">
              Din data hanteras via Supabase. Appen är för spårning/insikter – inte medicinsk rådgivning.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
