import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  AlertCircle,
  LogOut,
  Store,
  Clock,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  MapPin,
  Phone,
  Power,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  PackageCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { nhost, isNhostConfigured } from './services/nhostClient';
import {
  fetchShopByOwner,
  registerNewShop,
  toggleShopStatus,
  fetchShopOrders,
  updateOrderStatus,
  upsertShopOwnerProfile,
} from './services/nhostDb';
import type { Shop, Order, OrderStatus } from './types/database';
import heroCatImg from './assets/hero-cat.jpg';

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
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

const AVAILABLE_SERVICES = [
  'Laser Printing',
  'Photocopying',
  'Spiral Binding',
  'Soft Binding',
  'Hardcover Thesis',
  'Color Posters',
  'Lamination',
];

export function App() {
  // Auth state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [operatorPhone, setOperatorPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Shop state
  const [shop, setShop] = useState<Shop | null>(null);
  const [checkingShop, setCheckingShop] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Shop Registration Form State
  const [regShopName, setRegShopName] = useState('');
  const [regDescription, setRegDescription] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('Bangalore');
  const [regPincode, setRegPincode] = useState('560001');
  const [regOpenTime, setRegOpenTime] = useState('08:00');
  const [regCloseTime, setRegCloseTime] = useState('21:00');
  const [regServices, setRegServices] = useState<string[]>([
    'Laser Printing',
    'Spiral Binding',
    'Soft Binding',
    'Color Posters',
  ]);
  const [regBwSingle, setRegBwSingle] = useState('2.00');
  const [regBwDouble, setRegBwDouble] = useState('3.00');
  const [regColorSingle, setRegColorSingle] = useState('10.00');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Check active Nhost session on load
  useEffect(() => {
    if (isNhostConfigured) {
      const session = nhost.getUserSession();
      if (session?.user) {
        setSessionUser(session.user);
        loadShopForUser(session.user.id);
      }

      const unsubscribe = nhost.sessionStorage.onChange((storedSession) => {
        const user = storedSession?.user ?? null;
        setSessionUser(user);
        if (user) {
          loadShopForUser(user.id);
        } else {
          setShop(null);
          setOrders([]);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const loadShopForUser = async (userId: string) => {
    setCheckingShop(true);
    try {
      const existingShop = await fetchShopByOwner(userId);
      setShop(existingShop);
      if (existingShop) {
        loadOrders(existingShop.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingShop(false);
    }
  };

  const loadOrders = async (shopId: string) => {
    setOrdersLoading(true);
    try {
      const list = await fetchShopOrders(shopId);
      setOrders(list);
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    try {
      if (isNhostConfigured) {
        if (authMode === 'login') {
          const res = await nhost.auth.signInEmailPassword({ email, password });
          const user = res.body.session?.user;
          if (user) {
            setSessionUser(user);
            setAuthSuccess('Welcome back, Operator!');
            await loadShopForUser(user.id);
          }
        } else {
          // Register Shop Owner
          const res = await nhost.auth.signUpEmailPassword({
            email,
            password,
            options: {
              displayName: operatorName || 'Shop Operator',
              defaultRole: 'user',
              metadata: {
                role: 'shop_owner',
                phone: operatorPhone,
              },
            },
          });

          const user = res.body.session?.user;
          if (user) {
            setSessionUser(user);
            await upsertShopOwnerProfile({
              id: user.id,
              email: user.email || email,
              fullName: operatorName,
              phone: operatorPhone,
            });
            setAuthSuccess('Operator account registered! Now set up your printing shop.');
            await loadShopForUser(user.id);
          } else {
            setAuthSuccess('Account created! Please verify your email or sign in directly.');
          }
        }
      } else {
        // Fallback demo mode
        const demoUser = {
          id: 'a1111111-1111-1111-1111-111111111111',
          email: email || 'amit@metrohubs.com',
          displayName: operatorName || 'Amit Patel',
        };
        setSessionUser(demoUser);
        loadShopForUser(demoUser.id);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (isNhostConfigured) {
        const googleUrl = nhost.auth.signInProviderURL('google', {
          redirectTo: window.location.origin,
        });
        window.location.href = googleUrl;
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed.');
      setAuthLoading(false);
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
    setShop(null);
    setOrders([]);
    setAuthSuccess(null);
    setAuthError(null);
    setEmail('');
    setPassword('');
  };

  const handleDemoSignIn = async (demoEmail: string, demoOwnerId: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const demoUser = {
        id: demoOwnerId,
        email: demoEmail,
        displayName: demoEmail.includes('amit') ? 'Amit Patel' : 'Suresh Kumar',
      };
      setSessionUser(demoUser);
      setAuthSuccess(`Signed in as ${demoUser.displayName}`);
      await loadShopForUser(demoOwnerId);
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleShopRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    setRegError(null);
    setRegLoading(true);

    try {
      const newShop = await registerNewShop({
        ownerId: sessionUser.id,
        shopName: regShopName,
        description: regDescription,
        phone: regPhone || operatorPhone,
        email: sessionUser.email || email,
        address: regAddress,
        city: regCity,
        pincode: regPincode,
        openingTime: regOpenTime,
        closingTime: regCloseTime,
        services: regServices,
        pricing: {
          bwSingle: parseFloat(regBwSingle) || 2.0,
          bwDouble: parseFloat(regBwDouble) || 3.0,
          colorSingle: parseFloat(regColorSingle) || 10.0,
        },
      });

      if (newShop) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C4B5FD', '#10B981', '#F59E0B'],
        });
        setShop(newShop);
        loadOrders(newShop.id);
      } else {
        setRegError('Unable to save shop details. Please verify database connection.');
      }
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    if (!shop) return;
    const nextState = !shop.is_active;
    const success = await toggleShopStatus(shop.id, nextState);
    if (success) {
      setShop({ ...shop, is_active: nextState });
    }
  };

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    const success = await updateOrderStatus(orderId, nextStatus);
    if (success && shop) {
      loadOrders(shop.id);
    }
  };

  const toggleService = (srv: string) => {
    setRegServices((prev) =>
      prev.includes(srv) ? prev.filter((s) => s !== srv) : [...prev, srv]
    );
  };

  // =========================================================================
  // VIEW 1: AUTHENTICATION WINDOW (When user is not signed in)
  // =========================================================================
  if (!sessionUser) {
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
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono tracking-wider text-[#C4B5FD] uppercase">
                Shop Hub
              </span>
            </div>
          </div>

          {/* Center Auth Form Container */}
          <div className="my-auto py-2 w-full max-w-md xl:max-w-lg mx-auto lg:mx-0 space-y-6">
            
            {/* Main Editorial Headline */}
            <div>
              <h1 className="font-serif font-black text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[86px] text-white tracking-[-0.04em] leading-[0.92]">
                Disc<span className="text-[#C4B5FD] inline-block -rotate-6 text-[0.88em]">✻</span>ver<br />
                <span className="font-normal italic text-white/95">Customer at Ease.</span>
              </h1>
            </div>

            {/* Mode Selector Tabs (Sign In vs Register Shop Owner) */}
            <div className="flex items-center gap-1 p-1 bg-white/10 rounded-full w-fit border border-white/15">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(null); setAuthSuccess(null); }}
                className={`px-5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(null); setAuthSuccess(null); }}
                className={`px-5 py-1.5 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Register Shop
              </button>
            </div>

            {/* Status Alerts */}
            {authError && (
              <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-sans flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-sans flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <div>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="Operator Full Name (e.g. Amit Patel)"
                      className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-sans text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      value={operatorPhone}
                      onChange={(e) => setOperatorPhone(e.target.value)}
                      placeholder="Contact / WhatsApp Phone (+91 98765 43210)"
                      className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                    />
                  </div>
                </>
              )}

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@printo.in"
                  className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                  required
                  minLength={6}
                />
              </div>

              {/* Lavender Pill Submit Button */}
              <button
                type="submit"
                disabled={authLoading}
                className="h-11 px-6 rounded-full bg-[#C4B5FD] hover:bg-[#B39DFB] disabled:opacity-50 text-black font-sans font-bold text-xs shadow-sm transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer w-full mt-2"
              >
                <span>
                  {authLoading
                    ? 'Connecting...'
                    : authMode === 'login'
                    ? 'Sign In to Station'
                    : 'Create Operator Account & Register'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Demo Access Pills */}
            <div className="pt-2">
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">
                Quick Demo Station Sign In:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleDemoSignIn(
                      'amit@metrohubs.com',
                      'a1111111-1111-1111-1111-111111111111'
                    )
                  }
                  className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-mono text-white/80 transition-all flex items-center gap-1.5"
                >
                  <Store className="w-3 h-3 text-[#C4B5FD]" />
                  <span>Metro Graphics (Amit)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleDemoSignIn(
                      'suresh@campusprint.com',
                      'a2222222-2222-2222-2222-222222222222'
                    )
                  }
                  className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-mono text-white/80 transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-3 h-3 text-emerald-400" />
                  <span>PrintFast Hub (Suresh)</span>
                </button>
              </div>
            </div>

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
              disabled={authLoading}
              className="w-full h-11 px-4 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 font-sans font-semibold text-xs shadow-sm transition-all hover:scale-[1.01] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 border border-neutral-200"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>Continue with Google</span>
            </button>
          </div>

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

  // =========================================================================
  // VIEW 2: SHOP REGISTRATION WINDOW (Signed in, but no shop created yet)
  // =========================================================================
  if (!shop && !checkingShop) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 text-white font-sans antialiased selection:bg-[#FF5A1F] selection:text-white flex flex-col justify-between p-4 sm:p-6 lg:p-10">
        
        {/* Top Navbar */}
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-serif font-black text-2xl tracking-tight text-white lowercase">
              printo
            </span>
            <span className="text-[#FF5A1F] text-sm">✻</span>
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-[#C4B5FD]/20 border border-[#C4B5FD]/40 text-[#C4B5FD] text-xs font-mono">
              Shop Onboarding
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs font-mono text-white/60 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Main Registration Form Container */}
        <div className="max-w-2xl mx-auto w-full py-8 space-y-6">
          <div>
            <div className="text-[#C4B5FD] font-mono text-xs uppercase tracking-wider mb-1">
              Step 2 of 2 • Station Deployment
            </div>
            <h1 className="font-serif font-black text-3xl sm:text-4xl text-white tracking-tight">
              Register Your Campus Print Hub
            </h1>
            <p className="text-white/60 text-xs sm:text-sm mt-1">
              Configure your shop identity, campus location, opening hours, and default pricing.
            </p>
          </div>

          {regError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-sans flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{regError}</span>
            </div>
          )}

          <form onSubmit={handleShopRegistrationSubmit} className="space-y-6">
            
            {/* Section 1: Shop Identity */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-wider text-white/70 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#C4B5FD]" />
                <span>Shop Identity & Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    Official Shop Name *
                  </label>
                  <input
                    type="text"
                    value={regShopName}
                    onChange={(e) => setRegShopName(e.target.value)}
                    placeholder="e.g. Metro Graphics & Laser Center"
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#C4B5FD]"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    Short Description / Tagline
                  </label>
                  <input
                    type="text"
                    value={regDescription}
                    onChange={(e) => setRegDescription(e.target.value)}
                    placeholder="e.g. High-speed 1200 DPI prints, thesis spiral binding, and blueprint services."
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#C4B5FD]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    Support / WhatsApp Phone *
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#C4B5FD]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    Campus City / Region
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Bangalore"
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#C4B5FD]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    Exact Campus Location / Address *
                  </label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="e.g. Academic Complex Block 3, Ground Floor (Opposite Canteen)"
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#C4B5FD]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Operating Hours & Services */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-wider text-white/70 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Operating Hours & Services</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={regOpenTime}
                    onChange={(e) => setRegOpenTime(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C4B5FD]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={regCloseTime}
                    onChange={(e) => setRegCloseTime(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C4B5FD]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-white/50 mb-2">
                  Services Offered (Click to toggle)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SERVICES.map((srv) => {
                    const isSelected = regServices.includes(srv);
                    return (
                      <button
                        type="button"
                        key={srv}
                        onClick={() => toggleService(srv)}
                        className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#C4B5FD] text-black font-bold'
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                        <span>{srv}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 3: Base Pricing */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
              <h2 className="text-xs font-mono uppercase tracking-wider text-white/70 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Base Pricing (₹ Per Page)</span>
              </h2>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    A4 B&W Single
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-white/40 text-xs">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      value={regBwSingle}
                      onChange={(e) => setRegBwSingle(e.target.value)}
                      className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/10 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C4B5FD]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    A4 B&W Double
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-white/40 text-xs">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      value={regBwDouble}
                      onChange={(e) => setRegBwDouble(e.target.value)}
                      className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/10 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C4B5FD]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white/50 mb-1">
                    A4 Color Single
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-white/40 text-xs">₹</span>
                    <input
                      type="number"
                      step="1"
                      value={regColorSingle}
                      onChange={(e) => setRegColorSingle(e.target.value)}
                      className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/10 border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#C4B5FD]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="submit"
              disabled={regLoading}
              className="w-full h-12 rounded-full bg-[#C4B5FD] hover:bg-[#B39DFB] text-black font-sans font-bold text-sm shadow-lg transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{regLoading ? 'Registering Station on Nhost...' : 'Launch Campus Printing Station 🚀'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="text-center text-[11px] font-mono text-white/30 py-4">
          Printo Hub Protocol • Nhost & Hasura GraphQL Connected
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: LIVE SHOP OPERATOR COMMAND DASHBOARD (Shop is registered)
  // =========================================================================
  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-[#FF5A1F] selection:text-white flex flex-col">
      
      {/* Top Hub Bar */}
      <header className="border-b border-white/10 bg-neutral-950/80 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        
        {/* Brand & Shop Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className="font-serif font-black text-xl tracking-tight text-white lowercase">
              printo
            </span>
            <span className="text-[#FF5A1F] text-xs">✻</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>{shop?.shop_name}</span>
              <button
                type="button"
                onClick={handleToggleOnline}
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider flex items-center gap-1 cursor-pointer transition-colors ${
                  shop?.is_active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
                title="Click to toggle shop availability"
              >
                <Power className="w-2.5 h-2.5" />
                <span>{shop?.is_active ? 'LIVE ON CAMPUS' : 'OFFLINE'}</span>
              </button>
            </div>
            <div className="text-[11px] font-mono text-white/50 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              <span>{shop?.address || 'Campus Location'}</span>
            </div>
          </div>
        </div>

        {/* Right Actions: Refresh & Sign Out */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => shop && loadOrders(shop.id)}
            disabled={ordersLoading}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/80 transition-colors cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-mono transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10">
            <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider flex items-center justify-between">
              <span>Active Queue</span>
              <Printer className="w-4 h-4 text-[#C4B5FD]" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-black mt-1">
              {orders.filter((o) => ['pending', 'accepted', 'printing'].includes(o.status)).length}
            </div>
            <div className="text-[10px] font-mono text-emerald-400 mt-1">
              Live campus print jobs
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10">
            <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider flex items-center justify-between">
              <span>Ready for Pickup</span>
              <PackageCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-black mt-1 text-emerald-400">
              {orders.filter((o) => o.status === 'ready_for_collection').length}
            </div>
            <div className="text-[10px] font-mono text-white/50 mt-1">
              Waiting in locker
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10">
            <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider flex items-center justify-between">
              <span>Total Orders</span>
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-black mt-1">
              {orders.length}
            </div>
            <div className="text-[10px] font-mono text-white/50 mt-1">
              Since registration
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10">
            <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider flex items-center justify-between">
              <span>Today's Revenue</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-black mt-1 text-amber-400">
              ₹{orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0).toFixed(0)}
            </div>
            <div className="text-[10px] font-mono text-white/50 mt-1">
              Instant campus settlement
            </div>
          </div>

        </div>

        {/* Live Orders Section */}
        <div className="rounded-3xl bg-neutral-900/50 border border-white/10 p-5 sm:p-6 space-y-4">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-white">
                Live Order Dispatch
              </h2>
              <p className="text-xs font-mono text-white/50 mt-0.5">
                Incoming print requests from campus students. Process through stages.
              </p>
            </div>

            <button
              type="button"
              onClick={() => shop && loadOrders(shop.id)}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-mono text-white/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync</span>
            </button>
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Printer className="w-10 h-10 text-white/20 mx-auto" />
              <div className="text-sm font-medium text-white/70">
                Queue is currently empty!
              </div>
              <p className="text-xs font-mono text-white/40 max-w-sm mx-auto">
                Orders sent by students from the Printo Customer Portal will arrive here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const doc = order.order_documents?.[0];
                return (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-white/10 hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Order Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#C4B5FD]">
                          #{order.order_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                            order.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : order.status === 'printing'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : order.status === 'ready_for_collection'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-white">
                        {doc?.document?.file_name || 'Document Print'}
                      </div>

                      <div className="text-xs font-mono text-white/50 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Copies: {order.total_copies || doc?.copies || 1}</span>
                        <span>•</span>
                        <span>Pages: {order.total_pages || 1}</span>
                        <span>•</span>
                        <span>Mode: {doc?.color_mode || 'B&W'}</span>
                        <span>•</span>
                        <span>Paper: {doc?.paper_size || 'A4'}</span>
                        <span>•</span>
                        <span>Sides: {doc?.sides || 'Single'}</span>
                      </div>

                      {order.customer && (
                        <div className="text-[11px] font-mono text-white/40 flex items-center gap-2 pt-1">
                          <span>Customer: {order.customer.full_name || order.customer.email}</span>
                          {order.customer.phone && (
                            <>
                              <span>•</span>
                              <Phone className="w-2.5 h-2.5" />
                              <span>{order.customer.phone}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Price & Status Action Buttons */}
                    <div className="flex items-center gap-3 self-end md:self-center">
                      <div className="text-right pr-2">
                        <div className="text-lg font-serif font-black text-white">
                          ₹{order.total_amount}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400">Paid online</div>
                      </div>

                      {order.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'accepted')}
                          className="px-4 py-2 rounded-xl bg-[#C4B5FD] hover:bg-[#B39DFB] text-black text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'printing')}
                          className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-black text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Start Printing</span>
                        </button>
                      )}

                      {order.status === 'printing' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'ready_for_collection')}
                          className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Ready for Pickup</span>
                        </button>
                      )}

                      {order.status === 'ready_for_collection' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'completed')}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete Order</span>
                        </button>
                      )}

                      {order.status === 'completed' && (
                        <span className="text-xs font-mono text-emerald-400 font-medium">
                          Completed ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Shop Configuration Details Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-2">
            <div className="text-xs font-mono text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Operating Schedule</span>
            </div>
            <div className="text-sm font-semibold">
              Monday – Saturday
            </div>
            <div className="text-xs font-mono text-white/50">
              08:00 AM – 09:00 PM (Instant Queue)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-2">
            <div className="text-xs font-mono text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>Configured Rates</span>
            </div>
            <div className="text-xs font-mono text-white/80 space-y-0.5">
              <div>A4 B&W Single: ₹2.00 / pg</div>
              <div>A4 B&W Double: ₹3.00 / pg</div>
              <div>A4 Color Single: ₹10.00 / pg</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-white/10 space-y-2">
            <div className="text-xs font-mono text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#C4B5FD]" />
              <span>Station Contact</span>
            </div>
            <div className="text-sm font-semibold">
              {shop?.phone || '+91 98765 43210'}
            </div>
            <div className="text-xs font-mono text-white/50">
              {shop?.email || sessionUser.email}
            </div>
          </div>
        </div>

      </main>

    </div>
  );
}

export default App;
