import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, 
  Clock, 
  Printer, 
  Check, 
  X, 
  FileText, 
  Eye, 
  AlertCircle, 
  Sliders, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Sparkles,
  Phone,
  User,
  ShieldCheck,
  ExternalLink,
  Power
} from 'lucide-react';
import { 
  Order, 
  Shop, 
  ShopPricing, 
  DailyShopStats,
  OrderStatus 
} from '../types';
import { 
  getOrders, 
  updateOrderStatus, 
  getShops, 
  getShopPricing, 
  updateShopPricing, 
  getDailyStats, 
  updateShop,
  getCurrentUser 
} from '../services/storage';
import { renderPdfPageToCanvas, renderMockDocPageToCanvas, triggerNativeBrowserPrint } from '../services/pdfService';
import { ReceiptModal } from './ReceiptModal';

interface ShopOwnerDashboardProps {
  activeTab?: 'incoming' | 'active' | 'ready' | 'history' | 'pricing' | 'settings';
  setActiveTab?: (tab: 'incoming' | 'active' | 'ready' | 'history' | 'pricing' | 'settings') => void;
}

export const ShopOwnerDashboard: React.FC<ShopOwnerDashboardProps> = ({
  activeTab: controlledTab,
  setActiveTab: setControlledTab,
}) => {
  const user = getCurrentUser();
  const shops = getShops();
  const shop = shops.find(s => s.owner_id === user.id) || shops[0];
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [internalTab, setInternalTab] = useState<'incoming' | 'active' | 'ready' | 'history' | 'pricing' | 'settings'>('incoming');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = setControlledTab ?? setInternalTab;

  const [stats, setStats] = useState<DailyShopStats>(getDailyStats(shop.id));
  const [pricing, setPricing] = useState<ShopPricing>(getShopPricing(shop.id));

  // Preview Modal State
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [previewScale, setPreviewScale] = useState<number>(1.0);
  const [previewCanvasKey, setPreviewCanvasKey] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Rejection modal
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Laser press capacity full for next 2 hours');

  // Receipt modal
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Pricing Form State
  const [pricingForm, setPricingForm] = useState<ShopPricing>(pricing);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Shop Settings State
  const [shopSettings, setShopSettings] = useState<Shop>(shop);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const loadData = () => {
    const all = getOrders();
    const shopOrders = all.filter(o => o.shop_id === shop.id);
    setOrders(shopOrders);
    setStats(getDailyStats(shop.id));
    const p = getShopPricing(shop.id);
    setPricing(p);
    setPricingForm(p);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('printo_storage_update', handleUpdate);
    return () => window.removeEventListener('printo_storage_update', handleUpdate);
  }, [shop.id]);

  useEffect(() => {
    if (previewOrder && canvasRef.current) {
      if (previewOrder.document.file_url && previewOrder.document.file_url.startsWith('data:')) {
        renderPdfPageToCanvas(previewOrder.document.file_url, previewPage, canvasRef.current, previewScale);
      } else {
        renderMockDocPageToCanvas(
          canvasRef.current, 
          previewPage, 
          previewScale, 
          previewOrder.document.file_name.replace('.pdf', '')
        );
      }
    }
  }, [previewOrder, previewPage, previewScale, previewCanvasKey]);

  // Order actions
  const handleAccept = (orderId: string) => {
    updateOrderStatus(orderId, 'accepted');
  };

  const handleStartPrinting = (orderId: string) => {
    updateOrderStatus(orderId, 'printing');
  };

  const handleMarkReady = (orderId: string) => {
    updateOrderStatus(orderId, 'ready');
  };

  const handleMarkCompleted = (orderId: string) => {
    updateOrderStatus(orderId, 'completed');
  };

  const handleConfirmReject = () => {
    if (rejectingOrder) {
      updateOrderStatus(rejectingOrder.id, 'rejected', rejectReason);
      setRejectingOrder(null);
    }
  };

  const handleTriggerPrint = (order: Order) => {
    triggerNativeBrowserPrint(order.document.file_name, order.document.page_count);
    if (order.status === 'accepted') {
      updateOrderStatus(order.id, 'printing');
    }
  };

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    updateShopPricing(pricingForm);
    setPricing(pricingForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveShopSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateShop(shopSettings);
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  // Grouped lists
  const incomingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => o.status === 'accepted' || o.status === 'printing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'rejected' || o.status === 'cancelled');

  return (
    <div className="py-6 sm:py-10 bg-[#EAE6DF] text-[#0F1115] min-h-[calc(100vh-64px)] selection:bg-[#FF5A1F] selection:text-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[5vw] space-y-8">
        
        {/* Header & Status Indicator matching Reference Image */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b-2 border-black/10">
          <div className="space-y-2">
            <div className="font-mono font-bold text-[11px] sm:text-xs tracking-[0.08em] uppercase text-black/70 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-ping" />
              <span className="w-2 h-2 rounded-full bg-[#FF5A1F] -ml-4" />
              COMMERCIAL LASER DISPATCH CONSOLE // TERMINAL 01
            </div>
            
            {/* Bold All-Caps Title inspired by reference image */}
            <h1 className="font-sans font-black text-4xl sm:text-6xl md:text-7xl tracking-[-0.04em] text-black uppercase leading-[0.95]">
              {shop.shop_name}
              <span className="text-[#FF5A1F] ml-1">.</span>
            </h1>
            
            <p className="font-mono text-xs sm:text-sm text-black/70 max-w-xl">
              Real-time student payload ingestion, direct browser laser printing, and live pricing rate card.
            </p>
          </div>

          {/* Right Hero Cluster: Circular Rotating Seal Stamp + Station Switch */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            {/* Circular Rotating Seal Stamp from reference image */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center select-none group">
              <svg className="w-full h-full animate-[spin_25s_linear_infinite]" viewBox="0 0 120 120">
                <path
                  id="stampCircle"
                  d="M 60,60 m -46,0 a 46,46 0 1,1 92,0 a 46,46 0 1,1 -92,0"
                  fill="none"
                />
                <text className="font-mono text-[8px] font-bold tracking-[0.22em] uppercase fill-black">
                  <textPath href="#stampCircle">
                    • PRINTO DISPATCH ENGINE • V2.0 OFFICIAL RELEASE • SPEED PRINT
                  </textPath>
                </text>
              </svg>
              <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black text-white flex flex-col items-center justify-center border-2 border-[#EAE6DF] shadow-md group-hover:scale-105 transition-transform">
                <span className="text-[#FF5A1F] text-xs leading-none">★</span>
                <span className="font-mono text-[7px] font-bold tracking-wider uppercase text-center leading-tight mt-0.5">
                  START<br />DISPATCH
                </span>
              </div>
            </div>

            {/* Station Status Switch Box */}
            <div className="px-5 py-3.5 bg-white rounded-3xl border-2 border-black flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between gap-4 font-mono">
                <span className="text-[10px] text-black/60 uppercase font-bold">Station</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  shop.accepting_orders 
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-400' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {shop.accepting_orders ? 'ONLINE' : 'PAUSED'}
                </span>
              </div>
              <button
                onClick={() => {
                  const updated = { ...shop, accepting_orders: !shop.accepting_orders };
                  updateShop(updated);
                  setShopSettings(updated);
                }}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                  shop.accepting_orders ? 'bg-black' : 'bg-[#C4C9CF]'
                }`}
                title="Toggle station intake"
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  shop.accepting_orders ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Daily Stats KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-black shadow-sm hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-black/60 font-bold">Today's Revenue</span>
              <span className="w-6 h-6 rounded-full bg-black text-[#FF5A1F] flex items-center justify-center font-mono text-xs font-bold">₹</span>
            </div>
            <div className="font-sans font-black text-3xl sm:text-4xl text-black mt-2 tracking-tight">
              ₹{stats.today_revenue.toFixed(2)}
            </div>
            <p className="font-mono text-[10px] text-emerald-700 font-bold mt-1">
              ↑ 18% higher than yesterday
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-black shadow-sm hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-black/60 font-bold">Pending Approval</span>
              <Clock className="w-4 h-4 text-[#FF5A1F]" />
            </div>
            <div className="font-sans font-black text-3xl sm:text-4xl text-black mt-2 tracking-tight">
              {incomingOrders.length}
            </div>
            <p className="font-mono text-[10px] text-black/60 mt-1 font-medium">
              Incoming student payloads
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-black shadow-sm hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-black/60 font-bold">Active In-Press</span>
              <Printer className="w-4 h-4 text-[#FF5A1F]" />
            </div>
            <div className="font-sans font-black text-3xl sm:text-4xl text-black mt-2 tracking-tight">
              {activeOrders.length}
            </div>
            <p className="font-mono text-[10px] text-black/60 mt-1 font-medium">
              Currently running on laser
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-black shadow-sm hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-black/60 font-bold">Ready for Pickup</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="font-sans font-black text-3xl sm:text-4xl text-black mt-2 tracking-tight">
              {readyOrders.length}
            </div>
            <p className="font-mono text-[10px] text-black/60 mt-1 font-medium">
              At 30-sec express counter
            </p>
          </div>
        </div>

        {/* Tab Navigation Pill Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b-2 border-black/10 scrollbar-none">
          {[
            { id: 'incoming', label: 'Incoming Requests', count: incomingOrders.length },
            { id: 'active', label: 'Active Laser Queue', count: activeOrders.length },
            { id: 'ready', label: 'Ready for Pickup', count: readyOrders.length },
            { id: 'history', label: 'Completed Orders', count: completedOrders.length },
            { id: 'pricing', label: 'Rate Card & Pricing', count: null },
            { id: 'settings', label: 'Shop Profile', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 h-9 px-4 rounded-full font-mono text-xs whitespace-nowrap transition-all border-2 ${
                activeTab === tab.id
                  ? 'bg-black text-white border-black shadow-sm'
                  : 'bg-white text-black border-black/30 hover:border-black'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === tab.id
                    ? 'bg-[#FF5A1F] text-white'
                    : 'bg-[#EAE6DF] text-black'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Incoming Orders (Pending Approval) */}
        {activeTab === 'incoming' && (
          <div className="space-y-4">
            {incomingOrders.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border-2 border-black">
                <p className="font-serif text-2xl text-black">No incoming requests right now.</p>
                <p className="font-mono text-xs text-black/60 mt-1">New student payloads will appear here in real time with audio alert.</p>
              </div>
            ) : (
              incomingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-6 rounded-3xl bg-white border-2 border-black shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xl font-bold text-[#FF5A1F]">
                        {order.order_number}
                      </span>
                      <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#FFE1D3] text-[#D9430F] font-bold uppercase border border-[#FFC2A8]">
                        Pending Approval
                      </span>
                      <span className="font-mono text-xs text-black/50">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-sans text-sm text-black font-semibold">
                      Student: {order.customer_name} ({order.customer_phone})
                    </div>

                    <div className="font-mono text-xs text-black/70 flex flex-wrap items-center gap-3">
                      <span className="font-bold">📄 {order.document.file_name}</span>
                      <span>•</span>
                      <span>{order.total_pages_to_print} pages to print</span>
                      <span>•</span>
                      <span>{order.copies} {order.copies === 1 ? 'copy' : 'copies'}</span>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded bg-black/5 font-bold">{order.color_mode.toUpperCase()}</span>
                      <span>•</span>
                      <span>{order.sides}</span>
                      <span>•</span>
                      <span>{order.binding_type}</span>
                    </div>

                    {order.special_instructions && (
                      <p className="font-mono text-xs text-black/80 bg-[#EAE6DF] p-3 rounded-2xl border border-black/20">
                        Note: "{order.special_instructions}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="text-right sm:mr-4 font-mono">
                      <div className="text-[10px] uppercase text-black/60 font-bold">Total Fare</div>
                      <div className="font-sans font-black text-2xl text-black">
                        ₹{order.total_price.toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setPreviewOrder(order);
                        setPreviewPage(1);
                        setPreviewScale(1.0);
                        setPreviewCanvasKey(k => k + 1);
                      }}
                      className="h-9 px-4 rounded-full border-2 border-black hover:bg-black hover:text-white bg-white font-mono font-bold text-xs text-black flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect PDF</span>
                    </button>

                    <button
                      onClick={() => setRejectingOrder(order)}
                      className="h-9 px-4 rounded-full border-2 border-rose-300 hover:bg-rose-500 hover:text-white font-mono font-bold text-xs text-rose-700 transition-all"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => handleAccept(order.id)}
                      className="h-9 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] font-mono font-bold text-xs text-white shadow-sm transition-all flex items-center justify-center gap-1.5 border-2 border-black"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept & Queue</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Active Laser Queue */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border-2 border-black">
                <p className="font-serif text-2xl text-black">Active laser queue is currently empty.</p>
                <p className="font-mono text-xs text-black/60 mt-1">Accept incoming jobs to move them to the printing press.</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-6 rounded-3xl bg-white border-2 border-black shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xl font-bold text-black">
                        {order.order_number}
                      </span>
                      <span className={`font-mono text-xs px-3 py-1 rounded-full uppercase font-bold border ${
                        order.status === 'printing'
                          ? 'bg-[#FFE1D3] text-[#D9430F] border-[#FFC2A8]'
                          : 'bg-[#EAE6DF] text-black border-black/30'
                      }`}>
                        {order.status === 'printing' ? '🖨️ In-Press Printing' : 'Queued for Press'}
                      </span>
                    </div>

                    <div className="font-sans text-sm text-black font-semibold">
                      Student: {order.customer_name} ({order.customer_phone})
                    </div>

                    <div className="font-mono text-xs text-black/70">
                      📄 {order.document.file_name} • {order.total_pages_to_print} pages • {order.color_mode.toUpperCase()} • {order.binding_type}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      onClick={() => {
                        setPreviewOrder(order);
                        setPreviewPage(1);
                        setPreviewScale(1.0);
                        setPreviewCanvasKey(k => k + 1);
                      }}
                      className="h-9 px-4 rounded-full border-2 border-black bg-white hover:bg-black hover:text-white font-mono font-bold text-xs text-black flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect PDF</span>
                    </button>

                    <button
                      onClick={() => handleTriggerPrint(order)}
                      className="h-9 px-4 rounded-full bg-black hover:bg-black/80 font-mono font-bold text-xs text-white shadow-sm flex items-center justify-center gap-1.5 border-2 border-black transition-all"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#FF5A1F]" />
                      <span>Direct Native Print</span>
                    </button>

                    <button
                      onClick={() => handleMarkReady(order.id)}
                      className="h-9 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] font-mono font-bold text-xs text-white shadow-sm flex items-center justify-center gap-1.5 border-2 border-black transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Ready for Pickup</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Ready for Pickup */}
        {activeTab === 'ready' && (
          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border-2 border-black">
                <p className="font-serif text-2xl text-black">No orders waiting for pickup.</p>
                <p className="font-mono text-xs text-black/60 mt-1">Completed jobs waiting for student collection will appear here.</p>
              </div>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-6 rounded-3xl bg-white border-2 border-black shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xl font-bold text-[#FF5A1F]">
                        {order.order_number}
                      </span>
                      <span className="font-mono text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-400 font-bold uppercase">
                        Ready at Counter
                      </span>
                    </div>

                    <div className="font-sans text-sm text-black font-semibold">
                      Student: {order.customer_name} ({order.customer_phone})
                    </div>

                    <div className="font-mono text-xs text-black/70">
                      {order.document.file_name} • {order.total_pages_to_print} pgs • Total: ₹{order.total_price.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setReceiptOrder(order)}
                      className="h-9 px-4 rounded-full border-2 border-black hover:bg-black hover:text-white font-mono font-bold text-xs text-black transition-all"
                    >
                      View Invoice
                    </button>

                    <button
                      onClick={() => handleMarkCompleted(order.id)}
                      className="h-9 px-5 rounded-full bg-black hover:bg-[#FF5A1F] font-mono font-bold text-xs text-white shadow-sm flex items-center gap-1.5 border-2 border-black transition-all"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Handed Over & Complete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Completed History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {completedOrders.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border-2 border-black">
                <p className="font-serif text-2xl text-black">No past orders archived yet.</p>
              </div>
            ) : (
              completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 rounded-3xl bg-white border-2 border-black flex items-center justify-between text-xs font-sans shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-base text-black">{order.order_number}</span>
                    <span className="text-black font-semibold">{order.customer_name}</span>
                    <span className="font-mono text-black/60 hidden sm:inline">{order.document.file_name}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-sm text-black">₹{order.total_price.toFixed(2)}</span>
                    <span className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full uppercase font-bold border ${
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-900 border-emerald-400' : 'bg-rose-100 text-rose-900 border-rose-300'
                    }`}>
                      {order.status}
                    </span>
                    <button
                      onClick={() => setReceiptOrder(order)}
                      className="text-[#FF5A1F] hover:underline font-mono font-bold"
                    >
                      Invoice
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Pricing Configuration */}
        {activeTab === 'pricing' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-black shadow-sm max-w-3xl space-y-6">
            <div>
              <h2 className="font-serif font-normal text-3xl text-black">Rate Card & Pricing Specs</h2>
              <p className="font-mono text-xs text-black/60 mt-1">
                Adjust your per-page laser rates and finishing fees. Updates apply immediately to student calculators.
              </p>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-900 font-mono text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700" />
                <span>Rate card updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSavePricing} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">
                    B&W Laser Rate (₹ / page)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={pricingForm.black_white_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, black_white_price: Number(e.target.value) })}
                    className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">
                    Vibrant Color Rate (₹ / page)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingForm.color_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, color_price: Number(e.target.value) })}
                    className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">
                    Double-Sided Discount (₹ / page)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pricingForm.double_sided_discount}
                    onChange={(e) => setPricingForm({ ...pricingForm, double_sided_discount: Number(e.target.value) })}
                    className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">
                    Spiral Binding Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={pricingForm.binding_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, binding_price: Number(e.target.value) })}
                    className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">
                    Corner Stapling Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={pricingForm.stapling_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, stapling_price: Number(e.target.value) })}
                    className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">
                    Cover Lamination Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={pricingForm.lamination_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, lamination_price: Number(e.target.value) })}
                    className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t-2 border-black/10">
                <button
                  type="submit"
                  className="h-11 px-7 rounded-full bg-black hover:bg-[#FF5A1F] text-white font-mono font-bold text-xs shadow-sm transition-all border-2 border-black"
                >
                  Save Rate Card Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 6: Shop Profile & Settings */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-black shadow-sm max-w-3xl space-y-6">
            <div>
              <h2 className="font-serif font-normal text-3xl text-black">Shop Profile & Availability</h2>
              <p className="font-mono text-xs text-black/60 mt-1">
                Manage shop identity, operating hours, and location for university students.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-900 font-mono text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700" />
                <span>Shop profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveShopSettings} className="space-y-4">
              <div>
                <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">Shop Name</label>
                <input
                  type="text"
                  value={shopSettings.shop_name}
                  onChange={(e) => setShopSettings({ ...shopSettings, shop_name: e.target.value })}
                  className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-sans text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                />
              </div>

              <div>
                <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">Tagline</label>
                <input
                  type="text"
                  value={shopSettings.tagline}
                  onChange={(e) => setShopSettings({ ...shopSettings, tagline: e.target.value })}
                  className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-sans text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={shopSettings.phone}
                    onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                    className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-mono text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={shopSettings.opening_hours}
                    onChange={(e) => setShopSettings({ ...shopSettings, opening_hours: e.target.value })}
                    className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-sans text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-xs uppercase text-black/70 font-bold block mb-1">Physical Address / Landmark</label>
                <input
                  type="text"
                  value={shopSettings.address}
                  onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                  className="w-full h-11 px-4 rounded-full border-2 border-black text-xs font-sans text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
                />
              </div>

              <div className="pt-4 border-t-2 border-black/10">
                <button
                  type="submit"
                  className="h-11 px-7 rounded-full bg-black hover:bg-[#FF5A1F] text-white font-mono font-bold text-xs shadow-sm transition-all border-2 border-black"
                >
                  Save Profile Settings
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* In-Browser PDF Document Inspector Canvas Modal */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border-2 border-black space-y-4 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#FF5A1F] uppercase">{previewOrder.order_number}</span>
                  <span className="font-sans font-bold text-sm text-black">{previewOrder.document.file_name}</span>
                </div>
                <div className="font-mono text-[11px] text-black/60">
                  Page {previewPage} of {previewOrder.document.page_count} • {previewOrder.color_mode.toUpperCase()} Laser
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTriggerPrint(previewOrder)}
                  className="h-8 px-4 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-sm border border-black"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Native Print</span>
                </button>

                <button
                  onClick={() => setPreviewOrder(null)}
                  className="p-1 rounded-full text-black/60 hover:text-black hover:bg-black/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Canvas Viewer Stage */}
            <div className="flex-1 overflow-auto bg-[#EAE6DF] rounded-2xl p-6 flex items-center justify-center min-h-[400px] border border-black/20">
              <canvas
                key={previewCanvasKey}
                ref={canvasRef}
                className="bg-white shadow-xl rounded-lg border-2 border-black max-w-full"
              />
            </div>

            {/* Bottom Controls: Zoom + Page Navigation */}
            <div className="flex items-center justify-between pt-2 border-t-2 border-black/10">
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={() => setPreviewScale(Math.max(0.6, previewScale - 0.2))}
                  className="h-7 px-2.5 rounded-full border border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="font-bold">{Math.round(previewScale * 100)}%</span>
                <button
                  onClick={() => setPreviewScale(Math.min(2.0, previewScale + 0.2))}
                  className="h-7 px-2.5 rounded-full border border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs font-bold">
                <button
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                  className="h-7 px-3 rounded-full border border-black bg-white text-black hover:bg-black hover:text-white disabled:opacity-40 transition-colors"
                >
                  Prev
                </button>
                <span>Page {previewPage} / {previewOrder.document.page_count}</span>
                <button
                  disabled={previewPage >= previewOrder.document.page_count}
                  onClick={() => setPreviewPage(Math.min(previewOrder.document.page_count, previewPage + 1))}
                  className="h-7 px-3 rounded-full border border-black bg-white text-black hover:bg-black hover:text-white disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-black space-y-4">
            <h3 className="font-serif font-normal text-2xl text-black">
              Reject Order {rejectingOrder.order_number}
            </h3>
            <p className="font-mono text-xs text-black/70">
              Specify a clear reason so the student understands why the job was rejected:
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-2xl border-2 border-black font-sans text-xs text-black focus:outline-none focus:ring-2 focus:ring-[#FF5A1F]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingOrder(null)}
                className="h-8 px-4 rounded-full border border-black font-mono font-bold text-xs text-black hover:bg-black/10"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="h-8 px-4 rounded-full bg-rose-600 hover:bg-rose-700 font-mono font-bold text-xs text-white border border-black"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};
