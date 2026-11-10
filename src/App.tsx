import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  LogOut,
  Store,
  Clock,
  Printer,
  DollarSign
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { nhost, isNhostConfigured } from './services/nhostClient';
import {
  fetchShopByOwner,
  registerNewShop,
  updateShopLocation,
  verifyOwnerPassword,
  updateShopDetails,
  toggleShopStatus,
  fetchShopOrders,
  updateOrderStatus,
  upsertShopOwnerProfile,
  fetchShopBucketFiles,
  getBucketFileUrl,
} from './services/nhostDb';
import {
  detectConnectedPrinters,
  scanUsbHardware,
  dispatchToSystemPrinter,
  type DetectedPrinter,
} from './services/localPrinters';
import type { Shop, Order, OrderStatus, BucketFile } from './types/database';
import { ShopBentoDashboard } from './components/ShopBentoDashboard';
import { OpenFreeMapPicker } from './components/OpenFreeMapPicker';
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

  // Shop & Dashboard state
  const [shop, setShop] = useState<Shop | null>(null);
  const [checkingShop, setCheckingShop] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bucketFiles, setBucketFiles] = useState<BucketFile[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Live Auto-Detected Local System Printers (NEVER stored in DB)
  const [detectedPrinters, setDetectedPrinters] = useState<DetectedPrinter[]>([]);
  const [scanningPrinters, setScanningPrinters] = useState(false);
  const [usbNotice, setUsbNotice] = useState<string | null>(null);

  // Shop Registration Form State (Step 2 - No printer inputs, auto-detected later)
  const [regShopName, setRegShopName] = useState('');
  const [regDescription, setRegDescription] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('Bangalore');
  const [regPincode, setRegPincode] = useState('560001');
  const [regLat, setRegLat] = useState<number>(12.9716);
  const [regLon, setRegLon] = useState<number>(77.5946);
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

  const scanLocalPrinters = async () => {
    setScanningPrinters(true);
    try {
      const result = await detectConnectedPrinters();
      setDetectedPrinters(result.printers);
    } finally {
      setScanningPrinters(false);
    }
  };

  // Auto-detect printers on USB plug/unplug events
  useEffect(() => {
    scanLocalPrinters();
    const nav = navigator as any;
    if (nav?.usb?.addEventListener) {
      const handleUsbEvent = () => scanLocalPrinters();
      nav.usb.addEventListener('connect', handleUsbEvent);
      nav.usb.addEventListener('disconnect', handleUsbEvent);
      return () => {
        nav.usb.removeEventListener('connect', handleUsbEvent);
        nav.usb.removeEventListener('disconnect', handleUsbEvent);
      };
    }
  }, []);

  // Check active Nhost session and OAuth callback on load
  useEffect(() => {
    if (isNhostConfigured) {
      const params = new URLSearchParams(window.location.search);
      const refreshToken = params.get('refreshToken');

      if (refreshToken) {
        nhost.auth
          .refreshToken({ refreshToken })
          .then((res) => {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (res.body?.user) {
              setSessionUser(res.body.user);
              loadShopForUser(res.body.user.id);
            }
          })
          .catch((err) => {
            console.error('OAuth refresh error:', err);
          });
      } else {
        const session = nhost.getUserSession();
        if (session?.user) {
          setSessionUser(session.user);
          loadShopForUser(session.user.id);
        }
      }

      const unsubscribe = nhost.sessionStorage.onChange((storedSession) => {
        const user = storedSession?.user ?? null;
        setSessionUser(user);
        if (user) {
          loadShopForUser(user.id);
        } else {
          setShop(null);
          setOrders([]);
          setBucketFiles([]);
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
        await refreshDashboardData(existingShop);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingShop(false);
    }
  };

  const refreshDashboardData = async (targetShop: Shop) => {
    setOrdersLoading(true);
    try {
      const [ordersList, filesList] = await Promise.all([
        fetchShopOrders(targetShop.id),
        targetShop.bucket_id ? fetchShopBucketFiles(targetShop.bucket_id) : Promise.resolve([]),
        scanLocalPrinters(),
      ]);
      setOrders(ordersList);
      setBucketFiles(filesList);
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleScanUsbPrinter = async () => {
    setUsbNotice(null);
    try {
      const usbPrinter = await scanUsbHardware();
      if (usbPrinter) {
        setUsbNotice(`Detected & paired USB printer: ${usbPrinter.name}`);
        await scanLocalPrinters();
      }
    } catch (err: any) {
      setUsbNotice(err?.message || 'USB hardware scan cancelled.');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const res = await nhost.auth.signInEmailPassword({ email, password });
        const user = res.body.session?.user;
        if (user) {
          setSessionUser(user);
          setAuthSuccess('Welcome back, Operator!');
          await loadShopForUser(user.id);
        }
      } else {
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
      const googleUrl = nhost.auth.signInProviderURL('google', {
        redirectTo: window.location.origin,
      });
      window.location.href = googleUrl;
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed.');
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await nhost.auth.signOut({ all: false });
    } catch (e) {
      console.error(e);
    }
    nhost.sessionStorage.remove();
    setSessionUser(null);
    setShop(null);
    setOrders([]);
    setBucketFiles([]);
    setAuthSuccess(null);
    setAuthError(null);
    setEmail('');
    setPassword('');
  };

  const handleDemoSignIn = async (demoEmail: string, demoOwnerId: string) => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await nhost.auth.signInEmailPassword({
        email: demoEmail,
        password: 'printo123',
      });
      const user = res.body?.session?.user;
      if (user) {
        setSessionUser(user);
        setAuthSuccess(`Signed in as ${user.displayName || demoEmail}`);
        await loadShopForUser(user.id);
      } else {
        throw new Error('Could not obtain demo session from Nhost.');
      }
    } catch (e: any) {
      setAuthError(e.message || `Demo sign-in failed for ${demoOwnerId}.`);
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
        ownerName: sessionUser.displayName || operatorName || regShopName,
        shopName: regShopName,
        description: regDescription,
        phone: regPhone || operatorPhone,
        email: sessionUser.email || email,
        address: regAddress,
        city: regCity,
        pincode: regPincode,
        latitude: regLat,
        longitude: regLon,
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
        await refreshDashboardData(newShop);
      }
    } catch (err: any) {
      setRegError(err.message || 'Unable to save shop details. Please verify database connection.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleUpdateLocation = async (loc: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    pincode?: string;
  }): Promise<boolean> => {
    if (!shop) return false;
    const ok = await updateShopLocation({
      shopId: shop.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address || shop.address || '',
      city: loc.city || shop.city || '',
      pincode: loc.pincode || shop.pincode || '',
    });
    if (ok) {
      setShop({
        ...shop,
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address || shop.address,
        city: loc.city || shop.city,
        pincode: loc.pincode || shop.pincode,
      });
    }
    return ok;
  };

  const handleVerifyPassword = async (pwd: string): Promise<boolean> => {
    const ownerEmail = sessionUser?.email || shop?.email;
    if (!ownerEmail) return false;
    return await verifyOwnerPassword(ownerEmail, pwd);
  };

  const handleUpdateShopDetails = async (updates: {
    shopName: string;
    description?: string;
    phone?: string;
    address?: string;
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    openingTime?: string;
    closingTime?: string;
    services?: string[];
    pricing?: { bwSingle: number; bwDouble: number; colorSingle: number };
  }): Promise<boolean> => {
    if (!shop || !sessionUser) return false;
    const updated = await updateShopDetails({
      shopId: shop.id,
      ownerId: sessionUser.id,
      ...updates,
    });
    if (updated) {
      setShop(updated);
      return true;
    }
    return false;
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
      refreshDashboardData(shop);
    }
  };

  const handleOpenBucketFile = async (fileId?: string | null) => {
    if (!fileId) return;
    const url = await getBucketFileUrl(fileId);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('Could not retrieve presigned URL for this file.');
    }
  };

  const handlePrintJobFile = async (fileId?: string | null, printer?: DetectedPrinter | null) => {
    if (!fileId) return;
    const url = await getBucketFileUrl(fileId);
    if (!url) {
      alert('Could not retrieve PDF URL for printing.');
      return;
    }
    const ok = await dispatchToSystemPrinter(url, printer);
    if (!ok) {
      window.open(url, '_blank', 'noopener,noreferrer');
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
        <div className="w-full lg:w-[48%] xl:w-[46%] h-full p-6 sm:p-8 lg:py-8 lg:px-10 xl:py-10 xl:px-12 flex flex-col justify-between bg-black text-white relative z-10 overflow-y-auto no-scrollbar">
          
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif font-black text-2xl tracking-tight text-white lowercase">
                prinrox
              </span>
              <span className="text-[#FF3B00] text-sm" aria-hidden="true">✻</span>
            </div>
          </div>

          <div className="my-auto py-2 w-full max-w-md xl:max-w-lg mx-auto lg:mx-0 space-y-5">
            
            <div>
              <h1 className="font-serif font-black text-5xl sm:text-6xl md:text-6xl lg:text-[62px] xl:text-[74px] text-white tracking-[-0.04em] leading-[0.94] text-balance">
                Disc<span className="text-[#FF3B00]" aria-hidden="true">✻</span>ver<br />
                <span className="font-normal text-white">Customer at Ease.</span>
              </h1>
            </div>

            <div className="flex items-center gap-1 p-1 bg-white/10 rounded-full w-fit border border-white/15">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(null); setAuthSuccess(null); }}
                className={`px-5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white text-[#0F1115]'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setAuthError(null); setAuthSuccess(null); }}
                className={`px-5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white text-[#0F1115]'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Register Shop
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-sans flex items-start gap-2 animate-panel-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" aria-hidden="true" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-sans flex items-start gap-2 animate-panel-in">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" aria-hidden="true" />
                <span>{authSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <>
                  <div>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="Operator Full Name (e.g. Amit Patel)"
                      className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      value={operatorPhone}
                      onChange={(e) => setOperatorPhone(e.target.value)}
                      placeholder="Contact Phone (+91 98765 43210)"
                      className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/25 text-xs font-sans tabular-nums text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] transition-colors"
                    />
                  </div>
                </>
              )}

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@prinrox.in"
                  className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] transition-colors"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] transition-colors"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="h-11 px-6 rounded-full bg-[#D93200] hover:bg-[#FF3B00] disabled:opacity-50 text-white font-sans font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer w-full mt-2"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>
                  {authLoading
                    ? 'Signing in...'
                    : authMode === 'login'
                    ? 'Sign In to Station'
                    : 'Create Operator Account'}
                </span>
              </button>
            </form>

            {/* Quick Demo Access Pills */}
            <div className="pt-2">
              <div className="text-xs font-sans font-medium text-neutral-400 mb-2">
                Quick Demo Accounts
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
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-sans text-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5 text-[#FF3B00]" aria-hidden="true" />
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
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-sans text-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>PrintFast Hub (Suresh)</span>
                </button>
              </div>
            </div>

            <div className="relative flex items-center justify-center py-1">
              <div className="w-full border-t border-white/15" />
              <span className="bg-black px-3 font-sans text-xs text-neutral-400">
                or
              </span>
              <div className="w-full border-t border-white/15" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={authLoading}
              className="w-full h-11 px-4 rounded-full bg-white hover:bg-neutral-100 text-[#0F1115] font-sans font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 border border-neutral-200"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="h-2" />
        </div>

        <div className="w-full lg:w-[52%] xl:w-[54%] h-full p-4 flex items-center justify-center bg-black">
          <div className="w-full h-full min-h-[380px] lg:min-h-0 rounded-[24px] overflow-hidden bg-[#97B972] relative flex items-center justify-center select-none shadow-2xl">
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
  // LOADING STATE
  // =========================================================================
  if (checkingShop) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-6 space-y-3 font-sans">
        <Loader2 className="w-7 h-7 text-[#FF3B00] animate-spin" aria-hidden="true" />
        <div className="text-xs font-sans font-medium text-neutral-300">
          Loading Shop Dashboard...
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: SHOP REGISTRATION WINDOW (Signed in, but no shop created yet)
  // =========================================================================
  if (!shop) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 text-white font-sans antialiased selection:bg-[#FF3B00] selection:text-white flex flex-col justify-between p-4 sm:p-6 lg:p-10">
        
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/10">
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif font-black text-2xl tracking-tight text-white lowercase">
              prinrox
            </span>
            <span className="text-[#FF3B00] text-sm" aria-hidden="true">✻</span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs font-sans font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="max-w-2xl mx-auto w-full py-8 space-y-6">
          <div>
            <h1 className="font-serif font-black text-3xl sm:text-4xl text-white tracking-tight text-balance">
              Register Your Printing Shop
            </h1>
            <p className="text-neutral-300 text-xs sm:text-sm mt-1.5 font-sans">
              Add your shop details, campus location, opening hours, and page rates. Connected printers are detected automatically.
            </p>
          </div>

          {regError && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-sans flex items-start gap-2 animate-panel-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" aria-hidden="true" />
              <span>{regError}</span>
            </div>
          )}

          <form onSubmit={handleShopRegistrationSubmit} className="space-y-6">
            
            {/* Section 1: Shop Identity */}
            <div className="p-5 rounded-[24px] bg-white/5 border border-white/15 space-y-4">
              <h2 className="text-sm font-sans font-bold text-white flex items-center gap-2 text-balance">
                <Store className="w-4 h-4 text-[#FF3B00]" aria-hidden="true" />
                <span>Shop Details &amp; Location</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    value={regShopName}
                    onChange={(e) => setRegShopName(e.target.value)}
                    placeholder="Metro Graphics & Laser Center"
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#FF3B00]"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    Short Description
                  </label>
                  <input
                    type="text"
                    value={regDescription}
                    onChange={(e) => setRegDescription(e.target.value)}
                    placeholder="High-speed prints, soft & spiral binding, and posters"
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#FF3B00]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/25 text-xs font-sans tabular-nums text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#FF3B00]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Bengaluru"
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#FF3B00]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    Campus Address *
                  </label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Academic Complex Block 3, Ground Floor"
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#FF3B00]"
                    required
                  />
                </div>

                <div className="sm:col-span-2 pt-2">
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-2">
                    Shop Location Pin
                  </label>
                  <OpenFreeMapPicker
                    latitude={regLat}
                    longitude={regLon}
                    heightClass="h-60"
                    onChange={(loc) => {
                      setRegLat(loc.latitude);
                      setRegLon(loc.longitude);
                      if (loc.address) setRegAddress(loc.address);
                      if (loc.city) setRegCity(loc.city);
                      if (loc.pincode) setRegPincode(loc.pincode);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Operating Hours & Services */}
            <div className="p-5 rounded-[24px] bg-white/5 border border-white/15 space-y-4">
              <h2 className="text-sm font-sans font-bold text-white flex items-center gap-2 text-balance">
                <Clock className="w-4 h-4 text-[#FF3B00]" aria-hidden="true" />
                <span>Hours &amp; Services</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={regOpenTime}
                    onChange={(e) => setRegOpenTime(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/25 text-xs font-sans tabular-nums text-white focus:outline-none focus:border-[#FF3B00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={regCloseTime}
                    onChange={(e) => setRegCloseTime(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/25 text-xs font-sans tabular-nums text-white focus:outline-none focus:border-[#FF3B00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans font-medium text-neutral-300 mb-2">
                  Services Offered
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SERVICES.map((srv) => {
                    const isSelected = regServices.includes(srv);
                    return (
                      <button
                        type="button"
                        key={srv}
                        onClick={() => toggleService(srv)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-white text-[#0F1115]'
                            : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#D93200]" aria-hidden="true" />}
                        <span>{srv}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 3: Base Pricing */}
            <div className="p-5 rounded-[24px] bg-white/5 border border-white/15 space-y-4">
              <h2 className="text-sm font-sans font-bold text-white flex items-center gap-2 text-balance">
                <DollarSign className="w-4 h-4 text-[#FF3B00]" aria-hidden="true" />
                <span>Base Pricing (₹ per page)</span>
              </h2>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    B&amp;W Single
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-neutral-400 text-xs">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      value={regBwSingle}
                      onChange={(e) => setRegBwSingle(e.target.value)}
                      className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/10 border border-white/25 text-xs font-sans tabular-nums text-white focus:outline-none focus:border-[#FF3B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    B&amp;W Double
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-neutral-400 text-xs">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      value={regBwDouble}
                      onChange={(e) => setRegBwDouble(e.target.value)}
                      className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/10 border border-white/25 text-xs font-sans tabular-nums text-white focus:outline-none focus:border-[#FF3B00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-sans font-medium text-neutral-300 mb-1.5">
                    Color Single
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-neutral-400 text-xs">₹</span>
                    <input
                      type="number"
                      step="1"
                      value={regColorSingle}
                      onChange={(e) => setRegColorSingle(e.target.value)}
                      className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/10 border border-white/25 text-xs font-sans tabular-nums text-white focus:outline-none focus:border-[#FF3B00]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={regLoading}
              className="w-full h-12 rounded-full bg-[#D93200] hover:bg-[#FF3B00] text-white font-sans font-bold text-sm shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {regLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {regLoading ? 'Creating Shop...' : 'Launch Shop Dashboard'}
              </span>
            </button>
          </form>
        </div>

        <div className="text-center text-xs font-sans text-neutral-400 py-4">
          Prinrox Partner
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: SWISS EDITORIAL BENTO GRID SHOP OWNER DASHBOARD
  // =========================================================================
  return (
    <ShopBentoDashboard
      shop={shop}
      orders={orders}
      bucketFiles={bucketFiles}
      detectedPrinters={detectedPrinters}
      scanningPrinters={scanningPrinters}
      ordersLoading={ordersLoading}
      sessionEmail={sessionUser.email}
      usbNotice={usbNotice}
      onRefresh={() => refreshDashboardData(shop)}
      onScanUsbPrinter={handleScanUsbPrinter}
      onToggleShopOnline={handleToggleOnline}
      onStatusChange={handleStatusChange}
      onOpenBucketFile={handleOpenBucketFile}
      onPrintJobFile={handlePrintJobFile}
      onUpdateLocation={handleUpdateLocation}
      onVerifyPassword={handleVerifyPassword}
      onUpdateShopDetails={handleUpdateShopDetails}
      onSignOut={handleSignOut}
    />
  );
}

export default App;
