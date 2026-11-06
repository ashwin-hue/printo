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

export const ShopOwnerDashboard: React.FC = () => {
  const user = getCurrentUser();
  const shops = getShops();
  const shop = shops.find(s => s.owner_id === user.id) || shops[0];
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'incoming' | 'active' | 'ready' | 'history' | 'pricing' | 'settings'>('incoming');
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
    <div className="py-12 bg-[#EEF0F2] text-[#0F1115] min-h-[calc(100vh-64px)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw] space-y-8">
        
        {/* Header & Status Indicator */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#C4C9CF]/60">
          <div>
            <div className="font-mono font-medium text-[11.5px] tracking-[0.06em] uppercase text-[#2A2E35] flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
              HARDWARE DISPATCH CONSOLE // TERMINAL 01
            </div>
            <h1 className="font-serif font-normal text-3xl sm:text-5xl tracking-[-0.025em] text-[#0F1115]">
              {shop.shop_name}.<br />
              <em className="italic text-[#0F1115]/90">Live queue management & rate card.</em>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-full border border-[#C4C9CF] flex items-center gap-3">
              <div className="text-right font-mono">
                <span className="text-[10px] text-[#7A7F88] uppercase block">Station Status</span>
                <span className="text-xs font-bold text-[#FF5A1F]">
                  {shop.accepting_orders ? 'Online & Ready' : 'Paused'}
                </span>
              </div>
              <button
                onClick={() => {
                  const updated = { ...shop, accepting_orders: !shop.accepting_orders };
                  updateShop(updated);
                  setShopSettings(updated);
                }}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                  shop.accepting_orders ? 'bg-[#FF5A1F]' : 'bg-[#C4C9CF]'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                  shop.accepting_orders ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Daily Stats KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#C4C9CF] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#7A7F88]">Today's Revenue</span>
              <span className="font-mono text-xs text-[#FF5A1F] font-bold">₹</span>
            </div>
            <div className="font-sans font-light text-3xl sm:text-4xl text-[#0F1115] mt-2 tracking-tight">
              ₹{stats.today_revenue.toFixed(2)}
            </div>
            <p className="font-mono text-[10px] text-emerald-600 mt-1">
              ↑ 18% higher than yesterday
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#C4C9CF] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#7A7F88]">Pending Approval</span>
              <Clock className="w-3.5 h-3.5 text-[#FF5A1F]" />
            </div>
            <div className="font-sans font-light text-3xl sm:text-4xl text-[#0F1115] mt-2 tracking-tight">
              {incomingOrders.length}
            </div>
            <p className="font-mono text-[10px] text-[#7A7F88] mt-1">
              Incoming student payloads
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#C4C9CF] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#7A7F88]">Active In-Press</span>
              <Printer className="w-3.5 h-3.5 text-[#FF5A1F]" />
            </div>
            <div className="font-sans font-light text-3xl sm:text-4xl text-[#0F1115] mt-2 tracking-tight">
              {activeOrders.length}
            </div>
            <p className="font-mono text-[10px] text-[#7A7F88] mt-1">
              Currently running on laser
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#C4C9CF] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#7A7F88]">Ready for Pickup</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="font-sans font-light text-3xl sm:text-4xl text-[#0F1115] mt-2 tracking-tight">
              {readyOrders.length}
            </div>
            <p className="font-mono text-[10px] text-[#7A7F88] mt-1">
              At 30-sec express counter
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#C4C9CF]/60 scrollbar-none">
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
              className={`flex items-center gap-2 h-9 px-4 rounded-full font-mono text-xs whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#0F1115] text-white shadow-sm'
                  : 'bg-white text-[#2A2E35] border border-[#C4C9CF] hover:border-[#8B9098]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? 'bg-[#FF5A1F] text-white'
                    : 'bg-[#EEF0F2] text-[#2A2E35]'
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
              <div className="py-16 text-center bg-white rounded-3xl border border-[#C4C9CF]">
                <p className="font-serif text-xl text-[#0F1115]">No incoming requests right now.</p>
                <p className="font-sans text-xs text-[#7A7F88] mt-1">New student payloads will appear here in real time.</p>
              </div>
            ) : (
              incomingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-6 rounded-2xl bg-white border border-[#C4C9CF] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-[#FF5A1F] transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-[#FF5A1F]">
                        {order.order_number}
                      </span>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#FFE1D3] text-[#D9430F] font-bold uppercase">
                        Pending Approval
                      </span>
                      <span className="font-mono text-xs text-[#8B9098]">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-sans text-sm text-[#0F1115] font-medium">
                      Student: {order.customer_name} ({order.customer_phone})
                    </div>

                    <div className="font-mono text-xs text-[#7A7F88] flex flex-wrap items-center gap-3">
                      <span>📄 {order.document.file_name}</span>
                      <span>•</span>
                      <span>{order.total_pages_to_print} pages to print</span>
                      <span>•</span>
                      <span>{order.copies} {order.copies === 1 ? 'copy' : 'copies'}</span>
                      <span>•</span>
                      <span>{order.color_mode.toUpperCase()}</span>
                      <span>•</span>
                      <span>{order.sides}</span>
                      <span>•</span>
                      <span>{order.binding_type}</span>
                    </div>

                    {order.special_instructions && (
                      <p className="font-mono text-xs text-[#7A7F88] bg-[#EEF0F2] p-2.5 rounded-xl border border-[#C4C9CF]">
                        Note: "{order.special_instructions}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="text-right sm:mr-4 font-mono">
                      <div className="text-[10px] uppercase text-[#8B9098]">Order Value</div>
                      <div className="font-sans font-light text-2xl text-[#0F1115]">
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
                      className="h-9 px-4 rounded-full border border-[#C4C9CF] hover:border-[#0F1115] bg-white font-sans font-medium text-xs text-[#0F1115] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect PDF</span>
                    </button>

                    <button
                      onClick={() => setRejectingOrder(order)}
                      className="h-9 px-4 rounded-full border border-rose-200 hover:bg-rose-50 font-sans font-medium text-xs text-rose-600 transition-colors"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => handleAccept(order.id)}
                      className="h-9 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] font-sans font-medium text-xs text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
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
              <div className="py-16 text-center bg-white rounded-3xl border border-[#C4C9CF]">
                <p className="font-serif text-xl text-[#0F1115]">Active laser queue is currently empty.</p>
                <p className="font-sans text-xs text-[#7A7F88] mt-1">Accept incoming jobs to move them to the printing press.</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-6 rounded-2xl bg-white border border-[#C4C9CF] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-[#0F1115]">
                        {order.order_number}
                      </span>
                      <span className={`font-mono text-xs px-2.5 py-0.5 rounded-full uppercase font-bold ${
                        order.status === 'printing'
                          ? 'bg-[#FFE1D3] text-[#D9430F]'
                          : 'bg-[#EEF0F2] text-[#2A2E35]'
                      }`}>
                        {order.status === 'printing' ? '🖨️ In-Press Printing' : 'Queued'}
                      </span>
                    </div>

                    <div className="font-sans text-sm text-[#0F1115] font-medium">
                      Student: {order.customer_name} ({order.customer_phone})
                    </div>

                    <div className="font-mono text-xs text-[#7A7F88]">
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
                      className="h-9 px-4 rounded-full border border-[#C4C9CF] bg-white font-sans font-medium text-xs text-[#0F1115] flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect PDF</span>
                    </button>

                    <button
                      onClick={() => handleTriggerPrint(order)}
                      className="h-9 px-4 rounded-full bg-[#0F1115] hover:bg-black font-sans font-medium text-xs text-white shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#FF5A1F]" />
                      <span>Direct Native Print</span>
                    </button>

                    <button
                      onClick={() => handleMarkReady(order.id)}
                      className="h-9 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] font-sans font-medium text-xs text-white shadow-sm flex items-center justify-center gap-1.5"
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
              <div className="py-16 text-center bg-white rounded-3xl border border-[#C4C9CF]">
                <p className="font-serif text-xl text-[#0F1115]">No orders waiting for pickup.</p>
                <p className="font-sans text-xs text-[#7A7F88] mt-1">Completed jobs waiting for student collection will appear here.</p>
              </div>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-6 rounded-2xl bg-white border border-[#C4C9CF] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xl font-bold text-[#FF5A1F]">
                        {order.order_number}
                      </span>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                        Ready at Counter
                      </span>
                    </div>

                    <div className="font-sans text-sm text-[#0F1115] font-medium">
                      Student: {order.customer_name} ({order.customer_phone})
                    </div>

                    <div className="font-mono text-xs text-[#7A7F88]">
                      {order.document.file_name} • {order.total_pages_to_print} pgs • Total: ₹{order.total_price.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setReceiptOrder(order)}
                      className="h-9 px-4 rounded-full border border-[#C4C9CF] font-sans font-medium text-xs text-[#0F1115]"
                    >
                      View Invoice
                    </button>

                    <button
                      onClick={() => handleMarkCompleted(order.id)}
                      className="h-9 px-5 rounded-full bg-[#0F1115] hover:bg-black font-sans font-medium text-xs text-white shadow-sm flex items-center gap-1.5"
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
              <div className="py-16 text-center bg-white rounded-3xl border border-[#C4C9CF]">
                <p className="font-serif text-xl text-[#0F1115]">No past orders archived yet.</p>
              </div>
            ) : (
              completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl bg-white border border-[#C4C9CF] flex items-center justify-between text-xs font-sans"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-sm text-[#0F1115]">{order.order_number}</span>
                    <span className="text-[#2A2E35]">{order.customer_name}</span>
                    <span className="font-mono text-[#8B9098] hidden sm:inline">{order.document.file_name}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-medium text-[#0F1115]">₹{order.total_price.toFixed(2)}</span>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase ${
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {order.status}
                    </span>
                    <button
                      onClick={() => setReceiptOrder(order)}
                      className="text-[#FF5A1F] hover:underline font-mono"
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#C4C9CF] shadow-sm max-w-3xl space-y-6">
            <div>
              <h2 className="font-serif font-normal text-2xl text-[#0F1115]">Rate Card & Pricing Specs</h2>
              <p className="font-sans text-xs text-[#7A7F88] mt-0.5">
                Adjust your per-page laser rates and finishing fees. Updates apply immediately to student calculators.
              </p>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-sans text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Rate card updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSavePricing} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">
                    B&W Laser Rate (₹ / page)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={pricingForm.black_white_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, black_white_price: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-mono text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">
                    Vibrant Color Rate (₹ / page)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingForm.color_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, color_price: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-mono text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">
                    Double-Sided Discount (₹ / page)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pricingForm.double_sided_discount}
                    onChange={(e) => setPricingForm({ ...pricingForm, double_sided_discount: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-mono text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">
                    Spiral Binding Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={pricingForm.binding_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, binding_price: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-mono text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">
                    Corner Stapling Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={pricingForm.stapling_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, stapling_price: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-mono text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">
                    Cover Lamination Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={pricingForm.lamination_price}
                    onChange={(e) => setPricingForm({ ...pricingForm, lamination_price: Number(e.target.value) })}
                    className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-mono text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#EEF0F2]">
                <button
                  type="submit"
                  className="h-10 px-6 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-sans font-medium text-xs shadow-sm transition-all"
                >
                  Save Rate Card Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 6: Shop Profile & Settings */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#C4C9CF] shadow-sm max-w-3xl space-y-6">
            <div>
              <h2 className="font-serif font-normal text-2xl text-[#0F1115]">Shop Profile & Availability</h2>
              <p className="font-sans text-xs text-[#7A7F88] mt-0.5">
                Manage shop identity, operating hours, and location for university students.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-sans text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Shop profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveShopSettings} className="space-y-4">
              <div>
                <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">Shop Name</label>
                <input
                  type="text"
                  value={shopSettings.shop_name}
                  onChange={(e) => setShopSettings({ ...shopSettings, shop_name: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-sans text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>

              <div>
                <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">Tagline</label>
                <input
                  type="text"
                  value={shopSettings.tagline}
                  onChange={(e) => setShopSettings({ ...shopSettings, tagline: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-sans text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={shopSettings.phone}
                    onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-mono text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={shopSettings.opening_hours}
                    onChange={(e) => setShopSettings({ ...shopSettings, opening_hours: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-sans text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-1">Physical Address / Landmark</label>
                <input
                  type="text"
                  value={shopSettings.address}
                  onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-full border border-[#C4C9CF] text-xs font-sans text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>

              <div className="pt-4 border-t border-[#EEF0F2]">
                <button
                  type="submit"
                  className="h-10 px-6 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-sans font-medium text-xs shadow-sm transition-all"
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
        <div className="fixed inset-0 z-50 bg-[#0F1115]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-[#C4C9CF] space-y-4 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EEF0F2] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#FF5A1F] uppercase">{previewOrder.order_number}</span>
                  <span className="font-sans font-medium text-sm text-[#0F1115]">{previewOrder.document.file_name}</span>
                </div>
                <div className="font-mono text-[11px] text-[#7A7F88]">
                  Page {previewPage} of {previewOrder.document.page_count} • {previewOrder.color_mode.toUpperCase()} Laser
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTriggerPrint(previewOrder)}
                  className="h-8 px-3.5 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-sans font-medium text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Native Print</span>
                </button>

                <button
                  onClick={() => setPreviewOrder(null)}
                  className="p-1 rounded-full text-[#8B9098] hover:text-[#0F1115] hover:bg-[#EEF0F2]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Canvas Viewer Stage */}
            <div className="flex-1 overflow-auto bg-[#EEF0F2] rounded-2xl p-6 flex items-center justify-center min-h-[400px]">
              <canvas
                key={previewCanvasKey}
                ref={canvasRef}
                className="bg-white shadow-xl rounded-lg border border-[#C4C9CF] max-w-full"
              />
            </div>

            {/* Bottom Controls: Zoom + Page Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-[#EEF0F2]">
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={() => setPreviewScale(Math.max(0.6, previewScale - 0.2))}
                  className="h-7 px-2.5 rounded-full border border-[#C4C9CF] bg-white text-[#2A2E35] hover:bg-[#EEF0F2]"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span>{Math.round(previewScale * 100)}%</span>
                <button
                  onClick={() => setPreviewScale(Math.min(2.0, previewScale + 0.2))}
                  className="h-7 px-2.5 rounded-full border border-[#C4C9CF] bg-white text-[#2A2E35] hover:bg-[#EEF0F2]"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                  className="h-7 px-3 rounded-full border border-[#C4C9CF] bg-white text-[#2A2E35] disabled:opacity-40"
                >
                  Prev
                </button>
                <span>Page {previewPage} / {previewOrder.document.page_count}</span>
                <button
                  disabled={previewPage >= previewOrder.document.page_count}
                  onClick={() => setPreviewPage(Math.min(previewOrder.document.page_count, previewPage + 1))}
                  className="h-7 px-3 rounded-full border border-[#C4C9CF] bg-white text-[#2A2E35] disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 bg-[#0F1115]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#C4C9CF] space-y-4">
            <h3 className="font-serif font-normal text-xl text-[#0F1115]">
              Reject Order {rejectingOrder.order_number}
            </h3>
            <p className="font-sans text-xs text-[#7A7F88]">
              Specify a clear reason so the student understands why the job was rejected:
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#C4C9CF] font-sans text-xs text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingOrder(null)}
                className="h-8 px-4 rounded-full border border-[#C4C9CF] font-sans text-xs text-[#2A2E35]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="h-8 px-4 rounded-full bg-rose-600 hover:bg-rose-700 font-sans text-xs text-white"
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
