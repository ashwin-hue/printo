import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  AlertCircle,
  ChevronDown,
  Crop,
  FilePlus2,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  Layers,
  List,
  Loader2,
  LogOut,
  Minus,
  Navigation,
  Pencil,
  Plus,
  QrCode,
  RotateCw,
  Search,
  Sparkles,
  Upload,
  FileText,
  Store,
  MapPin,
  Clock,
  RefreshCw,
  CheckCircle2,
  User,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { nhost, isNhostConfigured } from './services/nhostClient';
import {
  fetchShops,
  fetchCustomerLiveSync,
  deleteCustomerNotifications,
  cleanupCustomerNotifiedOrders,
  submitCustomerPrintJob,
  upsertCustomerProfile,
  READY_FOR_COLLECTION_TTL_MS,
  isReadyOrderExpired,
  getReadyOrderRemainingMs,
  formatRemainingPickupTime,
} from './services/nhostDb';
import type { Shop, Order, Notification as CustomerNotification } from './types/database';
import {
  OpenFreeMapExplorer,
  computeHaversineKm,
  getShopStartingRate,
} from './components/OpenFreeMapExplorer';
import { getCustomerOtp } from './utils/otp';
import { findShopByQrPayload } from './utils/shopQr';
import { ShopQrScannerModal } from './components/ShopQrScannerModal';
import {
  pickNextSurpriseActivity,
  prepareDocumentsWithCoverPage,
} from './utils/coverPage';
import heroCatImg from './assets/hero-cat.jpg';
import readyPickupChimeUrl from './assets/ready-pickup-chime.wav';

const PHOTO_PRINT_SIZES = [
  { value: 'Large 8x10 inch', label: 'Large', dims: '8x10 inch', price: 43, aspectClass: 'aspect-[4/5]', isPolaroid: false },
  { value: 'Album 6x4 inch', label: 'Album', dims: '6x4 inch', price: 39, aspectClass: 'aspect-[3/2]', isPolaroid: false },
  { value: 'Square 4x4 inch', label: 'Square', dims: '4x4 inch', price: 29, aspectClass: 'aspect-square', isPolaroid: false },
  { value: 'Polaroid 1.8x2.4', label: 'Polaroid', dims: '1.8x2.4 inch', price: 19, aspectClass: 'aspect-[3/4]', isPolaroid: true },
] as const;

const PASSPORT_SIZES = [
  { value: 'Passport 35x45mm', label: 'Standard size', dims: '35 x 45 mm', aspectClass: 'aspect-[35/45]' },
  { value: 'US Visa 2x2in', label: 'US / Visa size', dims: '2 x 2 inch', aspectClass: 'aspect-square' },
  { value: 'Stamp 25x30mm', label: 'Stamp size', dims: '25 x 30 mm', aspectClass: 'aspect-[25/30]' },
  { value: 'Exam 35x25mm', label: 'Exam / Pan size', dims: '35 x 25 mm', aspectClass: 'aspect-[35/25]' },
] as const;

const PASSPORT_QUANTITIES = [
  { count: 8 as const, price: 117, perPhoto: '₹14.63/photo' },
  { count: 16 as const, price: 176, perPhoto: '₹11/photo' },
  { count: 32 as const, price: 234, perPhoto: '₹7.31/photo' },
] as const;

function doesAlertMatchOrder(alertItem: CustomerNotification, order: Order): boolean {
  if (alertItem.id === `order-${order.id}`) return true;
  const msg = `${alertItem.title || ''} ${alertItem.message || ''}`.toLowerCase();
  const fileName = (order.order_documents?.[0]?.document?.file_name || '').trim().toLowerCase();
  return Boolean(fileName && msg.includes(fileName));
}

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

export function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);

  // Customer Portal Hub state
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [mapFocusTrigger, setMapFocusTrigger] = useState(0);
  const [directionsShop, setDirectionsShop] = useState<Shop | null>(null);
  const [directionsTrigger, setDirectionsTrigger] = useState(0);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [portalLoading, setPortalLoading] = useState(false);

  const userIdNo = sessionUser?.id ? getCustomerOtp(sessionUser.id) : null;

  // Split-screen Discovery UI state
  const [activeView, setActiveView] = useState<'discover' | 'orders'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortFilter, setSortFilter] = useState<string>('nearest');
  const [listLayout, setListLayout] = useState<'list' | 'grid'>('list');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const pendingScannedShopRef = useRef<string | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const knownOrderStatusesRef = useRef<Record<string, string> | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const seenStorageUserRef = useRef<string | null>(null);
  const activeSessionUserIdRef = useRef<string | null>(null);
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const lastChimeAtRef = useRef<number>(0);
  const readyAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopReadyPickupChime = () => {
    const audio = readyAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  };

  const playReadyPickupChime = () => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    if (now - lastChimeAtRef.current < 3000) return;

    try {
      const audio = readyAudioRef.current || new Audio(readyPickupChimeUrl);
      audio.loop = false;
      readyAudioRef.current = audio;
      if (!audio.paused && !audio.ended) return;

      lastChimeAtRef.current = now;
      audio.muted = false;
      audio.volume = 0.85;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          lastChimeAtRef.current = 0;
          console.warn('Order ready chime blocked until interaction:', err);
        });
      }
    } catch (err) {
      console.warn('Failed to play ready pickup chime:', err);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio(readyPickupChimeUrl);
    audio.preload = 'auto';
    audio.loop = false;
    readyAudioRef.current = audio;

    // Warm up WebAudio/media playback on first user gesture using a separate muted instance
    // so it never interrupts or pauses an active alert chime.
    const unlockAudio = () => {
      const warmAudio = new Audio(readyPickupChimeUrl);
      warmAudio.muted = true;
      warmAudio.volume = 0;
      const p = warmAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          warmAudio.pause();
          warmAudio.src = '';
          window.removeEventListener('pointerdown', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
        }).catch(() => {
          // Will retry on next gesture if needed
        });
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      audio.pause();
    };
  }, []);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [notifPromptDismissed, setNotifPromptDismissed] = useState(false);
  const [orderAlertToast, setOrderAlertToast] = useState<{
    userIdNo?: string;
    shopName: string;
    status: 'completed' | 'ready_for_collection';
    customTitle?: string;
    customBody?: string;
  } | null>(null);
  const [collectionAlerts, setCollectionAlerts] = useState<CustomerNotification[]>([]);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Print Job Drawer Flow & Upload Form state
  const [jobStep, setJobStep] = useState<'choose' | 'configure'>('choose');
  const [printCategory, setPrintCategory] = useState<'documents' | 'passport' | 'photos'>('documents');
  const [files, setFiles] = useState<File[]>([]);
  const [activeDocIdx, setActiveDocIdx] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<'B&W' | 'Color'>('B&W');
  const [paperSize, setPaperSize] = useState<string>('A4');
  const [sides, setSides] = useState<'Single' | 'Double'>('Single');
  const [orientation, setOrientation] = useState<'Portrait' | 'Landscape'>('Portrait');
  const [bindingType, setBindingType] = useState('None');
  const [passportSetCount, setPassportSetCount] = useState<8 | 16 | 32>(16);
  const [passportBg, setPassportBg] = useState('Keep Original');
  const [changingPassportSize, setChangingPassportSize] = useState(false);
  const [photoFinish, setPhotoFinish] = useState('Kodak 210 GSM Glossy');
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [photoRotation, setPhotoRotation] = useState<0 | 90 | 180 | 270>(0);
  const [photoFitMode, setPhotoFitMode] = useState<'cover' | 'contain'>('contain');
  const [photoTone, setPhotoTone] = useState<'original' | 'vivid' | 'warm' | 'bw'>('original');
  const [applyingPhotoEdit, setApplyingPhotoEdit] = useState(false);
  const [submittingJob, setSubmittingJob] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobSuccess, setJobSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const qShop = url.searchParams.get('sid') || url.searchParams.get('shop');
      if (qShop) {
        const rawPayload = url.search;
        pendingScannedShopRef.current = rawPayload;
        try {
          window.sessionStorage.setItem('prinrox_pending_shop', rawPayload);
        } catch {
          // Ignore storage errors
        }
        url.searchParams.delete('shop');
        url.searchParams.delete('sid');
        window.history.replaceState({}, document.title, url.pathname + url.search);
      } else {
        try {
          const saved = window.sessionStorage.getItem('prinrox_pending_shop');
          if (saved) pendingScannedShopRef.current = saved;
        } catch {
          // Ignore storage errors
        }
      }
    }

    if (isNhostConfigured) {
      const params = new URLSearchParams(window.location.search);
      const refreshToken = params.get('refreshToken');

      if (refreshToken) {
        nhost.auth
          .refreshToken({ refreshToken })
          .then((res) => {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (res.body?.user) {
              activeSessionUserIdRef.current = res.body.user.id;
              setSessionUser(res.body.user);
              loadPortalData(res.body.user.id);
            }
          })
          .catch((err) => {
            console.error('OAuth refresh error:', err);
          });
      } else {
        const session = nhost.getUserSession();
        if (session?.user) {
          activeSessionUserIdRef.current = session.user.id;
          setSessionUser(session.user);
          loadPortalData(session.user.id);
        }
      }

      const unsubscribe = nhost.sessionStorage.onChange((storedSession) => {
        const user = storedSession?.user ?? null;
        setSessionUser(user);
        if (user) {
          // Only reload when the signed-in user changes; ignore silent JWT token refreshes
          if (activeSessionUserIdRef.current !== user.id) {
            activeSessionUserIdRef.current = user.id;
            loadPortalData(user.id);
          }
        } else {
          activeSessionUserIdRef.current = null;
          seenStorageUserRef.current = null;
          knownOrderStatusesRef.current = null;
          seenNotificationIdsRef.current = new Set();
          setOrders([]);
          setCollectionAlerts([]);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return false;
    }
    if (Notification.permission === 'granted') {
      setNotifPermission('granted');
      setNotifPromptDismissed(true);
      return true;
    }
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        setNotifPromptDismissed(true);
        new Notification('Prinrox Alerts Enabled', {
          body: 'You will be notified immediately when your print job is ready or completed.',
          tag: 'prinrox-alerts-enabled',
        });
        return true;
      }
      if (result === 'denied') {
        setNotifPromptDismissed(true);
      }
    } catch (err) {
      console.error('Notification permission request failed:', err);
    }
    setNotifPermission(Notification.permission);
    return false;
  };

  // Attempt browser permission prompt once when signed in if permission is still 'default'
  useEffect(() => {
    if (!sessionUser || typeof window === 'undefined' || !('Notification' in window)) return;
    setNotifPermission(Notification.permission);
    if (Notification.permission === 'default') {
      Notification.requestPermission()
        .then((res) => {
          setNotifPermission(res);
          if (res !== 'default') setNotifPromptDismissed(true);
        })
        .catch(() => {
          // Some browsers require a direct click gesture; our banner/button handles it cleanly.
        });
    }
  }, [sessionUser?.id]);

  const persistCollectionAlerts = (userId: string | undefined, alerts: CustomerNotification[]) => {
    if (!userId || typeof window === 'undefined') return;
    try {
      if (alerts.length === 0) {
        window.sessionStorage.removeItem(`prinrox_pickup_alerts_${userId}`);
      } else {
        window.sessionStorage.setItem(`prinrox_pickup_alerts_${userId}`, JSON.stringify(alerts));
      }
    } catch {
      // Ignore storage errors
    }
  };

  useEffect(() => {
    if (!sessionUser?.id || typeof window === 'undefined') return;
    try {
      const saved = window.sessionStorage.getItem(`prinrox_pickup_alerts_${sessionUser.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const now = Date.now();
          const fresh = parsed.filter((item: any) => {
            const createdMs = item?.created_at ? Date.parse(item.created_at) : NaN;
            return Number.isNaN(createdMs) || now - createdMs < READY_FOR_COLLECTION_TTL_MS;
          });
          for (const item of fresh) {
            if (item?.id) seenNotificationIdsRef.current.add(item.id);
          }
          setCollectionAlerts(fresh);
          if (fresh.length !== parsed.length) {
            persistCollectionAlerts(sessionUser.id, fresh);
          }
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }, [sessionUser?.id]);

  const hydrateSeenKeys = (userId: string): Set<string> => {
    if (seenStorageUserRef.current === userId) {
      return seenNotificationIdsRef.current;
    }
    const hydrated = new Set<string>();
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(`prinrox_seen_alert_keys_${userId}`);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            for (const key of arr) {
              if (typeof key === 'string') hydrated.add(key);
            }
          }
        }
      } catch {
        // Ignore storage read errors
      }
    }
    seenNotificationIdsRef.current = hydrated;
    seenStorageUserRef.current = userId;
    return hydrated;
  };

  const recordSeenKeys = (userId: string, keys: string[]) => {
    if (!userId || keys.length === 0) return;
    const set = hydrateSeenKeys(userId);
    for (const k of keys) {
      set.add(k);
    }
    if (typeof window !== 'undefined') {
      try {
        const latest = Array.from(set).slice(-250);
        seenNotificationIdsRef.current = new Set(latest);
        window.localStorage.setItem(`prinrox_seen_alert_keys_${userId}`, JSON.stringify(latest));
      } catch {
        // Ignore storage write errors
      }
    }
  };

  // Auto-dismiss live popup toast after 8 seconds so alerts never linger on screen
  useEffect(() => {
    if (!orderAlertToast) return;
    const timer = window.setTimeout(() => {
      setOrderAlertToast(null);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [orderAlertToast]);

  // Unified live sync: deduplicates notifications + order status transitions so each print job rings strictly once
  const applyLiveSync = async (
    userId: string,
    incomingOrders: Order[],
    incomingNotifs: CustomerNotification[]
  ) => {
    const seen = hydrateSeenKeys(userId);
    const idNo = getCustomerOtp(userId);
    const prevMap = knownOrderStatusesRef.current;
    const syncNow = Date.now();
    setNowMs(syncNow);

    // Partition active orders vs orders whose 8-hour ready_for_collection window has expired
    const expiredOrders = incomingOrders.filter((o) => isReadyOrderExpired(o, syncNow));
    const expiredIds = new Set(expiredOrders.map((o) => o.id));
    const activeIncomingOrders = incomingOrders.filter((o) => !expiredIds.has(o.id));

    // 1. Filter strictly unseen DB notifications and mark them seen SYNCHRONOUSLY before any await
    const allUnseenNotifs = incomingNotifs.filter((n) => !seen.has(n.id));
    if (allUnseenNotifs.length > 0) {
      recordSeenKeys(userId, allUnseenNotifs.map((n) => n.id));
    }
    const unseenNotifs = allUnseenNotifs.filter((n) => {
      const createdMs = n.created_at ? Date.parse(n.created_at) : NaN;
      return Number.isNaN(createdMs) || syncNow - createdMs < READY_FOR_COLLECTION_TTL_MS;
    });

    // 2. Identify active finished orders and mark their keys seen SYNCHRONOUSLY
    const finishedOrders = activeIncomingOrders.filter(
      (o) => o.status === 'ready_for_collection' || o.status === 'completed'
    );
    const newlyTransitionedOrders = finishedOrders.filter((o) => {
      if (seen.has(`order-${o.id}`)) return false;
      const prevStatus = prevMap?.[o.id];
      return prevMap === null || (prevStatus !== undefined && prevStatus !== o.status);
    });

    if (finishedOrders.length > 0) {
      recordSeenKeys(
        userId,
        finishedOrders.map((o) => `order-${o.id}`)
      );
    }

    // Determine which new orders are not already covered by an unseen DB notification in this same cycle
    const notifMsgs = unseenNotifs
      .map((n) => (n.message || '').toLowerCase())
      .filter(Boolean);
    const coveredByNotif = (order: Order) => {
      if (unseenNotifs.length === 0) return false;
      const fileName = (order.order_documents?.[0]?.document?.file_name || '').toLowerCase();
      const shopName = (order.shop?.shop_name || '').toLowerCase();
      return (
        notifMsgs.some((m) => (fileName && m.includes(fileName)) || (shopName && m.includes(shopName))) ||
        newlyTransitionedOrders.length === 1
      );
    };

    const standaloneNewOrders = newlyTransitionedOrders.filter((o) => !coveredByNotif(o));
    const shouldRingOnce = unseenNotifs.length > 0 || standaloneNewOrders.length > 0;

    if (unseenNotifs.length > 0) {
      const latestNotif = unseenNotifs[0];
      setOrderAlertToast({
        userIdNo: idNo,
        shopName: latestNotif.message,
        status: 'ready_for_collection',
        customTitle: latestNotif.title,
        customBody: latestNotif.message,
      });

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const cleanTitle = (latestNotif.title || 'Ready for Pickup').replace(/\s*\(ID:\s*\d+\)/i, '');
        const nativeNotif = new Notification(cleanTitle, {
          body: latestNotif.message,
          tag: `prinrox-notif-${latestNotif.id}`,
          silent: true,
        });
        nativeNotif.onclick = () => {
          window.focus();
          setActiveView('orders');
          nativeNotif.close();
        };
      }
    } else if (standaloneNewOrders.length > 0) {
      const latestOrder = standaloneNewOrders[0];
      const shopTitle = latestOrder.shop?.shop_name || 'your campus print shop';
      const isCompleted = latestOrder.status === 'completed';

      setOrderAlertToast({
        userIdNo: idNo,
        shopName: shopTitle,
        status: isCompleted ? 'completed' : 'ready_for_collection',
      });

      if (isCompleted) {
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { y: 0.7 },
          colors: ['#10B981', '#FDE09B', '#FF3B00'],
        });
      }

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(
          isCompleted ? 'Print Job Completed!' : 'Ready for Pickup!',
          {
            body: isCompleted
              ? `Your print order at ${shopTitle} is marked completed. ID No: ${idNo}.`
              : `${shopTitle} has finished printing. Show ID No ${idNo} at the shop.`,
            tag: `prinrox-order-${latestOrder.id}`,
            silent: true,
          }
        );
        n.onclick = () => {
          window.focus();
          setActiveView('orders');
          n.close();
        };
      }
    }

    if (shouldRingOnce) {
      playReadyPickupChime();
    }

    // Merge genuinely new alerts and prune alerts older than 8 hours or matching expired orders
    const addedAlerts: CustomerNotification[] =
      unseenNotifs.length > 0 || standaloneNewOrders.length > 0
        ? [
            ...unseenNotifs,
            ...standaloneNewOrders.map((o) => ({
              id: `order-${o.id}`,
              user_id: userId,
              order_id: null,
              title: 'Ready to Collect',
              message: `${o.shop?.shop_name || 'Your print shop'} finished printing${o.order_documents?.[0]?.document?.file_name ? ` ${o.order_documents[0].document.file_name}` : ''}. Show ID No ${idNo} at the counter.`,
              notification_type: 'ready_for_collection',
              is_read: false,
              created_at: new Date().toISOString(),
            })),
          ]
        : [];

    setCollectionAlerts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const newOnes = addedAlerts.filter((a) => !existingIds.has(a.id));
      const merged = [...newOnes, ...prev].filter((alertItem) => {
        if (expiredOrders.some((exp) => doesAlertMatchOrder(alertItem, exp))) return false;
        const createdMs = alertItem.created_at ? Date.parse(alertItem.created_at) : NaN;
        return Number.isNaN(createdMs) || syncNow - createdMs < READY_FOR_COLLECTION_TTL_MS;
      }).slice(0, 10);
      persistCollectionAlerts(userId, merged);
      return merged;
    });

    // Acknowledge / delete delivered notifications in DB immediately
    if (allUnseenNotifs.length > 0) {
      await deleteCustomerNotifications(allUnseenNotifs.map((n) => n.id));
    }

    // Auto-delete orders, linked documents, and any remaining storage blobs ONLY 8 hours after ready_for_collection
    if (expiredOrders.length > 0) {
      await cleanupCustomerNotifiedOrders(expiredOrders);
    }

    const nextMap: Record<string, string> = {};
    for (const o of activeIncomingOrders) {
      nextMap[o.id] = o.status;
    }
    knownOrderStatusesRef.current = nextMap;
    setOrders(activeIncomingOrders);
  };

  // Single-flight background sync every 10s while visible (never overlaps with loadPortalData)
  useEffect(() => {
    if (!sessionUser?.id) return;
    let active = true;
    const currentUserId = sessionUser.id;

    const silentPoll = async () => {
      if (!active || syncInFlightRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const job = (async () => {
        try {
          const { orders: latestOrders, notifications: latestNotifs } = await fetchCustomerLiveSync(
            currentUserId
          );
          if (active) {
            await applyLiveSync(currentUserId, latestOrders, latestNotifs);
          }
        } catch (err) {
          console.error('Background order poll error:', err);
        } finally {
          syncInFlightRef.current = null;
        }
      })();
      syncInFlightRef.current = job;
      await job;
    };

    const intervalId = window.setInterval(silentPoll, 10000);
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        silentPoll();
      }
    };
    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, [sessionUser?.id]);

  // Keep 8-hour pickup countdowns fresh every minute and auto-purge expired orders the moment 8h elapses
  useEffect(() => {
    if (!sessionUser?.id) return;
    const currentUserId = sessionUser.id;
    let cancelled = false;

    const purgeDueOrdersAndAlerts = async () => {
      if (cancelled) return;
      const now = Date.now();
      setNowMs(now);

      const dueOrders = orders.filter((o) => isReadyOrderExpired(o, now));
      if (dueOrders.length > 0) {
        const dueIds = new Set(dueOrders.map((o) => o.id));
        setOrders((prev) => prev.filter((o) => !dueIds.has(o.id)));
        await cleanupCustomerNotifiedOrders(dueOrders);
      }

      setCollectionAlerts((prev) => {
        const filtered = prev.filter((alertItem) => {
          if (dueOrders.some((exp) => doesAlertMatchOrder(alertItem, exp))) return false;
          const createdMs = alertItem.created_at ? Date.parse(alertItem.created_at) : NaN;
          return Number.isNaN(createdMs) || now - createdMs < READY_FOR_COLLECTION_TTL_MS;
        });
        if (filtered.length !== prev.length) {
          persistCollectionAlerts(currentUserId, filtered);
          return filtered;
        }
        return prev;
      });
    };

    const tickId = window.setInterval(() => {
      purgeDueOrdersAndAlerts();
    }, 60_000);

    const nextWaitMs = orders.reduce<number | null>((soonest, o) => {
      const rem = getReadyOrderRemainingMs(o);
      if (rem === null) return soonest;
      return soonest === null ? rem : Math.min(soonest, rem);
    }, null);

    let expiryTimeoutId: number | null = null;
    if (nextWaitMs !== null && nextWaitMs < 24 * 60 * 60 * 1000) {
      expiryTimeoutId = window.setTimeout(() => {
        purgeDueOrdersAndAlerts();
      }, Math.max(500, nextWaitMs + 500));
    }

    return () => {
      cancelled = true;
      window.clearInterval(tickId);
      if (expiryTimeoutId !== null) window.clearTimeout(expiryTimeoutId);
    };
  }, [sessionUser?.id, orders]);

  useEffect(() => {
    if (!showOrderModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOrderModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOrderModal]);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showProfileMenu]);

  useEffect(() => {
    if (!showSortMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSortMenu(false);
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [showSortMenu]);

  useEffect(() => {
    const urls = files.map((f) =>
      f.type.startsWith('image/') ||
      f.type === 'application/pdf' ||
      f.name.toLowerCase().endsWith('.pdf')
        ? URL.createObjectURL(f)
        : ''
    );
    setPreviewUrls(urls);
    return () => {
      urls.forEach((u) => {
        if (u) URL.revokeObjectURL(u);
      });
    };
  }, [files]);

  const countPdfPagesBestEffort = async (docFiles: File[]): Promise<number> => {
    let total = 0;
    for (const f of docFiles) {
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        try {
          const text = await f.slice(0, 4 * 1024 * 1024).text();
          const matches = text.match(/\/Type\s*\/Page\b(?!s)/g);
          total += matches && matches.length > 0 ? matches.length : 1;
        } catch {
          total += 1;
        }
      } else {
        total += 1;
      }
    }
    return Math.max(1, total);
  };

  const handleDocumentsPicked = async (picked: File[], append: boolean) => {
    if (picked.length === 0) return;
    const nextList = append ? [...files, ...picked] : picked;
    setFiles(nextList);
    setActiveDocIdx(append ? nextList.length - 1 : 0);
    const detectedPages = await countPdfPagesBestEffort(nextList);
    setPageCount(detectedPages);
  };

  const handleRemoveDocument = async (removeIdx: number) => {
    const nextList = files.filter((_, i) => i !== removeIdx);
    setFiles(nextList);
    setActiveDocIdx((prev) => Math.max(0, Math.min(prev, nextList.length - 1)));
    if (nextList.length > 0 && printCategory === 'documents') {
      const detectedPages = await countPdfPagesBestEffort(nextList);
      setPageCount(detectedPages);
    } else if (nextList.length === 0) {
      setPageCount(1);
    }
  };

  const loadPortalData = async (userId: string) => {
    if (syncInFlightRef.current) {
      await syncInFlightRef.current;
    }
    setPortalLoading(true);
    const loadJob = (async () => {
      try {
        const [shopsList, liveSync] = await Promise.all([
          fetchShops(),
          fetchCustomerLiveSync(userId),
        ]);
        setShops(shopsList);
        const pendingQrTarget =
          pendingScannedShopRef.current ||
          (typeof window !== 'undefined' ? window.sessionStorage.getItem('prinrox_pending_shop') : null);
        const matchedQrShop = pendingQrTarget ? findShopByQrPayload(shopsList, pendingQrTarget) : null;
        if (matchedQrShop) {
          pendingScannedShopRef.current = null;
          try {
            window.sessionStorage.removeItem('prinrox_pending_shop');
          } catch {
            // Ignore storage errors
          }
          setActiveView('discover');
          openPrintFlow(matchedQrShop);
        } else if (shopsList.length > 0 && !selectedShop) {
          setSelectedShop(shopsList[0]);
        }
        await applyLiveSync(userId, liveSync.orders, liveSync.notifications);
      } catch (e) {
        console.error(e);
      } finally {
        setPortalLoading(false);
        syncInFlightRef.current = null;
      }
    })();
    syncInFlightRef.current = loadJob;
    await loadJob;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await nhost.auth.signInEmailPassword({ email, password });
        const user = res.body.session?.user;
        if (user) {
          activeSessionUserIdRef.current = user.id;
          setSessionUser(user);
          setSuccessMsg(`Welcome back, ${user.email}!`);
          await loadPortalData(user.id);
        }
      } else {
        const res = await nhost.auth.signUpEmailPassword({
          email,
          password,
          options: {
            displayName: name || 'Student',
            defaultRole: 'user',
            metadata: { role: 'customer' },
          },
        });
        const user = res.body.session?.user;
        if (user) {
          activeSessionUserIdRef.current = user.id;
          setSessionUser(user);
          await upsertCustomerProfile({
            id: user.id,
            email: user.email || email,
            fullName: name,
          });
          setSuccessMsg('Account created successfully!');
          await loadPortalData(user.id);
        } else {
          setSuccessMsg('Account created! Please verify your email or sign in.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const googleUrl = nhost.auth.signInProviderURL('google', {
        redirectTo: window.location.origin,
      });
      window.location.href = googleUrl;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await nhost.auth.signOut({ all: false });
    } catch (e) {
      console.error(e);
    }
    nhost.sessionStorage.remove();
    persistCollectionAlerts(sessionUser?.id, []);
    knownOrderStatusesRef.current = null;
    seenNotificationIdsRef.current = new Set();
    setSessionUser(null);
    setOrders([]);
    setCollectionAlerts([]);
    setDirectionsShop(null);
    setShowProfileMenu(false);
    setOrderAlertToast(null);
    setSuccessMsg(null);
    setErrorMsg(null);
    setEmail('');
    setPassword('');
  };

  const focusShopOnMap = (shop: Shop) => {
    setSelectedShop(shop);
    setMapFocusTrigger((n) => n + 1);
    if (directionsShop && directionsShop.id !== shop.id) {
      setDirectionsShop(null);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const showShopDirections = (shop: Shop) => {
    setActiveView('discover');
    setIsMapExpanded(false);
    setSelectedShop(shop);
    setDirectionsShop(shop);
    setDirectionsTrigger((n) => n + 1);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      window.setTimeout(() => {
        mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  };

  const openPrintFlow = (shop: Shop) => {
    setSelectedShop(shop);
    setMapFocusTrigger((n) => n + 1);
    setJobStep('choose');
    setJobError(null);
    setShowOrderModal(true);
  };

  const selectPrintCategory = (category: 'documents' | 'passport' | 'photos') => {
    setPrintCategory(category);
    setFiles([]);
    setActiveDocIdx(0);
    setJobError(null);
    if (category === 'documents') {
      setColorMode('B&W');
      setPaperSize('A4');
      setSides('Single');
      setOrientation('Portrait');
      setBindingType('None');
      setPageCount(1);
      setCopies(1);
    } else if (category === 'passport') {
      setColorMode('Color');
      setPaperSize('Passport 35x45mm');
      setSides('Single');
      setBindingType('Kodak 210 GSM');
      setPassportSetCount(16);
      setPhotoFinish('Kodak 210 GSM Glossy');
      setPassportBg('Keep Original');
      setChangingPassportSize(false);
      setEditingPhoto(false);
      setPhotoRotation(0);
      setPhotoFitMode('cover');
      setPhotoTone('original');
      setPageCount(1);
      setCopies(1);
    } else {
      setColorMode('Color');
      setPaperSize('Album 6x4 inch');
      setSides('Single');
      setBindingType('Kodak 210 GSM');
      setPhotoFinish('Kodak 210 GSM Glossy');
      setEditingPhoto(false);
      setPhotoRotation(0);
      setPhotoFitMode('contain');
      setPhotoTone('original');
      setPageCount(1);
      setCopies(1);
    }
    setJobStep('configure');
  };

  const handlePhotosAdded = (picked: File[], append: boolean) => {
    if (picked.length === 0) return;
    const nextList = append ? [...files, ...picked] : picked;
    setFiles(nextList);
    setActiveDocIdx(append ? nextList.length - 1 : 0);
    setEditingPhoto(false);
    setPhotoRotation(0);
    setPhotoTone('original');
  };

  const handleApplyPhotoEdit = async () => {
    const targetFile = files[activeDocIdx];
    const targetUrl = previewUrls[activeDocIdx];
    if (!targetFile || !targetUrl) {
      setEditingPhoto(false);
      return;
    }
    if (photoRotation === 0 && photoTone === 'original') {
      setEditingPhoto(false);
      return;
    }

    setApplyingPhotoEdit(true);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = targetUrl;
      });

      const rotatedQuarter = photoRotation === 90 || photoRotation === 270;
      const canvas = document.createElement('canvas');
      canvas.width = rotatedQuarter ? img.naturalHeight : img.naturalWidth;
      canvas.height = rotatedQuarter ? img.naturalWidth : img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter =
          photoTone === 'vivid'
            ? 'contrast(1.14) saturate(1.25)'
            : photoTone === 'warm'
            ? 'sepia(0.28) saturate(1.15)'
            : photoTone === 'bw'
            ? 'grayscale(1) contrast(1.08)'
            : 'none';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((photoRotation * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, targetFile.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92)
        );
        if (blob) {
          const editedFile = new File([blob], targetFile.name, { type: blob.type });
          setFiles((prev) => prev.map((f, idx) => (idx === activeDocIdx ? editedFile : f)));
          setPhotoRotation(0);
          setPhotoTone('original');
        }
      }
    } catch (err) {
      console.error('Photo edit canvas error:', err);
    } finally {
      setApplyingPhotoEdit(false);
      setEditingPhoto(false);
    }
  };

  const getDocPerPageRate = (mode: 'B&W' | 'Color', sideMode: 'Single' | 'Double'): number => {
    const matchedRate =
      selectedShop?.pricing?.find(
        (p) => p.paper_size === 'A4' && p.color_mode === mode && p.sides === sideMode
      ) ||
      selectedShop?.pricing?.find((p) => p.color_mode === mode && p.sides === sideMode) ||
      selectedShop?.pricing?.find((p) => p.color_mode === mode);
    if (matchedRate && Number(matchedRate.price_per_page) > 0) {
      return Number(matchedRate.price_per_page);
    }
    return mode === 'Color' ? 10 : 3;
  };

  const computeEstimatedPrice = (): number => {
    if (printCategory === 'passport') {
      const matched =
        PASSPORT_QUANTITIES.find((q) => q.count === passportSetCount) || PASSPORT_QUANTITIES[1];
      const photoUnits = Math.max(1, files.length || 1);
      return matched.price * photoUnits;
    }
    if (printCategory === 'photos') {
      const matched =
        PHOTO_PRINT_SIZES.find((s) => s.value === paperSize) || PHOTO_PRINT_SIZES[1];
      const photoUnits = Math.max(1, files.length || 1);
      return matched.price * copies * photoUnits;
    }

    const basePerPage = getDocPerPageRate(colorMode, sides);
    const bindingFee =
      bindingType === 'Spiral Binding'
        ? 25
        : bindingType === 'Soft Binding'
        ? 35
        : 0;
    return pageCount * copies * basePerPage + bindingFee * copies;
  };

  const handlePrintJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser || !selectedShop || files.length === 0) return;
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      requestNotificationPermission();
    }
    setJobError(null);
    setJobSuccess(null);
    setSubmittingJob(true);

    try {
      const price = computeEstimatedPrice();
      let uploadQueue = files;
      let effectivePages =
        printCategory === 'documents' ? pageCount : Math.max(1, files.length);

      const summaryParts: string[] = [];
      if (printCategory === 'documents') {
        const customerDisplay =
          sessionUser.displayName || name || sessionUser.email || 'Prinrox Customer';
        const surpriseActivity = pickNextSurpriseActivity(sessionUser.id);
        const prep = await prepareDocumentsWithCoverPage({
          files,
          customerName: customerDisplay,
          pickupOtp: userIdNo || '0000',
          docPageCount: pageCount,
          activity: surpriseActivity,
        });
        uploadQueue = prep.preparedFiles;
        effectivePages = prep.totalPages;

        summaryParts.push(`Type: Documents`);
        summaryParts.push(`Sides: ${sides === 'Double' ? 'Front & Back' : 'Single Side'}`);
        summaryParts.push(`Orientation: ${orientation}`);
        summaryParts.push(`Binding: ${bindingType}`);
      } else if (printCategory === 'passport') {
        const sizeMeta =
          PASSPORT_SIZES.find((s) => s.value === paperSize) || PASSPORT_SIZES[0];
        summaryParts.push(`Type: Passport Photos`);
        summaryParts.push(`Quantity: ${passportSetCount} photos`);
        summaryParts.push(`Size: ${sizeMeta.label} (${sizeMeta.dims})`);
        summaryParts.push(`Stock: ${photoFinish}`);
        summaryParts.push(`Bg/Crop: ${passportBg}`);
        if (photoRotation !== 0) summaryParts.push(`Rotate: ${photoRotation}deg`);
      } else {
        const sizeMeta =
          PHOTO_PRINT_SIZES.find((s) => s.value === paperSize) || PHOTO_PRINT_SIZES[1];
        summaryParts.push(`Type: Photos`);
        summaryParts.push(`Size: ${sizeMeta.label} (${sizeMeta.dims})`);
        summaryParts.push(`Stock: ${photoFinish}`);
        summaryParts.push(`Framing: ${photoFitMode === 'cover' ? 'Fill Crop' : 'Fit Full'}`);
        if (photoRotation !== 0) summaryParts.push(`Rotate: ${photoRotation}deg`);
        if (photoTone !== 'original') summaryParts.push(`Tone: ${photoTone}`);
      }

      const compiledNotes = `[${summaryParts.join(' · ')}]`;

      const order = await submitCustomerPrintJob({
        customerId: sessionUser.id,
        customerEmail: sessionUser.email || email,
        customerName: sessionUser.displayName || name,
        shop: selectedShop,
        file: uploadQueue[0] || files[0],
        files: uploadQueue,
        pageCount: effectivePages,
        copies: printCategory === 'passport' ? passportSetCount : copies,
        colorMode,
        paperSize,
        sides,
        bindingType,
        printCategory,
        price,
        notes: compiledNotes,
      });

      if (order) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#FF3B00', '#FDE09B', '#10B981'],
        });
        setJobSuccess(
          `Print job sent to ${selectedShop.shop_name}! Your ID No: ${userIdNo}`
        );
        setShowOrderModal(false);
        setJobStep('choose');
        setFiles([]);
        loadPortalData(sessionUser.id);
      }
    } catch (err: any) {
      setJobError(err.message || 'Could not submit print job.');
    } finally {
      setSubmittingJob(false);
    }
  };

  // =========================================================================
  // VIEW 1: CLEAN AUTH WINDOW (Before customer signs in)
  // =========================================================================
  if (!sessionUser) {
    return (
      <div className="min-h-screen lg:h-screen w-full lg:w-screen overflow-y-auto lg:overflow-hidden bg-black text-white font-sans antialiased selection:bg-[#FF3B00] selection:text-white flex flex-col lg:flex-row">
        
        {/* LEFT COLUMN: Editorial Typography & Authentication Form */}
        <div className="w-full lg:w-[48%] xl:w-[46%] h-full p-6 sm:p-8 lg:py-8 lg:px-10 xl:py-10 xl:px-12 flex flex-col justify-between bg-black text-white relative z-10 overflow-y-auto no-scrollbar">
          
          {/* Top Brand Logo */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif font-black text-2xl tracking-tight text-white lowercase">
                prinrox
              </span>
              <span className="text-[#FF3B00] text-sm" aria-hidden="true">✻</span>
            </div>
          </div>

          {/* Center Auth Form Container */}
          <div className="my-auto py-2 w-full max-w-md xl:max-w-lg mx-auto lg:mx-0 space-y-6">
            
            {/* Main Editorial Headline */}
            <div>
              <h1 className="font-serif font-black text-5xl sm:text-6xl md:text-7xl lg:text-[72px] xl:text-[82px] text-white tracking-[-0.04em] leading-[0.94] text-balance">
                Disc<span className="text-[#FF3B00]" aria-hidden="true">✻</span>ver<br />
                <span className="font-normal text-white">Zero Waiting.</span>
              </h1>
            </div>

            {/* Mode Selector Tabs (Sign In vs Sign Up) */}
            <div className="flex items-center gap-1 p-1 bg-white/10 rounded-full w-fit border border-white/15">
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`px-5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-[#0F1115]'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`px-5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-[#0F1115]'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Status Alerts */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-sans flex items-start gap-2 animate-panel-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-sans flex items-start gap-2 animate-panel-in">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" aria-hidden="true" />
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
                    className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] transition-colors"
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
                  className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] transition-colors"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] transition-colors"
                  required
                  minLength={6}
                />
              </div>

              {/* Emphasized CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="h-11 px-6 rounded-full bg-[#D93200] hover:bg-[#FF3B00] disabled:opacity-50 text-white font-sans font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer w-full mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{loading ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              </button>
            </form>

            {/* Divider: or */}
            <div className="relative flex items-center justify-center py-1">
              <div className="w-full border-t border-white/15" />
              <span className="bg-black px-3 font-sans text-xs text-neutral-400">
                or
              </span>
              <div className="w-full border-t border-white/15" />
            </div>

            {/* Google Auth Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full h-11 px-4 rounded-full bg-white hover:bg-neutral-100 text-[#0F1115] font-sans font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 border border-neutral-200"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>Continue with Google</span>
            </button>

          </div>

          <div className="h-2" />
        </div>

        {/* RIGHT COLUMN: Editorial Card with Black Cat Artwork */}
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

  const availableServices = Array.from(
    new Set([
      'Soft Binding',
      ...shops.flatMap((s) => (s.services || []).map((srv) => srv.service_name.trim())).filter(Boolean),
    ])
  ).sort();

  const activeServiceFilter = sortFilter.startsWith('service:')
    ? sortFilter.slice('service:'.length)
    : null;

  // Derived filtered & sorted shop list for split discovery view
  const filteredShops = [...shops]
    .filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const hay = `${s.shop_name} ${s.address || ''} ${s.city || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (activeServiceFilter) {
        const hasService = (s.services || []).some((srv) =>
          srv.service_name.toLowerCase().includes(activeServiceFilter.toLowerCase())
        );
        if (!hasService) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortFilter === 'price') {
        return getShopStartingRate(a) - getShopStartingRate(b);
      }
      if (sortFilter === 'name') {
        return a.shop_name.localeCompare(b.shop_name);
      }
      if (userCoords) {
        const da =
          a.latitude && a.longitude
            ? computeHaversineKm(userCoords.latitude, userCoords.longitude, Number(a.latitude), Number(a.longitude))
            : 9999;
        const db =
          b.latitude && b.longitude
            ? computeHaversineKm(userCoords.latitude, userCoords.longitude, Number(b.latitude), Number(b.longitude))
            : 9999;
        return da - db;
      }
      return 0;
    });

  // =========================================================================
  // VIEW 2: SPLIT-SCREEN CUSTOMER MAP DISCOVERY & PRINT HUB (BENTO THEME)
  // =========================================================================
  const totalSpent = orders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
  const unmatchedCollectionAlerts = collectionAlerts.filter(
    (alertItem) => !orders.some((o) => doesAlertMatchOrder(alertItem, o))
  );
  const totalPrintJobsCount = orders.length + unmatchedCollectionAlerts.length;
  const readyOrdersCount =
    orders.filter((o) => o.status === 'ready_for_collection').length +
    unmatchedCollectionAlerts.length;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden w-full bg-black text-white font-sans antialiased selection:bg-[#FF3B00] selection:text-white p-2.5 sm:p-3.5 flex flex-col gap-3">
      
      {/* Notification Permission Prompt Pill (shown until granted/denied/dismissed) */}
      {notifPermission === 'default' && !notifPromptDismissed && !jobSuccess && !orderAlertToast && (
        <div
          role="region"
          aria-label="Notification permission prompt"
          className="fixed bottom-5 left-5 z-40 max-w-md px-4 py-2.5 rounded-full bg-[#FAF9F6] text-[#0F1115] border-2 border-black/20 shadow-2xl flex items-center gap-3 animate-panel-in"
        >
          <BellRing className="w-4 h-4 text-[#D93200] shrink-0" aria-hidden="true" />
          <span className="text-xs font-sans font-semibold text-[#0F1115]">
            Allow alerts when your print job completes
          </span>
          <button
            type="button"
            onClick={requestNotificationPermission}
            className="px-3 py-1 rounded-full bg-[#D93200] hover:bg-black text-white text-[11px] font-sans font-bold transition-colors cursor-pointer shrink-0"
          >
            Allow
          </button>
          <button
            type="button"
            onClick={() => setNotifPromptDismissed(true)}
            className="text-neutral-500 hover:text-black cursor-pointer shrink-0"
            aria-label="Dismiss notification prompt"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Live Print Job Completed / Ready Toast */}
      {orderAlertToast && (
        <div
          role="status"
          className="fixed bottom-5 left-5 z-50 px-4 py-3 rounded-[20px] bg-black text-white text-xs font-sans shadow-2xl border-2 border-[#FDE09B] flex items-center gap-3 animate-panel-in max-w-md"
        >
          <div className="w-8 h-8 rounded-full bg-[#FDE09B] text-[#0F1115] flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-[#FDE09B]">
              {orderAlertToast.customTitle
                ? orderAlertToast.customTitle.replace(/\s*\(ID:\s*\d+\)/i, '')
                : orderAlertToast.status === 'completed'
                ? 'Print Job Completed'
                : 'Ready for Pickup'}
            </div>
            <div className="text-[11px] text-neutral-300 line-clamp-2">
              {orderAlertToast.customBody || orderAlertToast.shopName}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopReadyPickupChime();
              setActiveView('orders');
              setOrderAlertToast(null);
            }}
            className="px-3 py-1 rounded-full bg-[#D93200] hover:bg-white hover:text-[#0F1115] text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => {
              stopReadyPickupChime();
              setOrderAlertToast(null);
            }}
            className="text-neutral-400 hover:text-white cursor-pointer shrink-0"
            aria-label="Dismiss order alert"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Success Toast Notification after Submitting Job */}
      {jobSuccess && (
        <div
          role="status"
          className="fixed bottom-5 left-5 z-50 px-4 py-2.5 rounded-full bg-emerald-700 text-white text-xs font-sans font-semibold shadow-2xl border border-white/15 flex items-center gap-3 animate-panel-in"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>{jobSuccess}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setActiveView('orders');
              setJobSuccess(null);
            }}
            className="px-2.5 py-0.5 rounded-full bg-[#FDE09B] text-[#0F1115] text-[11px] font-bold hover:bg-white cursor-pointer"
          >
            View Order
          </button>
          <button
            type="button"
            onClick={() => setJobSuccess(null)}
            className="text-white/80 hover:text-white cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {activeView === 'discover' ? (
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          
          {/* LEFT BENTO COLUMN: OFF-WHITE FILTER BAR + BUTTER-YELLOW SHOP LIST */}
          {!isMapExpanded && (
            <section className="lg:col-span-6 xl:col-span-5 flex flex-col gap-3 min-h-0">
              
              {/* Top Off-White Filter & Sort Pill Card */}
              <div
                ref={sortMenuRef}
                className="relative rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-3.5 sm:px-5 sm:py-3.5 space-y-2.5 shrink-0 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-2.5" aria-hidden="true" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search shop name or campus area"
                      className="w-full h-9 pl-9 pr-3 rounded-full bg-white border border-black/20 text-xs font-sans text-[#0F1115] placeholder:text-neutral-500 focus:outline-none focus:border-[#D93200]"
                    />
                  </div>

                  {/* Scan Shop QR Code Trigger (near Profile Icon) */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSortMenu(false);
                      setShowProfileMenu(false);
                      setShowQrScanner(true);
                    }}
                    className="w-9 h-9 rounded-full bg-[#FDE09B] hover:bg-[#D93200] text-[#0F1115] hover:text-white border border-black/15 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Scan Shop QR Code"
                    aria-label="Scan shop QR code"
                  >
                    <QrCode className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {/* Single Profile Drawer Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSortMenu(false);
                      setShowProfileMenu(true);
                    }}
                    className="w-9 h-9 rounded-full bg-black hover:bg-[#D93200] text-[#FAF9F6] flex items-center justify-center transition-colors cursor-pointer relative shrink-0"
                    title="Account, Notifications & Orders"
                    aria-label="Open profile menu"
                    aria-expanded={showProfileMenu}
                  >
                    <User className="w-4 h-4" aria-hidden="true" />
                    {(orders.length > 0 || notifPermission === 'default') && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF3B00] border-2 border-[#FAF9F6]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
                  <div className="text-neutral-700 tabular-nums">
                    Showing <strong className="text-[#0F1115] font-bold">{filteredShops.length}</strong>{' '}
                    {filteredShops.length === 1 ? 'shop' : 'shops'}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-600">Sort by:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowSortMenu((v) => !v);
                        }}
                        className={`px-3 py-1 rounded-full border text-xs font-sans font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          showSortMenu || sortFilter !== 'nearest'
                            ? 'bg-black border-black text-[#FDE09B]'
                            : 'bg-white border-black/20 hover:border-black text-[#D93200]'
                        }`}
                        aria-expanded={showSortMenu}
                        aria-label="Toggle sort and filter menu"
                      >
                        <span className="truncate max-w-[140px]">
                          {sortFilter === 'nearest'
                            ? 'Nearest'
                            : sortFilter === 'price'
                            ? 'Lower Price'
                            : sortFilter === 'name'
                            ? 'A–Z'
                            : sortFilter.slice('service:'.length)}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-150 ${
                            showSortMenu ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-1 border-l border-black/15 pl-2">
                      <button
                        type="button"
                        onClick={() => setListLayout('list')}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          listLayout === 'list'
                            ? 'bg-black text-[#FDE09B]'
                            : 'text-neutral-600 hover:text-black'
                        }`}
                        aria-label="List layout"
                      >
                        <List className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setListLayout('grid')}
                        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                          listLayout === 'grid'
                            ? 'bg-black text-[#FDE09B]'
                            : 'text-neutral-600 hover:text-black'
                        }`}
                        aria-label="Grid layout"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Full-Width Sort & Filter Bento Dropdown */}
                {showSortMenu && (
                  <div
                    role="region"
                    aria-label="Sort and filter options"
                    className="absolute left-0 right-0 top-[calc(100%+10px)] z-40 rounded-[24px] bg-[#FAF9F6] text-[#0F1115] border border-black/20 shadow-2xl p-4 sm:p-5 space-y-3.5 animate-panel-in"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-600">
                          Sort Shops
                        </span>
                        {sortFilter !== 'nearest' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSortFilter('nearest');
                              setShowSortMenu(false);
                            }}
                            className="text-[11px] font-sans font-bold text-[#D93200] hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'nearest', label: 'Nearest' },
                          { value: 'price', label: 'Lower Price' },
                          { value: 'name', label: 'A–Z' },
                        ].map((opt) => {
                          const isActive = sortFilter === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSortFilter(opt.value);
                                setShowSortMenu(false);
                              }}
                              className={`py-2 px-3 rounded-xl border text-xs font-sans font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-black border-black text-[#FDE09B]'
                                  : 'bg-white border-black/15 text-[#0F1115] hover:border-black'
                              }`}
                            >
                              {isActive && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-black/10 pt-3 space-y-2">
                      <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-600">
                        Filter Service
                      </div>

                      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto bento-scroll pr-0.5">
                        {availableServices.map((srv) => {
                          const keyVal = `service:${srv}`;
                          const isActive = sortFilter === keyVal;
                          return (
                            <button
                              key={srv}
                              type="button"
                              onClick={() => {
                                setSortFilter(isActive ? 'nearest' : keyVal);
                                setShowSortMenu(false);
                              }}
                              className={`py-2 px-3 rounded-xl border text-xs font-sans flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-[#D93200] border-[#D93200] text-white font-semibold'
                                  : 'bg-white border-black/15 text-[#0F1115] hover:bg-[#FDE09B]/55 hover:border-black/35 font-medium'
                              }`}
                            >
                              <span className="truncate">{srv}</span>
                              {isActive && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Warm Butter-Yellow Bento Shop Listing Panel */}
              <div className="flex-1 min-h-0 rounded-[24px] bg-[#FDE09B] text-[#0F1115] p-3.5 sm:p-4 overflow-y-auto bento-scroll shadow-xl">
                {portalLoading && shops.length === 0 ? (
                  <div className="py-16 text-center space-y-2.5 rounded-[18px] bg-black/5">
                    <Loader2 className="w-6 h-6 text-[#D93200] animate-spin mx-auto" aria-hidden="true" />
                    <div className="text-xs font-sans font-medium text-neutral-800">
                      Loading nearby print shops...
                    </div>
                  </div>
                ) : filteredShops.length === 0 ? (
                  <div className="py-14 px-6 text-center rounded-[20px] bg-[#FAF9F6] border border-black/15 space-y-2.5">
                    <Store className="w-8 h-8 text-neutral-600 mx-auto" aria-hidden="true" />
                    <div className="text-sm font-sans font-bold text-[#0F1115]">No shops match your filter</div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSortFilter('nearest');
                      }}
                      className="px-4 py-1.5 rounded-full bg-black hover:bg-[#D93200] text-white text-xs font-sans font-semibold cursor-pointer transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                ) : (
                  <div
                    className={
                      listLayout === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                        : 'space-y-3'
                    }
                  >
                    {filteredShops.map((s) => {
                      const isSelected = selectedShop?.id === s.id;
                      const startingRate = getShopStartingRate(s);
                      const openHour = s.operating_hours?.[0]?.opening_time?.slice(0, 5) || '08:00';
                      const closeHour = s.operating_hours?.[0]?.closing_time?.slice(0, 5) || '21:00';
                      const primaryService = s.services?.[0]?.service_name || 'Laser Print';
                      const distKm =
                        userCoords && s.latitude && s.longitude
                          ? computeHaversineKm(
                              userCoords.latitude,
                              userCoords.longitude,
                              Number(s.latitude),
                              Number(s.longitude)
                            )
                          : null;

                      return (
                        <div
                          key={s.id}
                          onClick={() => focusShopOnMap(s)}
                          className={`p-4 rounded-[20px] transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-white border-2 border-[#FF3B00] ring-2 ring-[#FF3B00]/25 shadow-xl'
                              : 'bg-[#FAF9F6] border border-black/15 hover:border-black/45 shadow-sm'
                          }`}
                        >
                          {/* Card Body */}
                          <div className="min-w-0 flex flex-col justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-xs font-sans text-neutral-700 flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 text-[#FF3B00] shrink-0" aria-hidden="true" />
                                  <span className="truncate">
                                    {s.address || 'Campus Hub'}
                                    {s.city ? `, ${s.city}` : ''}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-[#FDE09B] border border-black/15 text-[10px] font-sans font-semibold text-[#0F1115] shrink-0 hidden sm:inline-block">
                                  {primaryService}
                                </span>
                              </div>

                              <h3 className="font-serif font-bold text-lg text-[#0F1115] leading-snug truncate text-balance">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    focusShopOnMap(s);
                                  }}
                                  className="w-full text-left truncate focus:outline-none focus-visible:underline cursor-pointer"
                                >
                                  {s.shop_name}
                                </button>
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-sans text-neutral-700 tabular-nums">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide">
                                  Open
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-neutral-500" aria-hidden="true" />
                                  <span>{openHour}–{closeHour}</span>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Layers className="w-3 h-3 text-neutral-500" aria-hidden="true" />
                                  <span>{(s.services || []).length} services</span>
                                </span>
                                {distKm !== null && (
                                  <span className="font-semibold text-[#D93200]">
                                    {distKm < 1
                                      ? `${Math.round(distKm * 1000)} m`
                                      : `${distKm.toFixed(1)} km`}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-black/10 flex items-center justify-between gap-2">
                              <div className="flex items-baseline gap-1">
                                <span className="font-sans font-bold text-lg tabular-nums text-[#0F1115]">
                                  ₹{startingRate}
                                </span>
                                <span className="text-xs font-sans text-neutral-600">/ page</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    showShopDirections(s);
                                  }}
                                  className="px-3 py-1.5 rounded-full bg-white hover:bg-[#FDE09B] border border-black/25 text-[#0F1115] text-xs font-sans font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`Get directions to ${s.shop_name}`}
                                >
                                  <Navigation className="w-3 h-3 text-[#D93200]" aria-hidden="true" />
                                  <span>Directions</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPrintFlow(s);
                                  }}
                                  className="px-4 py-1.5 rounded-full bg-[#D93200] hover:bg-black text-white text-xs font-sans font-semibold transition-colors cursor-pointer"
                                >
                                  Print Here
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* RIGHT BENTO PANEL: DARK OPENFREEMAP EXPLORER */}
          <section
            ref={mapSectionRef}
            className={`${
              isMapExpanded ? 'lg:col-span-12' : 'lg:col-span-6 xl:col-span-7'
            } h-[460px] lg:h-full rounded-[24px] overflow-hidden border border-white/15 bg-black relative shadow-xl`}
          >
            <OpenFreeMapExplorer
              shops={filteredShops.length > 0 ? filteredShops : shops}
              selectedShop={selectedShop}
              focusTrigger={mapFocusTrigger}
              onSelectShop={(shop) => focusShopOnMap(shop)}
              directionsShop={directionsShop}
              directionsTrigger={directionsTrigger}
              onRequestDirections={(shop) => showShopDirections(shop)}
              onClearDirections={() => setDirectionsShop(null)}
              userCoords={userCoords}
              onUserLocation={(coords) => {
                setUserCoords(coords);
                if (!directionsShop) {
                  const sorted = [...shops].sort((a, b) => {
                    const da =
                      a.latitude && a.longitude
                        ? computeHaversineKm(coords.latitude, coords.longitude, Number(a.latitude), Number(a.longitude))
                        : 9999;
                    const db =
                      b.latitude && b.longitude
                        ? computeHaversineKm(coords.latitude, coords.longitude, Number(b.latitude), Number(b.longitude))
                        : 9999;
                    return da - db;
                  });
                  if (sorted[0]) setSelectedShop(sorted[0]);
                }
              }}
              isExpanded={isMapExpanded}
              onToggleExpand={() => setIsMapExpanded((v) => !v)}
            />
          </section>

        </main>
      ) : (
        /* MY ORDERS VIEW: 3-COLOR BENTO WORKSPACE */
        <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* LEFT/CENTER: OFF-WHITE HEADER PILL + BUTTER-YELLOW ORDERS LIST */}
          <section className="lg:col-span-8 flex flex-col gap-3 min-h-0">
            <div className="rounded-[24px] bg-[#FAF9F6] text-[#0F1115] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
              <div>
                <h1 className="font-serif font-black text-2xl text-[#0F1115] text-balance leading-tight">
                  Your Print Orders
                </h1>
                <p className="text-xs font-sans text-neutral-600 mt-0.5">
                  Track live queue updates and pickup status across campus shops.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('discover')}
                  className="px-4 py-2 rounded-full bg-[#D93200] hover:bg-black text-white text-xs font-sans font-semibold transition-colors cursor-pointer"
                >
                  Find a Print Shop
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="h-9 px-3.5 rounded-full bg-black hover:bg-[#D93200] text-white text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 max-h-[65vh] lg:max-h-none rounded-[24px] bg-[#FDE09B] text-[#0F1115] p-4 sm:p-5 overflow-y-auto bento-scroll shadow-xl space-y-3">
              {collectionAlerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-emerald-950">
                      Pickup Alerts ({collectionAlerts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        stopReadyPickupChime();
                        setCollectionAlerts([]);
                        persistCollectionAlerts(sessionUser?.id, []);
                      }}
                      className="text-[11px] font-sans font-semibold text-neutral-800 hover:text-[#D93200] cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  {collectionAlerts.map((alertItem) => (
                    <div
                      key={alertItem.id}
                      className="p-3.5 rounded-[18px] bg-emerald-950 text-white border border-emerald-400/50 flex items-start justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <BellRing className="w-4 h-4 text-[#FDE09B] shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="text-xs font-sans font-bold text-[#FDE09B]">
                            {alertItem.title.replace(/\s*\(ID:\s*\d+\)/i, '')}
                          </div>
                          <div className="text-xs font-sans text-emerald-50 mt-0.5">
                            {alertItem.message}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCollectionAlerts((prev) => {
                            const next = prev.filter((item) => item.id !== alertItem.id);
                            persistCollectionAlerts(sessionUser?.id, next);
                            return next;
                          })
                        }
                        className="text-emerald-200 hover:text-white cursor-pointer shrink-0"
                        aria-label="Dismiss pickup alert"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {portalLoading && orders.length === 0 ? (
                <div className="py-14 text-center rounded-[18px] bg-black/5 space-y-2.5">
                  <Loader2 className="w-6 h-6 text-[#D93200] animate-spin mx-auto" aria-hidden="true" />
                  <div className="text-xs font-sans text-neutral-800">Loading your orders...</div>
                </div>
              ) : orders.length === 0 && collectionAlerts.length === 0 ? (
                <div className="py-14 px-6 text-center rounded-[20px] bg-[#FAF9F6] border border-black/15 space-y-3">
                  <FileText className="w-9 h-9 text-neutral-600 mx-auto" aria-hidden="true" />
                  <div className="text-base font-sans font-bold text-[#0F1115]">No active orders yet</div>
                  <p className="text-xs font-sans text-neutral-600 max-w-sm mx-auto">
                    Pick a nearby print shop on the map and click Print Here to send your first PDF.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {orders.map((order) => {
                    const doc = order.order_documents?.[0];
                    const targetShop =
                      (order.shop?.latitude && order.shop?.longitude ? (order.shop as Shop) : null) ||
                      shops.find((sp) => sp.shop_name === order.shop?.shop_name) ||
                      null;
                    const isCompleted = order.status === 'completed' || order.status === 'cancelled' || order.status === 'rejected';
                    const readyRemainingMs = getReadyOrderRemainingMs(order, nowMs);
                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-[20px] bg-[#FAF9F6] border border-black/15 space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-black text-[#FDE09B] font-mono font-bold tabular-nums text-[11px] inline-flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-[#FF5A1F]" aria-hidden="true" />
                            <span>{userIdNo ? `ID: ${userIdNo}` : 'Print Job'}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            {readyRemainingMs !== null && (
                              <span className="px-2 py-0.5 rounded-full bg-black/5 border border-black/10 text-[10px] font-mono font-semibold text-neutral-700 tabular-nums">
                                Clears in {formatRemainingPickupTime(readyRemainingMs)}
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans font-semibold capitalize ${
                                order.status === 'ready_for_collection'
                                  ? 'bg-emerald-600 text-white'
                                  : order.status === 'printing'
                                  ? 'bg-[#D93200] text-white'
                                  : 'bg-[#FDE09B] border border-black/15 text-[#0F1115]'
                              }`}
                            >
                              {order.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm font-sans font-bold text-[#0F1115] truncate">
                          {doc?.document?.file_name || 'Print Document'}
                        </div>

                        {userIdNo && (
                          <div
                            className={`rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 text-xs font-sans border ${
                              order.status === 'ready_for_collection'
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                                : isCompleted
                                ? 'bg-black/5 border-black/10 text-neutral-700'
                                : 'bg-[#FDE09B]/55 border-black/15 text-[#0F1115]'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                              <KeyRound className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                              <span>ID No</span>
                            </span>
                            <span className="font-mono font-black tracking-widest tabular-nums text-sm">
                              {userIdNo}
                            </span>
                          </div>
                        )}

                        <div className="text-xs font-sans text-neutral-700 flex justify-between items-center gap-2 pt-2 border-t border-black/10">
                          <span className="truncate font-medium">{order.shop?.shop_name || 'Campus Shop'}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {targetShop && targetShop.latitude && targetShop.longitude && (
                              <button
                                type="button"
                                onClick={() => showShopDirections(targetShop)}
                                className="px-2.5 py-1 rounded-full bg-white hover:bg-[#FDE09B] border border-black/20 text-[#0F1115] text-[11px] font-sans font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Navigation className="w-3 h-3 text-[#D93200]" aria-hidden="true" />
                                <span>Directions</span>
                              </button>
                            )}
                            <span className="text-[#0F1115] font-bold tabular-nums">₹{order.total_amount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: HOT VERMILION SUMMARY CARD + OFF-WHITE QUICK STATIONS */}
          <aside className="lg:col-span-4 flex flex-col gap-3 min-h-0">
            <div className="rounded-[24px] bg-[#FF3B00] text-[#0F1115] p-5 flex flex-col justify-between min-h-[195px] shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#0F1115]/80">
                    Your Order Summary
                  </div>
                  <h2 className="font-serif text-2xl font-bold tracking-tight text-[#0F1115] mt-1">
                    {totalPrintJobsCount} {totalPrintJobsCount === 1 ? 'Print Job' : 'Print Jobs'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => loadPortalData(sessionUser.id)}
                  className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition-colors"
                  title="Refresh Orders"
                  aria-label="Refresh Orders"
                >
                  <RefreshCw className={`w-4 h-4 ${portalLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-black/20 text-xs font-sans">
                {userIdNo && (
                  <div className="rounded-2xl bg-black text-white px-3.5 py-2.5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-300">
                      Your ID No
                    </div>
                    <div className="font-mono font-black text-xl tracking-[0.25em] text-[#FDE09B] tabular-nums">
                      {userIdNo}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center font-medium">
                  <span>Ready for Pickup</span>
                  <span className="font-bold tabular-nums">{readyOrdersCount}</span>
                </div>
                <div className="flex justify-between items-center font-medium">
                  <span>Total Spend</span>
                  <span className="font-bold tabular-nums">₹{totalSpent.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </aside>
        </main>
      )}

      {/* LEFT-SIDE PROFILE & NOTIFICATIONS DRAWER */}
      {showProfileMenu && (
        <div
          onClick={() => setShowProfileMenu(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex justify-start p-2.5 sm:p-3.5 animate-backdrop-in"
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Account and notifications menu"
            onClick={(e) => e.stopPropagation()}
            className="w-full lg:w-[calc(50%-0.4375rem)] xl:w-[calc(41.666667%-0.51rem)] h-full rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-5 sm:p-6 border border-black/20 shadow-2xl flex flex-col justify-between gap-5 animate-drawer-left"
          >
            <div className="space-y-4 overflow-y-auto bento-scroll pr-0.5">
              {/* Top Brand & Close */}
              <div className="flex items-center justify-between border-b border-black/10 pb-3.5">
                <div className="flex items-baseline gap-1 leading-none">
                  <span className="font-serif font-black text-2xl tracking-tight text-[#0F1115] lowercase">
                    prinrox
                  </span>
                  <span className="text-[#FF3B00] font-serif font-bold text-base leading-none" aria-hidden="true">®</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(false)}
                  className="w-8 h-8 rounded-full bg-black hover:bg-[#D93200] text-white flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Close account drawer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* User Account Card */}
              <div className="rounded-[20px] bg-white border border-black/15 p-4 flex items-center gap-3 shadow-xs">
                <div className="w-11 h-11 rounded-full bg-black text-[#FDE09B] font-serif font-black text-lg flex items-center justify-center shrink-0">
                  {(sessionUser.displayName || sessionUser.email || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-sans font-bold text-[#0F1115] truncate">
                    {sessionUser.displayName || 'Customer Account'}
                  </div>
                  <div className="text-xs font-sans text-neutral-600 truncate">
                    {sessionUser.email || 'Signed in'}
                  </div>
                </div>
              </div>

              {/* Unique 4-Digit Counter ID No Card */}
              {userIdNo && (
                <div className="rounded-[20px] bg-black text-white p-4 border border-black/15 space-y-2.5 shadow-sm text-center">
                  <div className="text-xs font-sans font-bold text-[#FDE09B]">
                    Your ID No
                  </div>

                  <div className="flex items-center justify-center gap-2.5 py-1">
                    {userIdNo.split('').map((digit, idx) => (
                      <span
                        key={idx}
                        className="w-11 h-12 rounded-xl bg-white/10 border border-white/20 font-mono font-black text-2xl text-[#FDE09B] flex items-center justify-center tabular-nums"
                      >
                        {digit}
                      </span>
                    ))}
                  </div>

                  <p className="text-[11px] font-sans text-neutral-300 leading-snug">
                    Show this unique 4-digit ID No at the print shop counter to collect your prints.
                  </p>
                </div>
              )}

              {/* Quick Navigation Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setActiveView('orders');
                  }}
                  className="w-full p-3.5 rounded-[18px] bg-white border border-black/15 hover:border-black hover:bg-[#FDE09B]/35 text-xs font-sans font-bold text-[#0F1115] flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#D93200]" aria-hidden="true" />
                    <span>Your Print Orders</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-black text-[#FDE09B] text-[11px] font-bold tabular-nums">
                    {totalPrintJobsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    loadPortalData(sessionUser.id);
                  }}
                  className="w-full p-3.5 rounded-[18px] bg-white border border-black/15 hover:border-black text-xs font-sans font-semibold text-[#0F1115] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 text-neutral-700 ${portalLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>Refresh Shops &amp; Orders</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false);
                handleSignOut();
              }}
              className="w-full h-11 rounded-full bg-black hover:bg-[#D93200] text-white text-xs font-sans font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </aside>
        </div>
      )}

      {/* PRINT JOB RIGHT-SIDE DRAWER: STEP 1 (CATEGORY) -> STEP 2 (FILES, SPECS & DESCRIPTION) */}
      {showOrderModal && selectedShop && (
        <div
          onClick={() => setShowOrderModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex justify-end p-2.5 sm:p-3.5 animate-backdrop-in"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="print-job-drawer-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[540px] h-full rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-5 sm:p-6 border border-black/20 shadow-2xl flex flex-col justify-between gap-4 animate-drawer-right"
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3.5 shrink-0">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {jobStep === 'configure' && (
                    <button
                      type="button"
                      onClick={() => {
                        setJobStep('choose');
                        setJobError(null);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/5 hover:bg-black hover:text-white text-[11px] font-sans font-semibold text-[#0F1115] transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                      <span>Options</span>
                    </button>
                  )}
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#D93200]">
                    {jobStep === 'choose'
                      ? 'Step 1 · Choose Print Type'
                      : printCategory === 'documents'
                      ? 'Step 2 · Documents'
                      : printCategory === 'passport'
                      ? 'Step 2 · Passport Photos'
                      : 'Step 2 · Glossy Photos'}
                  </span>
                </div>
                <h2
                  id="print-job-drawer-title"
                  className="font-serif text-xl font-bold text-[#0F1115] truncate text-balance"
                >
                  {selectedShop.shop_name}
                </h2>
                <div className="text-xs font-sans text-neutral-600 truncate">
                  {selectedShop.address || 'Campus Hub'}
                  {selectedShop.city ? `, ${selectedShop.city}` : ''}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="w-8 h-8 rounded-full bg-black hover:bg-[#D93200] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close print job drawer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {jobStep === 'choose' ? (
              /* STEP 1: CHOOSE PRINT CATEGORY (DOCUMENTS / PASSPORT PHOTOS / PHOTOS) */
              <div className="flex-1 min-h-0 overflow-y-auto bento-scroll pr-1 space-y-3 animate-panel-in">
                {/* 1. Documents Option Card */}
                <div
                  onClick={() => selectPrintCategory('documents')}
                  className="rounded-[20px] bg-white border border-black/15 hover:border-[#FF3B00] p-4 sm:p-5 flex items-center justify-between gap-4 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="space-y-3 min-w-0 flex-1">
                    <div>
                      <h3 className="font-serif font-bold text-2xl text-[#0F1115] leading-tight">
                        Documents
                      </h3>
                      <ul className="mt-2 space-y-1.5 text-xs font-sans text-neutral-700">
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                          <span>Price starting at ₹{getShopStartingRate(selectedShop)}/page</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                          <span>Paper quality: 70 GSM, 80 GSM &amp; Bond</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                          <span>Single side &amp; double side prints</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectPrintCategory('documents');
                      }}
                      className="px-5 py-2 rounded-full bg-[#D93200] group-hover:bg-black text-white text-xs font-sans font-semibold transition-colors cursor-pointer"
                    >
                      Upload Files
                    </button>
                  </div>

                  {/* Mini Document Stack Artwork */}
                  <div className="hidden sm:flex items-center justify-center w-28 h-24 shrink-0 relative select-none pointer-events-none">
                    <div className="w-16 h-20 rounded-xl bg-[#FDE09B] border border-black/15 shadow -rotate-6 absolute left-2" />
                    <div className="w-16 h-20 rounded-xl bg-[#0F1115] border border-black/20 shadow rotate-6 absolute right-2" />
                    <div className="w-16 h-20 rounded-xl bg-white border border-black/20 shadow-md relative z-10 p-2 flex flex-col gap-1.5">
                      <div className="h-3 rounded bg-[#D93200]" />
                      <div className="h-1.5 w-3/4 rounded bg-neutral-300" />
                      <div className="h-1.5 w-full rounded bg-neutral-200" />
                      <div className="h-1.5 w-2/3 rounded bg-neutral-200" />
                      <div className="mt-auto h-2 w-1/2 rounded bg-[#FDE09B]" />
                    </div>
                  </div>
                </div>

                {/* 2. Passport Photos Option Card */}
                <div
                  onClick={() => selectPrintCategory('passport')}
                  className="rounded-[20px] bg-[#FDE09B]/55 border border-black/15 hover:border-[#FF3B00] p-4 sm:p-5 flex items-center justify-between gap-4 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="space-y-3 min-w-0 flex-1">
                    <div>
                      <h3 className="font-serif font-bold text-2xl text-[#0F1115] leading-tight">
                        Passport photos
                      </h3>
                      <ul className="mt-2 space-y-1.5 text-xs font-sans text-neutral-800">
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                          <span>Printed on Kodak glossy paper</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                          <span>Photo sets available: 8, 16, 32</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                          <span>Paper quality: 210 GSM</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectPrintCategory('passport');
                      }}
                      className="px-5 py-2 rounded-full bg-[#D93200] group-hover:bg-black text-white text-xs font-sans font-semibold transition-colors cursor-pointer"
                    >
                      Upload Photos
                    </button>
                  </div>

                  {/* Mini Passport Photo Fan Artwork */}
                  <div className="hidden sm:flex items-center justify-center w-28 h-24 shrink-0 relative select-none pointer-events-none">
                    <div className="w-12 h-16 rounded-lg bg-white border border-black/20 shadow -rotate-12 absolute left-2 grid grid-cols-2 gap-0.5 p-1">
                      <div className="rounded-xs bg-[#0F1115]/15" />
                      <div className="rounded-xs bg-[#0F1115]/15" />
                      <div className="rounded-xs bg-[#0F1115]/15" />
                      <div className="rounded-xs bg-[#0F1115]/15" />
                    </div>
                    <div className="w-12 h-16 rounded-lg bg-white border border-black/20 shadow rotate-12 absolute right-2 grid grid-cols-2 gap-0.5 p-1">
                      <div className="rounded-xs bg-[#0F1115]/15" />
                      <div className="rounded-xs bg-[#0F1115]/15" />
                      <div className="rounded-xs bg-[#0F1115]/15" />
                      <div className="rounded-xs bg-[#0F1115]/15" />
                    </div>
                    <div className="w-14 h-20 rounded-xl bg-white border-2 border-[#0F1115] shadow-md relative z-10 flex flex-col items-center justify-end overflow-hidden p-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#0F1115] mb-1" />
                      <div className="w-9 h-5 rounded-t-full bg-[#FF3B00]" />
                    </div>
                  </div>
                </div>

                {/* 3. Photos Option Card */}
                <div
                  onClick={() => selectPrintCategory('photos')}
                  className="rounded-[20px] bg-white border border-black/15 hover:border-[#FF3B00] p-4 sm:p-5 flex items-center justify-between gap-4 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="space-y-3 min-w-0 flex-1">
                    <div>
                      <h3 className="font-serif font-bold text-2xl text-[#0F1115] leading-tight">
                        Photos
                      </h3>
                      <ul className="mt-2 space-y-1.5 text-xs font-sans text-neutral-700">
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                          <span>Printed on Kodak glossy paper</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                          <span>Cropping &amp; editing available</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                          <span>Paper quality: 210 GSM</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectPrintCategory('photos');
                      }}
                      className="px-5 py-2 rounded-full bg-[#D93200] group-hover:bg-black text-white text-xs font-sans font-semibold transition-colors cursor-pointer"
                    >
                      Upload Photos
                    </button>
                  </div>

                  {/* Mini Photo Print Grid Artwork */}
                  <div className="hidden sm:grid grid-cols-2 gap-1.5 w-28 h-24 shrink-0 p-1 select-none pointer-events-none">
                    <div className="col-span-2 rounded-lg bg-[#0F1115] border border-black/15 p-1.5 flex items-center justify-center relative overflow-hidden">
                      <ImageIcon className="w-5 h-5 text-[#FDE09B]" aria-hidden="true" />
                    </div>
                    <div className="rounded-lg bg-[#FDE09B] border border-black/15 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#D93200]" />
                    </div>
                    <div className="rounded-lg bg-[#FF3B00] border border-black/15 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: UPLOAD FILES / PHOTOS + CATEGORY SPECS + DESCRIPTIONS */
              <form
                onSubmit={handlePrintJobSubmit}
                className="flex-1 min-h-0 flex flex-col justify-between gap-4 animate-panel-in"
              >
                <div className="flex-1 min-h-0 overflow-y-auto bento-scroll pr-1 space-y-4">
                  {jobError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-sans flex items-start gap-2 animate-panel-in">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                      <span>{jobError}</span>
                    </div>
                  )}

                  {printCategory === 'documents' ? (
                    /* DOCUMENTS ONLY SECTION: MATCHES UPLOADED REFERENCE + FRONT&BACK / SINGLE / SPIRAL / SOFT BINDING */
                    <div className="space-y-3.5">
                      {/* Top File Tabs & + Add files Button */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                          {files.length > 1 ? (
                            files.map((item, idx) => (
                              <button
                                key={`${item.name}-${idx}`}
                                type="button"
                                onClick={() => setActiveDocIdx(idx)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold transition-colors cursor-pointer shrink-0 ${
                                  activeDocIdx === idx
                                    ? 'bg-black text-[#FDE09B]'
                                    : 'bg-white border border-black/15 text-[#0F1115] hover:border-black'
                                }`}
                              >
                                File {idx + 1}
                              </button>
                            ))
                          ) : (
                            <span className="text-xs font-sans font-semibold text-neutral-700">
                              {files[0] ? files[0].name : 'No file selected'}
                            </span>
                          )}
                        </div>

                        <label className="px-3.5 py-1.5 rounded-full bg-white border border-black/25 hover:border-[#D93200] text-xs font-sans font-semibold text-[#0F1115] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs">
                          <FilePlus2 className="w-3.5 h-3.5 text-[#D93200]" aria-hidden="true" />
                          <span>Add files</span>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp"
                            onChange={(e) => {
                              handleDocumentsPicked(Array.from(e.target.files || []), true);
                              e.currentTarget.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Centered Document Sheet Preview */}
                      {files.length === 0 ? (
                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-black/25 hover:border-[#D93200] rounded-[18px] bg-[#FDE09B]/35 hover:bg-[#FDE09B]/55 cursor-pointer transition-colors">
                          <Upload className="w-7 h-7 text-[#D93200] mb-2" aria-hidden="true" />
                          <span className="text-xs font-sans font-bold text-[#0F1115] text-center">
                            Click to pick PDF, DOCX, or Image
                          </span>
                          <span className="text-[11px] font-sans text-neutral-700 mt-1">
                            Add one or more files to preview and print
                          </span>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp"
                            onChange={(e) => {
                              handleDocumentsPicked(Array.from(e.target.files || []), false);
                              e.currentTarget.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        (() => {
                          const currentFile = files[activeDocIdx] || files[0];
                          const currentUrl = previewUrls[activeDocIdx] || previewUrls[0];
                          const isPdf =
                            currentFile &&
                            (currentFile.type === 'application/pdf' ||
                              currentFile.name.toLowerCase().endsWith('.pdf'));
                          const isImage = currentFile && currentFile.type.startsWith('image/');

                          return (
                            <div className="w-full max-w-[260px] mx-auto aspect-[3/4] max-h-[250px] rounded-[16px] bg-white border border-black/20 shadow-md relative overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(activeDocIdx)}
                                className="w-7 h-7 rounded-full bg-black/85 hover:bg-[#D93200] text-white flex items-center justify-center absolute top-2 right-2 z-10 transition-colors cursor-pointer shadow"
                                aria-label={`Remove ${currentFile?.name || 'file'}`}
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>

                              {isImage && currentUrl ? (
                                <img
                                  src={currentUrl}
                                  alt={currentFile.name}
                                  className="w-full h-full object-contain bg-white"
                                />
                              ) : isPdf && currentUrl ? (
                                <iframe
                                  title={currentFile.name}
                                  src={`${currentUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                  className="w-full h-full border-0 bg-white"
                                />
                              ) : (
                                <div className="w-full h-full p-5 flex flex-col items-center justify-center text-center gap-2 bg-white">
                                  <div className="w-12 h-12 rounded-2xl bg-[#FDE09B] flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-[#0F1115]" aria-hidden="true" />
                                  </div>
                                  <div className="text-xs font-sans font-bold text-[#0F1115] break-all line-clamp-2">
                                    {currentFile?.name}
                                  </div>
                                  <div className="text-[11px] font-mono tabular-nums text-neutral-600">
                                    {((currentFile?.size || 0) / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}

                      {/* Number of Copies Card */}
                      <div className="rounded-[18px] bg-white border border-black/15 p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-sans font-bold text-[#0F1115]">
                            Number of copies
                          </div>
                          <div className="text-xs font-sans text-neutral-600 flex items-center gap-1.5 mt-0.5 tabular-nums">
                            <span>
                              {files.length > 0 ? `File ${activeDocIdx + 1}` : 'Pages'}
                            </span>
                            <span>·</span>
                            <label className="inline-flex items-center gap-1">
                              <span>(</span>
                              <input
                                type="number"
                                min={1}
                                value={pageCount}
                                onChange={(e) => setPageCount(Math.max(1, Number(e.target.value)))}
                                className="w-10 text-center font-bold text-[#0F1115] bg-[#FDE09B]/55 rounded-md px-1 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#D93200]"
                                aria-label="Total document pages"
                              />
                              <span>{pageCount === 1 ? 'page' : 'pages'})</span>
                            </label>
                          </div>
                        </div>

                        <div className="h-9 px-1.5 rounded-full bg-[#D93200] text-white flex items-center gap-2 shrink-0 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setCopies((c) => Math.max(1, c - 1))}
                            className="w-6 h-6 rounded-full hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Decrease copies"
                          >
                            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <span className="text-xs font-sans font-bold tabular-nums min-w-[16px] text-center">
                            {copies}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCopies((c) => c + 1)}
                            className="w-6 h-6 rounded-full hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Increase copies"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Document Options Container: Color, Orientation, Front&Back/Single, Spiral/Soft Binding */}
                      <div className="rounded-[20px] bg-white border border-black/15 p-4 space-y-4">
                        {/* Choose Print Color */}
                        <div className="space-y-2">
                          <div className="text-xs font-sans font-bold text-[#0F1115]">
                            Choose print color
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setColorMode('Color')}
                              className={`p-3 rounded-[14px] border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                                colorMode === 'Color'
                                  ? 'border-2 border-[#D93200] bg-[#FDE09B]/45'
                                  : 'border-black/15 bg-[#FAF9F6] hover:border-black/40'
                              }`}
                            >
                              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="8.5" r="4.5" fill="#FACC15" fillOpacity="0.85" />
                                <circle cx="9.2" cy="14" r="4.5" fill="#EC4899" fillOpacity="0.85" />
                                <circle cx="14.8" cy="14" r="4.5" fill="#06B6D4" fillOpacity="0.85" />
                              </svg>
                              <div className="min-w-0">
                                <div className="text-xs font-sans font-bold text-[#0F1115]">
                                  Coloured
                                </div>
                                <div className="text-[11px] font-sans text-neutral-600 tabular-nums">
                                  ₹{getDocPerPageRate('Color', sides)}/page
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setColorMode('B&W')}
                              className={`p-3 rounded-[14px] border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                                colorMode === 'B&W'
                                  ? 'border-2 border-[#D93200] bg-[#FDE09B]/45'
                                  : 'border-black/15 bg-[#FAF9F6] hover:border-black/40'
                              }`}
                            >
                              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="8.5" r="4.5" fill="#9CA3AF" fillOpacity="0.85" />
                                <circle cx="9.2" cy="14" r="4.5" fill="#374151" fillOpacity="0.85" />
                                <circle cx="14.8" cy="14" r="4.5" fill="#111827" fillOpacity="0.85" />
                              </svg>
                              <div className="min-w-0">
                                <div className="text-xs font-sans font-bold text-[#0F1115]">
                                  B &amp; W
                                </div>
                                <div className="text-[11px] font-sans text-neutral-600 tabular-nums">
                                  ₹{getDocPerPageRate('B&W', sides)}/page
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Choose Print Orientation */}
                        <div className="space-y-2">
                          <div className="text-xs font-sans font-bold text-[#0F1115]">
                            Choose print orientation
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setOrientation('Portrait')}
                              className={`p-3 rounded-[14px] border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                                orientation === 'Portrait'
                                  ? 'border-2 border-[#D93200] bg-[#FDE09B]/45'
                                  : 'border-black/15 bg-[#FAF9F6] hover:border-black/40'
                              }`}
                            >
                              <div className="w-5 h-7 rounded bg-black text-[#FDE09B] flex items-center justify-center shrink-0">
                                <FileText className="w-3 h-3" aria-hidden="true" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-sans font-bold text-[#0F1115]">
                                  Portrait
                                </div>
                                <div className="text-[11px] font-sans text-neutral-600 tabular-nums">
                                  8.3 x 11.7 in
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setOrientation('Landscape')}
                              className={`p-3 rounded-[14px] border flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                                orientation === 'Landscape'
                                  ? 'border-2 border-[#D93200] bg-[#FDE09B]/45'
                                  : 'border-black/15 bg-[#FAF9F6] hover:border-black/40'
                              }`}
                            >
                              <div className="w-7 h-5 rounded bg-black text-[#FDE09B] flex items-center justify-center shrink-0">
                                <FileText className="w-3 h-3 rotate-90" aria-hidden="true" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-sans font-bold text-[#0F1115]">
                                  Landscape
                                </div>
                                <div className="text-[11px] font-sans text-neutral-600 tabular-nums">
                                  11.7 x 8.3 in
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Choose Print Sides (Single Side / Front & Back) */}
                        <div className="space-y-2">
                          <div className="text-xs font-sans font-bold text-[#0F1115]">
                            Print sides
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setSides('Single')}
                              className={`py-2.5 px-3 rounded-[14px] border text-left transition-all cursor-pointer ${
                                sides === 'Single'
                                  ? 'border-2 border-[#D93200] bg-[#FDE09B]/45'
                                  : 'border-black/15 bg-[#FAF9F6] hover:border-black/40'
                              }`}
                            >
                              <div className="text-xs font-sans font-bold text-[#0F1115]">
                                Single side
                              </div>
                              <div className="text-[11px] font-sans text-neutral-600">
                                One-sided sheet
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSides('Double')}
                              className={`py-2.5 px-3 rounded-[14px] border text-left transition-all cursor-pointer ${
                                sides === 'Double'
                                  ? 'border-2 border-[#D93200] bg-[#FDE09B]/45'
                                  : 'border-black/15 bg-[#FAF9F6] hover:border-black/40'
                              }`}
                            >
                              <div className="text-xs font-sans font-bold text-[#0F1115]">
                                Front &amp; back
                              </div>
                              <div className="text-[11px] font-sans text-neutral-600">
                                Both sides printed
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Binding Type (None / Spiral Binding / Soft Binding) */}
                        <div className="space-y-2">
                          <div className="text-xs font-sans font-bold text-[#0F1115]">
                            Binding option
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'None', label: 'No binding', fee: 'Loose' },
                              { value: 'Spiral Binding', label: 'Spiral binding', fee: '+₹25' },
                              { value: 'Soft Binding', label: 'Soft binding', fee: '+₹35' },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => setBindingType(opt.value)}
                                className={`py-2.5 px-2.5 rounded-[14px] border text-left transition-all cursor-pointer ${
                                  bindingType === opt.value
                                    ? 'border-2 border-[#D93200] bg-[#FDE09B]/45'
                                    : 'border-black/15 bg-[#FAF9F6] hover:border-black/40'
                                }`}
                              >
                                <div className="text-xs font-sans font-bold text-[#0F1115] truncate">
                                  {opt.label}
                                </div>
                                <div className="text-[11px] font-sans text-neutral-600 tabular-nums">
                                  {opt.fee}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : printCategory === 'photos' ? (
                    /* PHOTOS SECTION: MATCHES UPLOADED REFERENCE (GALLERY PREVIEW + EDIT + COPIES + PRINT SIZE GRID) */
                    (() => {
                      const activePhotoUrl = previewUrls[activeDocIdx] || previewUrls[0];
                      const activePhotoFile = files[activeDocIdx] || files[0];
                      const activeSizeMeta =
                        PHOTO_PRINT_SIZES.find((s) => s.value === paperSize) || PHOTO_PRINT_SIZES[1];
                      const activeToneCss =
                        photoTone === 'vivid'
                          ? 'contrast(1.14) saturate(1.25)'
                          : photoTone === 'warm'
                          ? 'sepia(0.28) saturate(1.15)'
                          : photoTone === 'bw'
                          ? 'grayscale(1) contrast(1.08)'
                          : 'none';

                      return (
                        <div className="space-y-3.5">
                          {/* Top Photo Tabs & + Add photos Button */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                              {files.length > 1 ? (
                                files.map((item, idx) => (
                                  <button
                                    key={`${item.name}-${idx}`}
                                    type="button"
                                    onClick={() => {
                                      setActiveDocIdx(idx);
                                      setEditingPhoto(false);
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold transition-colors cursor-pointer shrink-0 ${
                                      activeDocIdx === idx
                                        ? 'bg-black text-[#FDE09B]'
                                        : 'bg-white border border-black/15 text-[#0F1115] hover:border-black'
                                    }`}
                                  >
                                    Photo {idx + 1}
                                  </button>
                                ))
                              ) : (
                                <span className="text-xs font-sans font-semibold text-neutral-700 truncate">
                                  {activePhotoFile ? activePhotoFile.name : 'No photo selected'}
                                </span>
                              )}
                            </div>

                            <label className="px-3.5 py-1.5 rounded-full bg-white border border-black/25 hover:border-[#D93200] text-xs font-sans font-semibold text-[#0F1115] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs">
                              <FilePlus2 className="w-3.5 h-3.5 text-[#D93200]" aria-hidden="true" />
                              <span>Add photos</span>
                              <input
                                type="file"
                                multiple
                                accept="image/*,.jpg,.jpeg,.png,.webp,.heic"
                                onChange={(e) => {
                                  handlePhotosAdded(Array.from(e.target.files || []), true);
                                  e.currentTarget.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Photo Gallery Preview Stage */}
                          {files.length === 0 ? (
                            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-black/25 hover:border-[#D93200] rounded-[20px] bg-[#0F1115] text-white cursor-pointer transition-colors">
                              <ImageIcon className="w-8 h-8 text-[#FDE09B] mb-2" aria-hidden="true" />
                              <span className="text-xs font-sans font-bold text-white text-center">
                                Click to pick photos (JPG, PNG, WEBP)
                              </span>
                              <span className="text-[11px] font-sans text-neutral-400 mt-1">
                                Printed on Kodak 210 GSM glossy paper
                              </span>
                              <input
                                type="file"
                                multiple
                                accept="image/*,.jpg,.jpeg,.png,.webp,.heic"
                                onChange={(e) => {
                                  handlePhotosAdded(Array.from(e.target.files || []), false);
                                  e.currentTarget.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <div className="rounded-[20px] bg-[#0F1115] border border-black/20 p-3.5 flex flex-col items-center justify-between gap-3 relative">
                              {/* Stage Top Bar: Active Dimensions Pill & Close Button */}
                              <div className="w-full flex items-center justify-between gap-2">
                                <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-sans font-medium text-[#FAF9F6] inline-flex items-center gap-1.5 tabular-nums">
                                  <Crop className="w-3 h-3 text-[#FDE09B]" aria-hidden="true" />
                                  <span>{activeSizeMeta.dims}</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextList = files.filter((_, i) => i !== activeDocIdx);
                                    setFiles(nextList);
                                    setActiveDocIdx((prev) =>
                                      Math.max(0, Math.min(prev, nextList.length - 1))
                                    );
                                    setEditingPhoto(false);
                                  }}
                                  className="w-7 h-7 rounded-full bg-white/15 hover:bg-[#D93200] text-white flex items-center justify-center transition-colors cursor-pointer"
                                  aria-label={`Remove ${activePhotoFile?.name || 'photo'}`}
                                >
                                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>

                              {/* Centered Framed Preview */}
                              <div className="w-full flex items-center justify-center py-1">
                                {activeSizeMeta.isPolaroid ? (
                                  <div className="bg-white p-2 pb-6 rounded-sm shadow-2xl w-36 sm:w-40">
                                    <div className="w-full aspect-square bg-neutral-100 overflow-hidden">
                                      <img
                                        src={activePhotoUrl}
                                        alt={activePhotoFile?.name || 'Photo preview'}
                                        style={{
                                          transform: `rotate(${photoRotation}deg)`,
                                          filter: activeToneCss,
                                        }}
                                        className={`w-full h-full transition-all duration-200 ${
                                          photoFitMode === 'cover' ? 'object-cover' : 'object-contain'
                                        }`}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className={`w-full max-w-[270px] ${activeSizeMeta.aspectClass} max-h-[210px] rounded-xl overflow-hidden bg-black/50 border border-white/15 flex items-center justify-center shadow-lg`}
                                  >
                                    <img
                                      src={activePhotoUrl}
                                      alt={activePhotoFile?.name || 'Photo preview'}
                                      style={{
                                        transform: `rotate(${photoRotation}deg)`,
                                        filter: activeToneCss,
                                      }}
                                      className={`w-full h-full transition-all duration-200 ${
                                        photoFitMode === 'cover' ? 'object-cover' : 'object-contain'
                                      }`}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Bottom Edit Photo Pill or Inline Photo Editor */}
                              {!editingPhoto ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingPhoto(true)}
                                  className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-[#D93200] border border-white/25 text-xs font-sans font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3 text-[#FDE09B]" aria-hidden="true" />
                                  <span>Edit photo</span>
                                </button>
                              ) : (
                                <div className="w-full rounded-xl bg-black/70 border border-white/15 p-2.5 space-y-2 animate-panel-in">
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPhotoRotation((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270))
                                        }
                                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-semibold inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <RotateCw className="w-3 h-3" aria-hidden="true" />
                                        <span>Rotate</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPhotoFitMode((m) => (m === 'contain' ? 'cover' : 'contain'))
                                        }
                                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans font-semibold cursor-pointer"
                                      >
                                        {photoFitMode === 'contain' ? 'Fill Crop' : 'Fit Full'}
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      {(['original', 'vivid', 'warm', 'bw'] as const).map((tone) => (
                                        <button
                                          key={tone}
                                          type="button"
                                          onClick={() => setPhotoTone(tone)}
                                          className={`px-2 py-1 rounded-lg text-[10px] font-sans font-bold uppercase cursor-pointer ${
                                            photoTone === tone
                                              ? 'bg-[#FDE09B] text-[#0F1115]'
                                              : 'bg-white/10 text-neutral-300 hover:text-white'
                                          }`}
                                        >
                                          {tone}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPhotoRotation(0);
                                        setPhotoTone('original');
                                        setEditingPhoto(false);
                                      }}
                                      className="px-3 py-1 rounded-full text-[11px] font-sans font-medium text-neutral-300 hover:text-white cursor-pointer"
                                    >
                                      Reset
                                    </button>
                                    <button
                                      type="button"
                                      disabled={applyingPhotoEdit}
                                      onClick={handleApplyPhotoEdit}
                                      className="px-3.5 py-1 rounded-full bg-[#D93200] hover:bg-[#FF3B00] text-white text-[11px] font-sans font-bold cursor-pointer"
                                    >
                                      {applyingPhotoEdit ? 'Saving...' : 'Done'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Number of Copies Card */}
                          <div className="rounded-[18px] bg-white border border-black/15 p-3.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-sans font-bold text-[#0F1115]">
                                Number of copies
                              </div>
                              <div className="text-xs font-sans text-neutral-600 mt-0.5 tabular-nums">
                                Photo {files.length > 0 ? activeDocIdx + 1 : 1}
                                {files.length > 1 ? ` · ${files.length} selected` : ''}
                              </div>
                            </div>

                            <div className="h-9 px-1.5 rounded-full bg-[#D93200] text-white flex items-center gap-2 shrink-0 shadow-sm">
                              <button
                                type="button"
                                onClick={() => setCopies((c) => Math.max(1, c - 1))}
                                className="w-6 h-6 rounded-full hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer"
                                aria-label="Decrease copies"
                              >
                                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                              <span className="text-xs font-sans font-bold tabular-nums min-w-[16px] text-center">
                                {copies}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCopies((c) => c + 1)}
                                className="w-6 h-6 rounded-full hover:bg-black/20 flex items-center justify-center transition-colors cursor-pointer"
                                aria-label="Increase copies"
                              >
                                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          {/* Choose Print Size Card (Large / Album / Square / Polaroid) */}
                          <div className="rounded-[20px] bg-white border border-black/15 p-4 space-y-3">
                            <div className="text-xs font-sans font-bold text-[#0F1115]">
                              Choose print size
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {PHOTO_PRINT_SIZES.map((opt) => {
                                const isActive = paperSize === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setPaperSize(opt.value)}
                                    className={`p-2.5 rounded-[14px] border flex items-center gap-3 text-left transition-all cursor-pointer ${
                                      isActive
                                        ? 'border-2 border-[#D93200] bg-[#FDE09B]/45'
                                        : 'border-black/15 bg-[#FAF9F6] hover:border-black/40'
                                    }`}
                                  >
                                    {/* Mini Size-Proportional Thumbnail */}
                                    <div className="w-11 h-11 rounded-lg bg-[#0F1115]/10 flex items-center justify-center shrink-0 overflow-hidden p-1">
                                      {activePhotoUrl ? (
                                        opt.isPolaroid ? (
                                          <div className="w-7 h-9 bg-white p-0.5 pb-2 shadow-xs rounded-[2px] flex flex-col">
                                            <img
                                              src={activePhotoUrl}
                                              alt=""
                                              className="w-full flex-1 object-cover"
                                            />
                                          </div>
                                        ) : (
                                          <img
                                            src={activePhotoUrl}
                                            alt=""
                                            className={`rounded-[3px] object-cover shadow-xs ${
                                              opt.label === 'Large'
                                                ? 'w-7 h-9'
                                                : opt.label === 'Album'
                                                ? 'w-9 h-6'
                                                : 'w-8 h-8'
                                            }`}
                                          />
                                        )
                                      ) : (
                                        <ImageIcon className="w-4 h-4 text-[#D93200]" aria-hidden="true" />
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-sans font-bold text-[#0F1115]">
                                        {opt.label}
                                      </div>
                                      <div className="text-[11px] font-sans text-neutral-600 tabular-nums">
                                        {opt.dims}
                                      </div>
                                      <div className="text-xs font-sans font-bold text-[#0F1115] tabular-nums mt-0.5">
                                        ₹{opt.price}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    /* PASSPORT PHOTOS SECTION: MATCHES UPLOADED REFERENCE (PREVIEW + CUSTOMISE IMAGE + STANDARD SIZE + CHOOSE QUANTITY 8/16/32) */
                    (() => {
                      const activePhotoUrl = previewUrls[activeDocIdx] || previewUrls[0];
                      const activePhotoFile = files[activeDocIdx] || files[0];
                      const activeSizeMeta =
                        PASSPORT_SIZES.find((s) => s.value === paperSize) || PASSPORT_SIZES[0];
                      const activeToneCss =
                        photoTone === 'vivid'
                          ? 'contrast(1.12) saturate(1.2)'
                          : photoTone === 'bw'
                          ? 'grayscale(1) contrast(1.08)'
                          : 'none';
                      const bgBackdropClass =
                        passportBg === 'Pure White'
                          ? 'bg-white'
                          : passportBg === 'Light Blue'
                          ? 'bg-sky-200'
                          : 'bg-white';

                      return (
                        <div className="space-y-3.5">
                          {/* Top Photo Tabs & + Add photos Button */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                              {files.length > 1 ? (
                                files.map((item, idx) => (
                                  <button
                                    key={`${item.name}-${idx}`}
                                    type="button"
                                    onClick={() => {
                                      setActiveDocIdx(idx);
                                      setEditingPhoto(false);
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold transition-colors cursor-pointer shrink-0 ${
                                      activeDocIdx === idx
                                        ? 'bg-black text-[#FDE09B]'
                                        : 'bg-white border border-black/15 text-[#0F1115] hover:border-black'
                                    }`}
                                  >
                                    Photo {idx + 1}
                                  </button>
                                ))
                              ) : (
                                <span className="text-xs font-sans font-semibold text-neutral-700 truncate">
                                  {activePhotoFile ? activePhotoFile.name : 'No photo selected'}
                                </span>
                              )}
                            </div>

                            <label className="px-3.5 py-1.5 rounded-full bg-white border border-black/25 hover:border-[#D93200] text-xs font-sans font-semibold text-[#0F1115] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs">
                              <FilePlus2 className="w-3.5 h-3.5 text-[#D93200]" aria-hidden="true" />
                              <span>Add photos</span>
                              <input
                                type="file"
                                multiple
                                accept="image/*,.jpg,.jpeg,.png,.webp,.heic"
                                onChange={(e) => {
                                  handlePhotosAdded(Array.from(e.target.files || []), true);
                                  e.currentTarget.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {/* Centered Passport Portrait Preview */}
                          {files.length === 0 ? (
                            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-black/25 hover:border-[#D93200] rounded-[18px] bg-[#FDE09B]/35 hover:bg-[#FDE09B]/55 cursor-pointer transition-colors">
                              <Upload className="w-7 h-7 text-[#D93200] mb-2" aria-hidden="true" />
                              <span className="text-xs font-sans font-bold text-[#0F1115] text-center">
                                Click to pick passport portrait photo(s)
                              </span>
                              <span className="text-[11px] font-sans text-neutral-700 mt-1">
                                Printed on Kodak 210 GSM glossy paper
                              </span>
                              <input
                                type="file"
                                multiple
                                accept="image/*,.jpg,.jpeg,.png,.webp,.heic"
                                onChange={(e) => {
                                  handlePhotosAdded(Array.from(e.target.files || []), false);
                                  e.currentTarget.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <div
                              className={`w-full max-w-[225px] mx-auto ${activeSizeMeta.aspectClass} max-h-[250px] rounded-[16px] ${bgBackdropClass} border border-black/20 shadow-md relative overflow-hidden`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  const nextList = files.filter((_, i) => i !== activeDocIdx);
                                  setFiles(nextList);
                                  setActiveDocIdx((prev) =>
                                    Math.max(0, Math.min(prev, nextList.length - 1))
                                  );
                                  setEditingPhoto(false);
                                }}
                                className="w-7 h-7 rounded-full bg-black/85 hover:bg-[#D93200] text-white flex items-center justify-center absolute top-2 right-2 z-10 transition-colors cursor-pointer shadow"
                                aria-label={`Remove ${activePhotoFile?.name || 'photo'}`}
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>

                              <img
                                src={activePhotoUrl}
                                alt={activePhotoFile?.name || 'Passport preview'}
                                style={{
                                  transform: `rotate(${photoRotation}deg)`,
                                  filter: activeToneCss,
                                }}
                                className={`w-full h-full transition-all duration-200 ${
                                  photoFitMode === 'cover' ? 'object-cover' : 'object-contain'
                                }`}
                              />
                            </div>
                          )}

                          {/* Card 1: Customise Image (AI, rotation and crop) */}
                          <div className="rounded-[18px] bg-white border border-black/15 p-3.5 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-black/15 flex items-center justify-center shrink-0 relative">
                                  <Crop className="w-5 h-5 text-[#D93200]" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-sans font-bold text-[#0F1115] truncate">
                                    Customise image
                                  </div>
                                  <div className="text-[11px] font-sans text-neutral-600 truncate">
                                    AI background, rotation &amp; crop · {passportBg}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setChangingPassportSize(false);
                                  setEditingPhoto((v) => !v);
                                }}
                                className="text-xs font-sans font-bold text-[#D93200] hover:underline cursor-pointer shrink-0"
                              >
                                {editingPhoto ? 'Close' : 'Edit'}
                              </button>
                            </div>

                            {editingPhoto && (
                              <div className="pt-2.5 border-t border-black/10 space-y-2.5 animate-panel-in">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPhotoRotation((r) => (((r + 90) % 360) as 0 | 90 | 180 | 270))
                                      }
                                      className="px-2.5 py-1.5 rounded-xl bg-[#FAF9F6] border border-black/15 hover:border-black text-xs font-sans font-semibold text-[#0F1115] inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <RotateCw className="w-3.5 h-3.5 text-[#D93200]" aria-hidden="true" />
                                      <span>Rotate</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPhotoFitMode((m) => (m === 'cover' ? 'contain' : 'cover'))
                                      }
                                      className="px-2.5 py-1.5 rounded-xl bg-[#FAF9F6] border border-black/15 hover:border-black text-xs font-sans font-semibold text-[#0F1115] cursor-pointer"
                                    >
                                      {photoFitMode === 'cover' ? 'Fit Full' : 'Fill Crop'}
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {(['original', 'vivid', 'bw'] as const).map((tone) => (
                                      <button
                                        key={tone}
                                        type="button"
                                        onClick={() => setPhotoTone(tone)}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-sans font-bold uppercase cursor-pointer ${
                                          photoTone === tone
                                            ? 'bg-black text-[#FDE09B]'
                                            : 'bg-[#FAF9F6] border border-black/15 text-[#0F1115]'
                                        }`}
                                      >
                                        {tone}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {(['Keep Original', 'Pure White', 'Light Blue'] as const).map((bg) => (
                                      <button
                                        key={bg}
                                        type="button"
                                        onClick={() => setPassportBg(bg)}
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold cursor-pointer transition-colors ${
                                          passportBg === bg
                                            ? 'bg-[#D93200] text-white'
                                            : 'bg-[#FAF9F6] border border-black/15 text-[#0F1115] hover:border-black'
                                        }`}
                                      >
                                        {bg}
                                      </button>
                                    ))}
                                  </div>

                                  <button
                                    type="button"
                                    disabled={applyingPhotoEdit}
                                    onClick={handleApplyPhotoEdit}
                                    className="px-3.5 py-1 rounded-full bg-black hover:bg-[#D93200] text-white text-[11px] font-sans font-bold cursor-pointer transition-colors"
                                  >
                                    {applyingPhotoEdit ? 'Saving...' : 'Done'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card 2: Standard Size (35 x 45 mm) + Change */}
                          <div className="rounded-[18px] bg-white border border-black/15 p-3.5 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-[#0F1115] text-[#FDE09B] flex items-center justify-center shrink-0">
                                  <User className="w-5 h-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-sans font-bold text-[#0F1115] truncate">
                                    {activeSizeMeta.label}
                                  </div>
                                  <div className="text-[11px] font-sans text-neutral-600 tabular-nums">
                                    Size: {activeSizeMeta.dims}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPhoto(false);
                                  setChangingPassportSize((v) => !v);
                                }}
                                className="text-xs font-sans font-bold text-[#D93200] hover:underline cursor-pointer shrink-0"
                              >
                                {changingPassportSize ? 'Close' : 'Change'}
                              </button>
                            </div>

                            {changingPassportSize && (
                              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-black/10 animate-panel-in">
                                {PASSPORT_SIZES.map((sz) => {
                                  const isSelected = paperSize === sz.value;
                                  return (
                                    <button
                                      key={sz.value}
                                      type="button"
                                      onClick={() => {
                                        setPaperSize(sz.value);
                                        setChangingPassportSize(false);
                                      }}
                                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                        isSelected
                                          ? 'border-2 border-[#D93200] bg-[#FDE09B]/45'
                                          : 'border-black/15 bg-[#FAF9F6] hover:border-black/40'
                                      }`}
                                    >
                                      <div className="text-xs font-sans font-bold text-[#0F1115]">
                                        {sz.label}
                                      </div>
                                      <div className="text-[11px] font-sans text-neutral-600 tabular-nums">
                                        {sz.dims}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Card 3: Choose Quantity (8 / 16 / 32 Photos) */}
                          <div className="rounded-[20px] bg-white border border-black/15 p-4 space-y-3">
                            <div className="text-xs font-sans font-bold text-[#0F1115]">
                              Choose quantity
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                              {PASSPORT_QUANTITIES.map((opt) => {
                                const isActive = passportSetCount === opt.count;
                                return (
                                  <button
                                    key={opt.count}
                                    type="button"
                                    onClick={() => setPassportSetCount(opt.count)}
                                    className={`rounded-[16px] overflow-hidden border text-center transition-all cursor-pointer flex flex-col ${
                                      isActive
                                        ? 'border-2 border-[#D93200] shadow-md'
                                        : 'border-black/15 hover:border-black/45'
                                    }`}
                                  >
                                    <div className="py-3 px-2 bg-[#FAF9F6]">
                                      <div className="text-lg font-sans font-black tabular-nums text-[#0F1115] leading-none">
                                        {opt.count}
                                      </div>
                                      <div className="text-[11px] font-sans font-medium text-neutral-600 mt-1">
                                        Photos
                                      </div>
                                    </div>
                                    <div
                                      className={`py-2 px-1.5 border-t transition-colors ${
                                        isActive
                                          ? 'bg-[#D93200] border-[#D93200] text-white'
                                          : 'bg-black/5 border-black/10 text-[#0F1115]'
                                      }`}
                                    >
                                      <div className="text-xs font-sans font-bold tabular-nums">
                                        ₹{opt.price}
                                      </div>
                                      <div
                                        className={`text-[10px] font-sans tabular-nums ${
                                          isActive ? 'text-white/90' : 'text-neutral-600'
                                        }`}
                                      >
                                        ({opt.perPhoto})
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="rounded-[18px] bg-[#FDE09B] p-4 border border-black/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                  <div>
                    <div className="text-xs font-sans font-semibold text-neutral-800 tabular-nums">
                      {printCategory === 'documents'
                        ? `Total ${pageCount * copies} ${pageCount * copies === 1 ? 'page' : 'pages'}`
                        : printCategory === 'passport'
                        ? `Total ${passportSetCount * Math.max(1, files.length)} photos`
                        : `Total ${Math.max(1, files.length) * copies} ${Math.max(1, files.length) * copies === 1 ? 'photo' : 'photos'}`}
                    </div>
                    <div className="text-2xl font-sans font-bold tabular-nums text-[#0F1115]">
                      ₹{computeEstimatedPrice().toFixed(2).replace(/\.00$/, '')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowOrderModal(false)}
                      className="h-11 px-5 rounded-full bg-white border border-black/25 hover:border-black text-xs font-sans font-semibold text-[#0F1115] cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingJob || files.length === 0}
                      className="px-6 h-11 rounded-full bg-[#D93200] hover:bg-black disabled:opacity-40 text-white font-sans font-bold text-xs shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submittingJob ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      )}
                      <span>{submittingJob ? 'Sending Order...' : 'Send Print Job'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showQrScanner && (
        <ShopQrScannerModal
          shops={shops}
          onClose={() => setShowQrScanner(false)}
          onShopDetected={(shop) => {
            setShowQrScanner(false);
            setActiveView('discover');
            openPrintFlow(shop);
          }}
        />
      )}
    </div>
  );
}

export default App;
