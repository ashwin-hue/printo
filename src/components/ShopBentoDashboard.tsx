import React, { useState, useEffect } from 'react';
import {
  Check,
  Clock,
  Download,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  PackageCheck,
  Phone,
  Plus,
  Power,
  Printer,
  QrCode,
  RefreshCw,
  Settings,
  CheckCircle2,
  ArrowRight,
  Usb,
  X
} from 'lucide-react';
import QRCode from 'qrcode';
import type { Shop, Order, OrderStatus, BucketFile } from '../types/database';
import type { DetectedPrinter } from '../services/localPrinters';
import { getCustomerOtp } from '../utils/otp';
import {
  buildShopQrDeepLink,
  getDefaultCustomerAppUrl,
  getShopUniqueCode,
} from '../utils/shopQr';
import { OpenFreeMapPicker, type SelectedLocation } from './OpenFreeMapPicker';

const AVAILABLE_SHOP_SERVICES = [
  'Laser Printing',
  'Photocopying',
  'Spiral Binding',
  'Soft Binding',
  'Hardcover Thesis',
  'Color Posters',
  'Lamination',
];

interface ShopBentoDashboardProps {
  shop: Shop;
  orders: Order[];
  bucketFiles: BucketFile[];
  detectedPrinters: DetectedPrinter[];
  scanningPrinters: boolean;
  ordersLoading: boolean;
  sessionEmail?: string;
  usbNotice?: string | null;
  onRefresh: () => void;
  onScanUsbPrinter: () => void;
  onToggleShopOnline: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onOpenBucketFile: (fileId?: string | null) => void;
  onPrintJobFile: (fileId?: string | null, printer?: DetectedPrinter | null) => void;
  onUpdateLocation: (loc: SelectedLocation) => Promise<boolean>;
  onVerifyPassword: (pwd: string) => Promise<boolean>;
  onUpdateShopDetails: (updates: {
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
    pricing?: {
      bwSingle: number;
      bwDouble: number;
      colorSingle: number;
    };
  }) => Promise<boolean>;
  onSignOut: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ShopBentoDashboard({
  shop,
  orders,
  bucketFiles,
  detectedPrinters,
  scanningPrinters,
  ordersLoading,
  sessionEmail,
  usbNotice,
  onRefresh,
  onScanUsbPrinter,
  onToggleShopOnline,
  onStatusChange,
  onOpenBucketFile,
  onPrintJobFile,
  onUpdateLocation,
  onVerifyPassword,
  onUpdateShopDetails,
  onSignOut,
}: ShopBentoDashboardProps) {
  const [jobFilter, setJobFilter] = useState<'ALL' | 'PENDING' | 'PRINTING' | 'READY' | 'DONE'>('ALL');
  const [selectedPrintersMap, setSelectedPrintersMap] = useState<Record<string, string>>({});
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [draftLocation, setDraftLocation] = useState<SelectedLocation>({
    latitude: Number(shop.latitude) || 12.9716,
    longitude: Number(shop.longitude) || 77.5946,
    address: shop.address || '',
    city: shop.city || '',
    pincode: shop.pincode || '',
  });
  const [savingLocation, setSavingLocation] = useState(false);

  // Password-protected Shop Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [verifyPasswordInput, setVerifyPasswordInput] = useState('');
  const [verifyingPwd, setVerifyingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const [editName, setEditName] = useState(shop.shop_name || '');
  const [editDesc, setEditDesc] = useState(shop.description || '');
  const [editPhone, setEditPhone] = useState(shop.phone || '');
  const [editAddress, setEditAddress] = useState(shop.address || '');
  const [editCity, setEditCity] = useState(shop.city || '');
  const [editPincode, setEditPincode] = useState(shop.pincode || '');
  const [editOpenTime, setEditOpenTime] = useState(
    shop.operating_hours?.[0]?.opening_time?.slice(0, 5) || '08:00'
  );
  const [editCloseTime, setEditCloseTime] = useState(
    shop.operating_hours?.[0]?.closing_time?.slice(0, 5) || '21:00'
  );
  const [editServices, setEditServices] = useState<string[]>(
    (shop.services || []).map((s) => s.service_name)
  );
  const [editBwSingle, setEditBwSingle] = useState('2');
  const [editBwDouble, setEditBwDouble] = useState('3');
  const [editColorSingle, setEditColorSingle] = useState('10');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [counterIdQuery, setCounterIdQuery] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrBaseUrl, setQrBaseUrl] = useState<string>(() => getDefaultCustomerAppUrl());
  const [shopQrDataUrl, setShopQrDataUrl] = useState<string>('');

  const shopUniqueId = getShopUniqueCode(shop.id);
  const qrDeepLink = buildShopQrDeepLink(shop.id, qrBaseUrl);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrDeepLink, {
      width: 420,
      margin: 2,
      color: { dark: '#0F1115', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setShopQrDataUrl(url);
      })
      .catch((err) => {
        console.error('QR generation failed:', err);
      });
    return () => {
      active = false;
    };
  }, [qrDeepLink]);

  const handleSaveQrBaseUrl = (nextUrl: string) => {
    setQrBaseUrl(nextUrl);
    try {
      if (typeof window !== 'undefined' && /^https?:\/\//i.test(nextUrl.trim())) {
        window.localStorage.setItem('prinrox_customer_app_url', nextUrl.trim());
      }
    } catch {
      // Ignore storage write issues
    }
  };

  const handleDownloadShopQrPoster = async () => {
    if (!shopQrDataUrl) return;
    try {
      const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('QR image load failed'));
        el.src = shopQrDataUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 940;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Off-white rounded poster canvas with Bento header
      ctx.fillStyle = '#0F1115';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(28, 28, canvas.width - 56, canvas.height - 56);

      ctx.fillStyle = '#D93200';
      ctx.fillRect(28, 28, canvas.width - 56, 16);

      ctx.fillStyle = '#0F1115';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PRINROX  |  SCAN TO UPLOAD & PRINT', canvas.width / 2, 108);

      ctx.font = 'bold 42px Georgia, serif';
      ctx.fillText(shop.shop_name.slice(0, 28), canvas.width / 2, 174);

      // Unique Shop ID dark pill
      ctx.fillStyle = '#0F1115';
      ctx.fillRect(190, 206, 340, 56);
      ctx.fillStyle = '#FDE09B';
      ctx.font = 'bold 28px monospace';
      ctx.fillText(`SHOP ID: ${shopUniqueId}`, canvas.width / 2, 244);

      // White framed QR square
      ctx.strokeStyle = '#0F1115';
      ctx.lineWidth = 4;
      ctx.strokeRect(140, 296, 440, 440);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(142, 298, 436, 436);
      ctx.drawImage(qrImg, 160, 316, 400, 400);

      ctx.fillStyle = '#262626';
      ctx.font = '600 22px sans-serif';
      ctx.fillText('Open your camera or Prinrox app to send files', canvas.width / 2, 800);
      ctx.fillStyle = '#D93200';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('directly to our counter printer queue', canvas.width / 2, 834);

      const link = document.createElement('a');
      link.download = `prinrox-qr-${shopUniqueId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setFeedbackToast(`Downloaded ${shopUniqueId} counter QR poster`);
    } catch (err) {
      console.error('Could not generate poster PNG:', err);
    }
  };

  useEffect(() => {
    if (!feedbackToast) return;
    const timer = window.setTimeout(() => setFeedbackToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [feedbackToast]);

  const triggerOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await Promise.resolve(onStatusChange(orderId, nextStatus));
      setFeedbackToast(`Order marked ${nextStatus.replace(/_/g, ' ')}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const openSettingsModal = () => {
    setSettingsUnlocked(false);
    setVerifyPasswordInput('');
    setPwdError(null);
    setSettingsError(null);

    setEditName(shop.shop_name || '');
    setEditDesc(shop.description || '');
    setEditPhone(shop.phone || '');
    setEditAddress(shop.address || '');
    setEditCity(shop.city || '');
    setEditPincode(shop.pincode || '');
    setEditOpenTime(shop.operating_hours?.[0]?.opening_time?.slice(0, 5) || '08:00');
    setEditCloseTime(shop.operating_hours?.[0]?.closing_time?.slice(0, 5) || '21:00');
    setEditServices((shop.services || []).map((s) => s.service_name));

    const bwSingleRow = shop.pricing?.find(
      (p) => p.color_mode?.toLowerCase().includes('b') && p.sides?.toLowerCase() === 'single'
    );
    const bwDoubleRow = shop.pricing?.find(
      (p) => p.color_mode?.toLowerCase().includes('b') && p.sides?.toLowerCase() === 'double'
    );
    const colorRow = shop.pricing?.find(
      (p) => p.color_mode?.toLowerCase().includes('color') && p.sides?.toLowerCase() === 'single'
    );

    setEditBwSingle(String(bwSingleRow?.price_per_page ?? 2));
    setEditBwDouble(String(bwDoubleRow?.price_per_page ?? 3));
    setEditColorSingle(String(colorRow?.price_per_page ?? 10));

    setShowSettingsModal(true);
  };

  const handleVerifyPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyPasswordInput.trim()) {
      setPwdError('Please enter your account password.');
      return;
    }
    setPwdError(null);
    setVerifyingPwd(true);
    try {
      const ok = await onVerifyPassword(verifyPasswordInput);
      if (ok) {
        setSettingsUnlocked(true);
        setVerifyPasswordInput('');
      } else {
        setPwdError('Incorrect password. Please verify and try again.');
      }
    } catch {
      setPwdError('Unable to verify password right now.');
    } finally {
      setVerifyingPwd(false);
    }
  };

  const toggleEditService = (serviceName: string) => {
    setEditServices((prev) =>
      prev.includes(serviceName)
        ? prev.filter((item) => item !== serviceName)
        : [...prev, serviceName]
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setSettingsError('Shop name cannot be empty.');
      return;
    }
    setSettingsError(null);
    setSavingSettings(true);
    try {
      const ok = await onUpdateShopDetails({
        shopName: editName.trim(),
        description: editDesc.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        city: editCity.trim(),
        pincode: editPincode.trim(),
        latitude: Number(shop.latitude) || undefined,
        longitude: Number(shop.longitude) || undefined,
        openingTime: editOpenTime,
        closingTime: editCloseTime,
        services: editServices,
        pricing: {
          bwSingle: Math.max(0.5, Number(editBwSingle) || 2),
          bwDouble: Math.max(0.5, Number(editBwDouble) || 3),
          colorSingle: Math.max(1, Number(editColorSingle) || 10),
        },
      });
      if (ok) {
        setShowSettingsModal(false);
        setFeedbackToast('Shop details saved');
      } else {
        setSettingsError('Could not save shop settings. Please try again.');
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveLocation = async () => {
    setSavingLocation(true);
    try {
      const ok = await onUpdateLocation(draftLocation);
      if (ok) {
        setShowLocationModal(false);
        setFeedbackToast('Shop location updated');
      }
    } finally {
      setSavingLocation(false);
    }
  };

  const onlinePrintersCount = detectedPrinters.filter(
    (p) => p.status === 'online' || p.status === 'ready'
  ).length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const normalizedCounterId = counterIdQuery.replace(/\D/g, '').slice(0, 4);

  const filteredOrders = orders.filter((o) => {
    if (normalizedCounterId.length === 4) {
      return getCustomerOtp(o.customer_id || o.customer?.id) === normalizedCounterId;
    }
    if (jobFilter === 'ALL') return true;
    if (jobFilter === 'PENDING') return o.status === 'pending' || o.status === 'accepted';
    if (jobFilter === 'PRINTING') return o.status === 'printing';
    if (jobFilter === 'READY') return o.status === 'ready_for_collection';
    if (jobFilter === 'DONE') return o.status === 'completed';
    return true;
  });

  const primaryPrinter = detectedPrinters.find((p) => p.isDefault) || detectedPrinters[0];

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans antialiased selection:bg-[#FF3B00] selection:text-white p-2.5 sm:p-4 lg:p-5 flex flex-col gap-3.5">

      {feedbackToast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2 rounded-full bg-emerald-700 text-white text-xs font-sans font-semibold shadow-xl flex items-center gap-2 animate-panel-in"
        >
          <Check className="w-4 h-4" aria-hidden="true" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* ROW 1: MAIN OFF-WHITE HEADER CARD                                 */}
      {/* ================================================================= */}
      <header className="w-full rounded-[24px] bg-[#FAF9F6] text-[#0F1115] px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        
        {/* Left: Brand & Shop Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1 leading-none">
            <span className="font-serif font-black text-3xl sm:text-4xl tracking-tight text-[#0F1115] lowercase">
              prinrox
            </span>
            <span className="text-[#FF3B00] font-serif font-bold text-xl leading-none" aria-hidden="true">®</span>
          </div>

          <div className="hidden sm:block h-8 w-px bg-black/15" />

          <div className="hidden sm:block">
            <div className="text-sm font-sans font-bold text-[#0F1115]">{shop.shop_name}</div>
            <div className="text-xs font-sans text-neutral-600">
              {sessionEmail || shop.email || 'Owner Account'}
            </div>
          </div>
        </div>

        {/* Center/Right Nav Pills & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          
          <button
            type="button"
            onClick={() => setJobFilter('ALL')}
            className="h-10 px-3.5 rounded-full border border-black/25 bg-white hover:border-black transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span className="text-xs font-sans font-bold tracking-wide text-[#0F1115] uppercase">Print Jobs</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FDE09B] text-xs font-sans font-bold tabular-nums text-[#0F1115]">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={onScanUsbPrinter}
            className="h-10 px-3.5 rounded-full border border-black/25 bg-white hover:border-black transition-colors flex items-center gap-2 cursor-pointer"
            title="Scan connected USB printer"
          >
            <span className="text-xs font-sans font-bold tracking-wide text-[#0F1115] uppercase">Printers</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FDE09B] text-xs font-sans font-bold tabular-nums text-[#0F1115]">
              {detectedPrinters.length > 0 ? `${onlinePrintersCount} ready` : 'System'}
            </span>
          </button>

          {/* Earnings + Quick Icons + Status / Sign Out */}
          <div className="flex flex-col items-end gap-1.5 ml-1">
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1 text-xs font-sans font-bold tabular-nums text-[#0F1115] mr-1">
                ₹{totalRevenue.toFixed(0)} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>

              <button
                type="button"
                onClick={onSignOut}
                className="h-8 px-3.5 rounded-full bg-black hover:bg-[#D93200] text-white text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>

              <button
                type="button"
                onClick={onToggleShopOnline}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  shop.is_active
                    ? 'bg-black hover:bg-emerald-700 text-emerald-400 hover:text-white'
                    : 'bg-rose-600 text-white'
                }`}
                title={shop.is_active ? 'Shop Open - Click to Close' : 'Shop Closed - Click to Open'}
                aria-label={shop.is_active ? 'Close shop' : 'Open shop'}
              >
                <Power className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onRefresh}
                className="w-8 h-8 rounded-full bg-black hover:bg-neutral-800 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Refresh Orders & Printers"
                aria-label="Refresh Orders and Printers"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading || scanningPrinters ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleShopOnline}
                className="px-2.5 py-0.5 rounded-full bg-black text-white text-[11px] font-sans font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${shop.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}
                  aria-hidden="true"
                />
                <span>{shop.is_active ? 'Open' : 'Closed'}</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* ================================================================= */}
      {/* ROW 3: MAIN 3-COLUMN BENTO GRID WORKSPACE                         */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1">
        
        {/* --------------------------------------------------------------- */}
        {/* LEFT COLUMN: SHOP OVERVIEW CARD                                 */}
        {/* --------------------------------------------------------------- */}
        <aside className="lg:col-span-3 rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-5 flex flex-col justify-between gap-4">
          
          <div className="space-y-4 flex-1 flex flex-col">
            <div>
              <h1 className="font-serif font-black text-3xl sm:text-[36px] leading-[1.04] tracking-tight text-[#0F1115] text-balance">
                {shop.shop_name}
              </h1>
              <p className="mt-2.5 text-xs font-sans text-neutral-700 leading-relaxed">
                {shop.description ||
                  'Campus digital printing shop for fast assignments, notes, posters, and binding.'}
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-black/10 text-xs font-sans text-neutral-800">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#FF3B00] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {shop.address || 'Campus Block'}
                  {shop.city ? `, ${shop.city}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-800 shrink-0" aria-hidden="true" />
                <span className="tabular-nums">
                  {shop.operating_hours?.[0]?.opening_time?.slice(0, 5) || '08:00'} –{' '}
                  {shop.operating_hours?.[0]?.closing_time?.slice(0, 5) || '21:00'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-neutral-800 shrink-0" aria-hidden="true" />
                <span className="tabular-nums">{shop.phone || 'Contact Not Set'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-black/10">
              <div className="text-xs font-sans font-semibold text-neutral-700">
                Services Offered
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(shop.services || []).map((srv) => (
                  <span
                    key={srv.id}
                    className="px-2.5 py-1 rounded-full bg-black/5 border border-black/15 text-xs font-sans font-medium text-[#0F1115]"
                  >
                    {srv.service_name}
                  </span>
                ))}
              </div>
            </div>

            {/* Unique Shop ID + Scannable Counter QR Card */}
            <div className="rounded-[18px] bg-black text-white p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  Unique Shop ID
                </div>
                <div className="font-mono font-black text-sm tracking-wider text-[#FDE09B] tabular-nums">
                  {shopUniqueId}
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="mt-1 px-2.5 py-1 rounded-full bg-[#D93200] hover:bg-white hover:text-[#0F1115] text-white text-[11px] font-sans font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3 h-3" aria-hidden="true" />
                  <span>Counter QR</span>
                </button>
              </div>
              {shopQrDataUrl && (
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="w-16 h-16 rounded-xl bg-white p-1 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  title="Expand scannable Shop QR"
                  aria-label="Open counter QR code standee"
                >
                  <img
                    src={shopQrDataUrl}
                    alt={`${shop.shop_name} QR code`}
                    className="w-full h-full object-contain"
                  />
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-end space-y-2 pt-3 border-t border-black/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-semibold text-neutral-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF3B00]" aria-hidden="true" />
                  <span>Shop Location</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDraftLocation({
                      latitude: Number(shop.latitude) || 12.9716,
                      longitude: Number(shop.longitude) || 77.5946,
                      address: shop.address || '',
                      city: shop.city || '',
                      pincode: shop.pincode || '',
                    });
                    setShowLocationModal(true);
                  }}
                  className="text-xs font-sans font-semibold text-[#D93200] hover:underline cursor-pointer"
                >
                  Edit Pin
                </button>
              </div>
              <OpenFreeMapPicker
                latitude={Number(shop.latitude) || 12.9716}
                longitude={Number(shop.longitude) || 77.5946}
                heightClass="h-48 lg:h-56"
                interactive={false}
                onChange={() => {}}
              />
            </div>
          </div>

          <div className="flex items-center justify-start pt-3 border-t border-black/10">
            <button
              type="button"
              onClick={openSettingsModal}
              className="w-9 h-9 rounded-full border border-black/30 hover:border-[#D93200] hover:bg-[#D93200] text-[#0F1115] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Shop Settings"
              aria-label="Shop Settings"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </aside>

        {/* --------------------------------------------------------------- */}
        {/* CENTER COLUMN: CONTROL BAR + WARM CREAM ORDERS & FILES CARD     */}
        {/* --------------------------------------------------------------- */}
        <section className="lg:col-span-6 flex flex-col gap-3.5">
          
          {/* Top White Pill Control Bar */}
          <div className="rounded-[24px] sm:rounded-full bg-[#FAF9F6] text-[#0F1115] px-5 py-2.5 flex items-center justify-between gap-3">
            <div className="text-lg sm:text-xl font-sans font-bold tracking-tight tabular-nums text-[#0F1115]">
              ₹{totalRevenue.toFixed(0)}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={ordersLoading}
              className="h-10 pl-4 pr-1.5 rounded-full border border-black/25 bg-white hover:border-black flex items-center gap-2.5 text-xs font-sans font-bold tracking-wide text-[#0F1115] uppercase cursor-pointer transition-colors disabled:opacity-60"
            >
              <span>{ordersLoading ? 'Loading' : 'Refresh'}</span>
              <span className="w-7 h-7 rounded-full bg-[#D93200] text-white flex items-center justify-center">
                {ordersLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="w-4 h-4" aria-hidden="true" />
                )}
              </span>
            </button>
          </div>

          {/* Center Giant Butter-Yellow Bento Card (#FDE09B) */}
          <div className="flex-1 rounded-[24px] bg-[#FDE09B] text-[#0F1115] flex flex-col justify-between overflow-hidden">
            
            {/* TOP SECTION: CUSTOMER PRINT JOBS */}
            <div className="p-5 sm:p-6 space-y-4">
              
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#0F1115] text-balance">
                    Live Print Queue
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-black text-[#FDE09B] text-xs font-sans font-bold tabular-nums">
                    {filteredOrders.length} {filteredOrders.length === 1 ? 'job' : 'jobs'}
                  </span>
                </div>

                {/* Quick Customer ID No Filter */}
                <div className="flex items-center gap-1.5 bg-white border border-black/25 rounded-full px-3 h-9 shadow-xs">
                  <KeyRound className="w-3.5 h-3.5 text-[#D93200] shrink-0" aria-hidden="true" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={counterIdQuery}
                    onChange={(e) => setCounterIdQuery(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Filter by ID No"
                    className="w-32 bg-transparent text-xs font-mono font-bold tracking-wider text-[#0F1115] placeholder:font-sans placeholder:font-medium placeholder:tracking-normal placeholder:text-neutral-500 focus:outline-none"
                    aria-label="Filter by customer 4-digit ID No"
                  />
                  {counterIdQuery && (
                    <button
                      type="button"
                      onClick={() => setCounterIdQuery('')}
                      className="text-neutral-500 hover:text-black cursor-pointer"
                      aria-label="Clear ID No filter"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {ordersLoading && filteredOrders.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-black/5 flex flex-col items-center justify-center gap-2.5">
                  <Loader2 className="w-6 h-6 text-[#D93200] animate-spin" aria-hidden="true" />
                  <div className="text-xs font-sans font-medium text-neutral-800">
                    Loading print queue...
                  </div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-xl bg-black/5 space-y-1.5">
                  <FileText className="w-7 h-7 text-neutral-700 mx-auto" aria-hidden="true" />
                  <div className="text-sm font-sans font-bold text-[#0F1115]">
                    {normalizedCounterId.length === 4 ? `No jobs for ID No ${normalizedCounterId}` : 'No print jobs waiting'}
                  </div>
                  <p className="text-xs font-sans text-neutral-700 max-w-sm mx-auto">
                    {normalizedCounterId.length === 4
                      ? 'Clear the ID filter to view all waiting jobs.'
                      : `New customer requests sent to ${shop.shop_name} appear here automatically.`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-black/15 border-t border-b border-black/15">
                  {filteredOrders.map((order) => {
                    const doc = order.order_documents?.[0];
                    const fileId = doc?.document?.storage_file_id;
                    const assignedPrinterId =
                      selectedPrintersMap[order.id] || primaryPrinter?.id || '';
                    const selectedPrinter =
                      detectedPrinters.find((p) => p.id === assignedPrinterId) || primaryPrinter || null;
                    const isUpdating = updatingOrderId === order.id;
                    const customerIdNo = getCustomerOtp(order.customer_id || order.customer?.id);

                    return (
                      <div key={order.id} className="py-3.5 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold tabular-nums text-xs text-[#0F1115]">
                                #{order.order_number}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-black text-[#FDE09B] text-[10px] font-sans font-semibold uppercase tracking-wide">
                                {order.status.replace(/_/g, ' ')}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-white/85 border border-black/20 text-[#0F1115] text-[10px] font-mono font-bold tabular-nums inline-flex items-center gap-1">
                                <KeyRound className="w-2.5 h-2.5 text-[#D93200]" aria-hidden="true" />
                                <span>ID: {customerIdNo}</span>
                              </span>
                              {fileId && (
                                <button
                                  type="button"
                                  onClick={() => onOpenBucketFile(fileId)}
                                  className="px-2.5 py-0.5 rounded-full bg-white border border-black/25 hover:bg-black hover:text-white text-[11px] font-sans font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Download className="w-3 h-3" aria-hidden="true" />
                                  <span>View PDF</span>
                                </button>
                              )}
                            </div>

                            <div className="text-sm font-sans font-bold text-[#0F1115] truncate">
                              {doc?.document?.file_name || 'Customer Document'}
                            </div>

                            <div className="text-xs font-sans text-neutral-800 flex flex-wrap items-center gap-x-2 tabular-nums">
                              <span>{order.total_copies || doc?.copies || 1} copies</span>
                              <span aria-hidden="true">·</span>
                              <span>{order.total_pages || 1} pages</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold">{doc?.color_mode || 'B&W'}</span>
                              <span aria-hidden="true">·</span>
                              <span>{doc?.paper_size || 'A4'}</span>
                              <span aria-hidden="true">·</span>
                              <span>{doc?.sides || 'Single'}</span>
                              {doc?.binding_type && doc.binding_type !== 'None' && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-semibold text-[#B82A00]">{doc.binding_type}</span>
                                </>
                              )}
                            </div>

                            {order.customer && (
                              <div className="text-xs font-sans text-neutral-700">
                                {order.customer.full_name || order.customer.email}
                                {order.customer.phone ? ` · ${order.customer.phone}` : ''}
                              </div>
                            )}

                            {order.customer_notes && (
                              <div className="text-xs font-sans text-neutral-900 bg-white/75 border border-black/15 rounded-lg px-2.5 py-1.5 mt-1">
                                Note: {order.customer_notes}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                            <div className="text-lg font-sans font-bold tabular-nums text-[#0F1115]">
                              ₹{order.total_amount}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {detectedPrinters.length > 0 && order.status !== 'completed' && (
                                <select
                                  value={assignedPrinterId}
                                  onChange={(e) =>
                                    setSelectedPrintersMap((prev) => ({
                                      ...prev,
                                      [order.id]: e.target.value,
                                    }))
                                  }
                                  className="h-8 px-2.5 rounded-full bg-white border border-black/25 text-xs font-sans font-medium text-[#0F1115] focus:outline-none focus:border-[#D93200] max-w-[160px]"
                                >
                                  {detectedPrinters.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {order.status === 'pending' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => triggerOrderStatus(order.id, 'accepted')}
                                  className="h-8 px-3.5 rounded-full bg-black hover:bg-[#D93200] text-white text-xs font-sans font-semibold cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-60"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                  <span>{isUpdating ? 'Updating' : 'Accept'}</span>
                                </button>
                              )}

                              {(order.status === 'accepted' || order.status === 'printing') && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => {
                                    if (fileId) {
                                      onPrintJobFile(fileId, selectedPrinter);
                                    }
                                    if (order.status === 'accepted') {
                                      triggerOrderStatus(order.id, 'printing');
                                    }
                                  }}
                                  className="h-8 px-3.5 rounded-full bg-[#D93200] hover:bg-black text-white text-xs font-sans font-semibold cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-60"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                  <span>Print Now</span>
                                </button>
                              )}

                              {order.status === 'printing' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => triggerOrderStatus(order.id, 'ready_for_collection')}
                                  className="h-8 px-3.5 rounded-full bg-emerald-700 hover:bg-black text-white text-xs font-sans font-semibold cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-60"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <PackageCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                  <span>Ready</span>
                                </button>
                              )}

                              {order.status === 'ready_for_collection' && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => triggerOrderStatus(order.id, 'completed')}
                                  className="h-8 px-3.5 rounded-full bg-black hover:bg-[#D93200] text-white text-xs font-sans font-semibold cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-60"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  )}
                                  <span>Complete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BOTTOM SECTION: CUSTOMER DOCUMENTS RECEIVED */}
            <div
              id="customer-files-section"
              className="p-5 sm:p-6 border-t border-black/20 grid grid-cols-1 sm:grid-cols-12 gap-4 items-start"
            >
              <div className="sm:col-span-4">
                <h3 className="font-serif text-lg font-bold tracking-tight text-[#0F1115] text-balance">
                  Uploaded Files
                </h3>
              </div>

              <div className="sm:col-span-8 space-y-2.5">
                {bucketFiles.length === 0 ? (
                  <p className="text-xs font-sans text-neutral-800 leading-relaxed">
                    Uploaded customer PDFs and documents appear here for preview and printing.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar pr-1">
                    {bucketFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/80 border border-black/15"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-sans font-bold text-[#0F1115] truncate">{file.name}</div>
                          <div className="text-[11px] font-sans text-neutral-700 flex items-center gap-1.5">
                            <span className="font-mono tabular-nums">{formatBytes(file.size)}</span>
                            {file.metadata?.customerEmail && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{file.metadata.customerEmail}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onPrintJobFile(file.id, primaryPrinter)}
                            className="px-2.5 py-1 rounded-full bg-[#D93200] hover:bg-black text-white text-xs font-sans font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Printer className="w-3 h-3" aria-hidden="true" />
                            <span>Print</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenBucketFile(file.id)}
                            className="px-2.5 py-1 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-sans font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            <span>Open</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* --------------------------------------------------------------- */}
        {/* RIGHT COLUMN: CONNECTED PRINTERS & SHOP PRICING                 */}
        {/* --------------------------------------------------------------- */}
        <aside className="lg:col-span-3 flex flex-col gap-3.5">

          {/* TOP CARD: BRIGHT VERMILION ORANGE CARD (YOUR RATES) */}
          <div className="rounded-[24px] bg-[#FF3B00] text-[#0F1115] p-5 flex flex-col justify-between min-h-[200px]">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-serif text-xl font-bold tracking-tight text-[#0F1115] leading-snug text-balance">
                Print Rates
              </h2>

              <button
                type="button"
                onClick={onRefresh}
                className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition-colors"
                title="Refresh Orders & Rates"
                aria-label="Refresh Orders and Rates"
              >
                <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 pt-3 border-t border-black/20">
              <div className="space-y-1.5 text-xs font-sans text-[#0F1115]">
                {(shop.pricing || []).slice(0, 3).map((rate) => (
                  <div key={rate.id} className="flex justify-between items-center font-medium">
                    <span>
                      {rate.color_mode} {rate.sides}
                    </span>
                    <span className="font-bold tabular-nums">₹{rate.price_per_page}/pg</span>
                  </div>
                ))}
              </div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-black text-white text-xs font-sans font-semibold tabular-nums">
                {orders.length} total {orders.length === 1 ? 'order' : 'orders'}
              </div>
            </div>
          </div>

          {/* BOTTOM WIDE WHITE CARD: CONNECTED PRINTERS */}
          <div className="rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-bold tracking-tight text-[#0F1115] tabular-nums text-balance">
                Local Printers ({detectedPrinters.length})
              </h2>

              <button
                type="button"
                onClick={onScanUsbPrinter}
                disabled={scanningPrinters}
                className="px-3 py-1 rounded-full bg-black hover:bg-[#D93200] text-white text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-60"
              >
                {scanningPrinters ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Usb className="w-3 h-3" aria-hidden="true" />
                )}
                <span>{scanningPrinters ? 'Scanning' : 'Scan USB'}</span>
              </button>
            </div>

            {usbNotice && (
              <div className="p-2.5 rounded-lg bg-[#FDE09B] text-xs font-sans font-medium text-[#0F1115] animate-panel-in">
                {usbNotice}
              </div>
            )}

            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {detectedPrinters.length === 0 ? (
                <div className="p-3 rounded-lg bg-black/5 border border-black/10 space-y-1">
                  <div className="text-xs font-sans font-bold text-[#0F1115]">
                    System Print Ready
                  </div>
                  <p className="text-xs font-sans text-neutral-700 leading-relaxed">
                    Use <strong>Scan USB</strong> to pair a USB printer, or click <strong>Print Now</strong> on a job to pick a system printer.
                  </p>
                </div>
              ) : (
                detectedPrinters.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg bg-black/5 border border-black/10 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-sans font-bold text-[#0F1115] truncate flex items-center gap-1.5">
                        <span className="truncate">{p.name}</span>
                        {p.isDefault && (
                          <span className="px-1.5 py-0.5 rounded bg-black text-[#FDE09B] text-[10px] font-sans font-semibold shrink-0">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-sans text-neutral-600 truncate">
                        {p.driver}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-sans font-semibold capitalize ${
                          p.status === 'offline'
                            ? 'bg-rose-700 text-white'
                            : 'bg-emerald-700 text-white'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </aside>

      </div>

      {/* ================================================================= */}
      {/* UPDATE SHOP LOCATION MODAL (OpenFreeMap)                          */}
      {/* ================================================================= */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-5 space-y-4 shadow-2xl border border-black/20 animate-panel-in">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold tracking-tight text-[#0F1115] text-balance">Update Shop Location</h3>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-[#D93200] transition-colors cursor-pointer"
                aria-label="Close location modal"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-xl bg-black p-3">
              <OpenFreeMapPicker
                latitude={draftLocation.latitude}
                longitude={draftLocation.longitude}
                heightClass="h-64"
                onChange={(loc) =>
                  setDraftLocation((prev) => ({
                    ...prev,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    address: loc.address || prev.address,
                    city: loc.city || prev.city,
                    pincode: loc.pincode || prev.pincode,
                  }))
                }
              />
            </div>

            {draftLocation.address && (
              <div className="text-xs font-sans text-neutral-800 bg-black/5 px-3 py-2 rounded-lg border border-black/10">
                {draftLocation.address} {draftLocation.city ? `· ${draftLocation.city}` : ''}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={savingLocation}
              className="w-full h-11 rounded-full bg-[#D93200] hover:bg-[#FF3B00] text-white font-sans text-xs font-bold tracking-wide transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingLocation && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{savingLocation ? 'Saving Location...' : 'Save Location'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* PASSWORD-PROTECTED SHOP SETTINGS MODAL                            */}
      {/* ================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-5 space-y-5 shadow-2xl border border-black/20 animate-panel-in">
            <div className="flex items-center justify-between border-b border-black/10 pb-3.5">
              <div>
                <div className="text-xs font-sans font-semibold text-[#D93200] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{settingsUnlocked ? 'Verified Station Access' : 'Password Verification'}</span>
                </div>
                <h3 className="font-serif text-xl font-bold tracking-tight text-[#0F1115] mt-0.5 text-balance">
                  {settingsUnlocked ? 'Edit Shop Details' : 'Verify Owner Password'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-[#D93200] transition-colors cursor-pointer shrink-0"
                aria-label="Close shop settings"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {!settingsUnlocked ? (
              <form onSubmit={handleVerifyPasswordSubmit} className="space-y-4">
                <div className="p-3.5 rounded-lg bg-black/5 border border-black/10 text-xs font-sans text-neutral-800 space-y-1">
                  <div className="text-[11px] font-medium text-neutral-600">
                    Account Email
                  </div>
                  <div className="font-semibold text-[#0F1115]">
                    {sessionEmail || shop.email || 'Registered Station Owner'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-sans font-semibold text-neutral-800 block">
                    Password
                  </label>
                  <input
                    type="password"
                    autoFocus
                    value={verifyPasswordInput}
                    onChange={(e) => setVerifyPasswordInput(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full h-11 px-3.5 rounded-lg bg-white border border-black/25 text-sm font-sans text-[#0F1115] placeholder:text-neutral-500 focus:outline-none focus:border-[#D93200]"
                  />
                </div>

                {pwdError && (
                  <div className="text-xs font-sans font-medium text-rose-800 bg-rose-100 border border-rose-300 rounded-lg px-3.5 py-2.5 animate-panel-in">
                    {pwdError}
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="h-11 px-5 rounded-full border border-black/25 hover:bg-black/5 text-xs font-sans font-semibold text-[#0F1115] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={verifyingPwd}
                    className="flex-1 h-11 rounded-full bg-[#D93200] hover:bg-[#FF3B00] text-white font-sans text-xs font-bold tracking-wide transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifyingPwd && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    <span>{verifyingPwd ? 'Verifying...' : 'Verify & Unlock'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-sans font-semibold text-neutral-800 block">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Metro Graphics Print Hub"
                    className="w-full h-10 px-3.5 rounded-lg bg-white border border-black/25 text-sm font-sans font-medium text-[#0F1115] placeholder:text-neutral-500 focus:outline-none focus:border-[#D93200]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-sans font-semibold text-neutral-800 block">
                    About the Shop
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Short description shown to customers"
                    className="w-full p-3 rounded-lg bg-white border border-black/25 text-xs font-sans text-[#0F1115] placeholder:text-neutral-500 focus:outline-none focus:border-[#D93200] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-sans font-semibold text-neutral-800 block">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-10 px-3.5 rounded-lg bg-white border border-black/25 text-xs font-sans tabular-nums text-[#0F1115] placeholder:text-neutral-500 focus:outline-none focus:border-[#D93200]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-sans font-semibold text-neutral-800 block">
                      City
                    </label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Bengaluru"
                      className="w-full h-10 px-3.5 rounded-lg bg-white border border-black/25 text-xs font-sans text-[#0F1115] placeholder:text-neutral-500 focus:outline-none focus:border-[#D93200]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-sans font-semibold text-neutral-800 block">
                      Shop Address
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Shop address or campus block"
                      className="w-full h-10 px-3.5 rounded-lg bg-white border border-black/25 text-xs font-sans text-[#0F1115] placeholder:text-neutral-500 focus:outline-none focus:border-[#D93200]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-sans font-semibold text-neutral-800 block">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={editPincode}
                      onChange={(e) => setEditPincode(e.target.value)}
                      placeholder="560001"
                      className="w-full h-10 px-3.5 rounded-lg bg-white border border-black/25 text-xs font-mono tabular-nums text-[#0F1115] placeholder:text-neutral-500 focus:outline-none focus:border-[#D93200]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-sans font-semibold text-neutral-800 block">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={editOpenTime}
                      onChange={(e) => setEditOpenTime(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-lg bg-white border border-black/25 text-xs font-sans tabular-nums text-[#0F1115] focus:outline-none focus:border-[#D93200]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-sans font-semibold text-neutral-800 block">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={editCloseTime}
                      onChange={(e) => setEditCloseTime(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-lg bg-white border border-black/25 text-xs font-sans tabular-nums text-[#0F1115] focus:outline-none focus:border-[#D93200]"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-xs font-sans font-semibold text-neutral-800 block">
                    Services Offered
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_SHOP_SERVICES.map((srv) => {
                      const active = editServices.includes(srv);
                      return (
                        <button
                          key={srv}
                          type="button"
                          onClick={() => toggleEditService(srv)}
                          className={`px-3 py-1.5 rounded-full text-xs font-sans font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            active
                              ? 'bg-[#0F1115] border-[#0F1115] text-white'
                              : 'bg-white border-black/20 text-neutral-700 hover:border-black'
                          }`}
                        >
                          {active && <Check className="w-3 h-3 text-[#FF3B00]" aria-hidden="true" />}
                          <span>{srv}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-sans font-semibold text-neutral-800 block">
                      B&amp;W Single (₹)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={editBwSingle}
                      onChange={(e) => setEditBwSingle(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white border border-black/25 text-xs font-sans tabular-nums text-[#0F1115] focus:outline-none focus:border-[#D93200]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-sans font-semibold text-neutral-800 block">
                      B&amp;W Double (₹)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={editBwDouble}
                      onChange={(e) => setEditBwDouble(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white border border-black/25 text-xs font-sans tabular-nums text-[#0F1115] focus:outline-none focus:border-[#D93200]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-sans font-semibold text-neutral-800 block">
                      Color Page (₹)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={editColorSingle}
                      onChange={(e) => setEditColorSingle(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-white border border-black/25 text-xs font-sans tabular-nums text-[#0F1115] focus:outline-none focus:border-[#D93200]"
                    />
                  </div>
                </div>

                {settingsError && (
                  <div className="text-xs font-sans font-medium text-rose-800 bg-rose-100 border border-rose-300 rounded-lg px-3.5 py-2.5 animate-panel-in">
                    {settingsError}
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="h-11 px-5 rounded-full border border-black/25 hover:bg-black/5 text-xs font-sans font-semibold text-[#0F1115] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex-1 h-11 rounded-full bg-[#D93200] hover:bg-[#FF3B00] text-white font-sans text-xs font-bold tracking-wide transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingSettings && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    <span>{savingSettings ? 'Saving Changes...' : 'Save Shop Changes'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: COUNTER QR STANDEE & UNIQUE SHOP ID                        */}
      {/* ================================================================= */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop-in"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-qr-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-6 border border-black/20 shadow-2xl space-y-4 animate-panel-in"
          >
            <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3">
              <div className="min-w-0">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#D93200]">
                  Unique Counter QR &amp; ID
                </div>
                <h2
                  id="shop-qr-modal-title"
                  className="font-serif text-xl font-bold text-[#0F1115] truncate mt-0.5"
                >
                  {shop.shop_name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full bg-black hover:bg-[#D93200] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close counter QR modal"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-[20px] bg-white border-2 border-black p-5 flex flex-col items-center gap-3 text-center">
              <span className="px-3.5 py-1 rounded-full bg-black text-[#FDE09B] font-mono font-black text-sm tracking-wider tabular-nums">
                SHOP ID: {shopUniqueId}
              </span>

              {shopQrDataUrl && (
                <img
                  src={shopQrDataUrl}
                  alt={`QR Code for ${shop.shop_name}`}
                  className="w-56 h-56 rounded-xl border border-black/15"
                />
              )}

              <p className="text-xs font-sans text-neutral-700 leading-relaxed max-w-xs">
                Walk-in customers can scan this QR using the Prinrox web app or their phone camera to upload documents directly to your shop.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-sans font-bold text-neutral-700 block">
                Customer Web App URL encoded in QR
              </label>
              <input
                type="url"
                value={qrBaseUrl}
                onChange={(e) => handleSaveQrBaseUrl(e.target.value)}
                placeholder="http://localhost:5173"
                className="w-full h-9 px-3 rounded-xl bg-white border border-black/25 text-xs font-mono text-[#0F1115] focus:outline-none focus:border-[#D93200]"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 px-4 rounded-full border border-black/25 hover:bg-black/5 text-xs font-sans font-semibold text-[#0F1115] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadShopQrPoster}
                className="flex-1 h-11 rounded-full bg-[#D93200] hover:bg-black text-white font-sans text-xs font-bold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download QR Standee</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
