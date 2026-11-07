import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, AlertCircle, LogOut } from 'lucide-react';
import { nhost, isNhostConfigured } from './services/nhostClient';
import heroCatImg from './assets/hero-cat.jpg';

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    // Check active Nhost session
    if (isNhostConfigured) {
      const session = nhost.getUserSession();
      if (session?.user) {
        setSessionUser(session.user);
      }

      const unsubscribe = nhost.sessionStorage.onChange((storedSession) => {
        setSessionUser(storedSession?.user ?? null);
      });

      return () => unsubscribe();
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isNhostConfigured) {
        if (mode === 'login') {
          const res = await nhost.auth.signInEmailPassword({
            email,
            password,
          });
          const user = res.body.session?.user;
          setSuccessMsg(`Welcome back, ${user?.email || email}!`);
          setSessionUser(user || { email });
        } else {
          const res = await nhost.auth.signUpEmailPassword({
            email,
            password,
            options: {
              displayName: name || 'Student',
              metadata: {
                role: 'customer',
              },
            },
          });
          const user = res.body.session?.user;
          setSuccessMsg('Account created successfully on Nhost! Please verify your email or sign in.');
          setSessionUser(user || { email });
        }
      } else {
        // Fallback demo response if Nhost credentials are not yet set in .env
        setTimeout(() => {
          const demoUser = {
            id: `usr-${Date.now()}`,
            displayName: name || 'Student',
            email: email || 'student@campus.edu',
          };
          setSessionUser(demoUser);
          setSuccessMsg(`Signed in as ${demoUser.email} (Demo Mode)`);
          setLoading(false);
        }, 400);
        return;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isNhostConfigured) {
        const googleUrl = nhost.auth.signInProviderURL('google', {
          redirectTo: window.location.origin,
        });
        window.location.href = googleUrl;
      } else {
        // Fallback demo for Google Auth
        setTimeout(() => {
          const googleUser = {
            id: `usr-google-${Date.now()}`,
            displayName: 'Google Student',
            email: 'student.google@campus.edu',
          };
          setSessionUser(googleUser);
          setSuccessMsg('Signed in with Google (Demo Mode)');
          setLoading(false);
        }, 400);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (isNhostConfigured) {
      try {
        await nhost.auth.signOut({ all: false });
      } catch (e) {
        console.error(e);
      }
      nhost.sessionStorage.remove();
    }
    setSessionUser(null);
    setSuccessMsg(null);
    setErrorMsg(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen lg:h-screen w-full lg:w-screen overflow-y-auto lg:overflow-hidden bg-black text-white font-sans antialiased selection:bg-[#FF5A1F] selection:text-white flex flex-col lg:flex-row">
      
      {/* LEFT COLUMN: Editorial Typography & Authentication Form */}
      <div className="w-full lg:w-[48%] xl:w-[46%] h-full p-6 sm:p-8 lg:p-10 xl:p-12 flex flex-col justify-between bg-black text-white relative z-10 overflow-y-auto">
        
        {/* Top Brand Logo */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-baseline gap-1.5 cursor-pointer">
            <span className="font-serif font-black text-2xl tracking-tight text-white lowercase">
              printo
            </span>
            <span className="text-[#FF5A1F] text-sm">✻</span>
          </div>

          {sessionUser && (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Sign out of current session"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out ({sessionUser.email?.split('@')[0]})</span>
            </button>
          )}
        </div>

        {/* Center Auth Form Container */}
        <div className="my-auto py-2 w-full max-w-md xl:max-w-lg mx-auto lg:mx-0 space-y-6">
          
          {/* Main Editorial Headline */}
          <div>
            <h1 className="font-serif font-black text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[86px] text-white tracking-[-0.04em] leading-[0.92]">
              Disc<span className="text-[#C4B5FD] inline-block -rotate-6 text-[0.88em]">✻</span>ver<br />
              <span className="font-normal italic text-white/95">Zero Waiting.</span>
            </h1>
          </div>

          {/* Mode Selector Tabs (Sign In vs Sign Up) */}
          <div className="flex items-center gap-1 p-1 bg-white/10 rounded-full w-fit border border-white/15">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`px-5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
              className={`px-5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Status Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-sans flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-sans flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Authentication Form: Email & Custom Password */}
          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-sans text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                  required
                />
              </div>
            )}

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                required
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                required
                minLength={6}
              />
            </div>

            {/* Lavender Pill Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-11 px-6 rounded-full bg-[#C4B5FD] hover:bg-[#B39DFB] disabled:opacity-50 text-black font-sans font-bold text-xs shadow-sm transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer w-full mt-2"
            >
              <span>{loading ? 'Connecting...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Divider: or */}
          <div className="relative flex items-center justify-center py-1">
            <div className="w-full border-t border-white/15" />
            <span className="bg-black px-3 font-mono text-[11px] text-white/40 uppercase tracking-wider">
              or
            </span>
            <div className="w-full border-t border-white/15" />
          </div>

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full h-11 px-4 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-sans font-semibold text-xs shadow-sm transition-all hover:scale-[1.01] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 border border-neutral-200"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span>Continue with Google</span>
          </button>

        </div>

        {/* Minimal Bottom Spacer */}
        <div className="h-2" />

      </div>

      {/* RIGHT COLUMN: Editorial Card with Black Cat Artwork */}
      <div className="w-full lg:w-[52%] xl:w-[54%] h-full p-2.5 sm:p-4 lg:p-4 flex items-center justify-center bg-black">
        
        <div className="w-full h-full min-h-[380px] lg:min-h-0 rounded-[20px] sm:rounded-[28px] md:rounded-[34px] border-2 border-black overflow-hidden bg-[#97B972] relative flex items-center justify-center select-none shadow-2xl">
          <img
            src={heroCatImg}
            alt="Relaxed black cat chilling on a blue plaid pillow"
            className="w-full h-full object-cover object-center select-none pointer-events-none"
          />
        </div>

      </div>

    </div>
  );
}

export default App;
