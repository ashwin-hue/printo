import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, 
  DollarSign, 
  Clock, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Eye, 
  AlertCircle, 
  Settings, 
  Tag, 
  Sliders, 
  TrendingUp, 
  Layers, 
  Search, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ArrowLeft, 
  Sparkles,
  Phone,
  User,
  ShieldCheck,
  Check,
  X
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
  // Target the primary shop for this owner
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

  // Render canvas when preview modal opens or page/scale changes
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
    <div className="py-10 bg-dot-subtle min-h-[calc(100vh-80px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header & Status Indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-xs font-bold uppercase text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                Authorized Shop Owner Portal
              </span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight mt-1">
              {shop.shop_name}
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Hub ID: {shop.id} • Terminal: Laser Console 01
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Accepting Orders</span>
                <span className="text-xs font-bold text-emerald-700">Online & Live</span>
              </div>
              <button
                onClick={() => {
                  const updated = { ...shop, accepting_orders: !shop.accepting_orders };
                  updateShop(updated);
                  setShopSettings(updated);
                }}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
                  shop.accepting_orders ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  shop.accepting_orders ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Daily Stats KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Today's Revenue</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                ₹
              </div>
            </div>
            <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mt-3">
              ₹{stats.today_revenue.toFixed(2)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              ↑ 18% higher than yesterday
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Incoming Pending</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mt-3">
              {incomingOrders.length}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Awaiting your approval
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Active In-Press</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Printer className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mt-3">
              {activeOrders.length}
            </h3>
            <p className="text-[11px] text-indigo-600 font-medium mt-1">
              Currently queued / printing
            </p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-premium">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase">Ready for Pickup</span>
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 mt-3">
              {readyOrders.length}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Waiting at front desk counter
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
          {[
            { id: 'incoming', label: 'Incoming Requests', count: incomingOrders.length },
            { id: 'active', label: 'Active Laser Queue', count: activeOrders.length },
            { id: 'ready', label: 'Ready for Pickup', count: readyOrders.length },
            { id: 'history', label: 'Completed Orders', count: completedOrders.length },
            { id: 'pricing', label: 'Pricing Configuration', count: null },
            { id: 'settings', label: 'Business Profile', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
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
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
                <p className="text-slate-400 text-sm">No incoming print requests right now.</p>
                <p className="text-slate-400 text-xs mt-1">New orders submitted by students will appear here in real time.</p>
              </div>
            ) : (
              incomingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium hover:shadow-premium-hover transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-base text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                        {order.order_number}
                      </span>
                      <div>
                        <strong className="text-sm text-slate-900">{order.customer_name}</strong>
                        <span className="text-xs font-mono text-slate-400 ml-2">{order.customer_phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        Submitted: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        PENDING REVIEW
                      </span>
                    </div>
                  </div>

                  {/* Order Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-mono block">Document</span>
                      <strong className="text-slate-900 truncate block mt-0.5">{order.document.file_name}</strong>
                      <span className="text-slate-500 font-mono text-[10px]">{order.document.page_count} pages • {order.copies} copy</span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-mono block">Print Mode</span>
                      <strong className="text-slate-900 block mt-0.5">
                        {order.color_mode === 'bw' ? 'B&W Laser' : 'Color Gloss'} ({order.sides})
                      </strong>
                      <span className="text-slate-500 font-mono text-[10px]">{order.paper_size} • {order.orientation}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-mono block">Finishing</span>
                      <strong className="text-slate-900 block mt-0.5 capitalize">{order.binding_type} Binding</strong>
                      <span className="text-slate-500 text-[10px]">{order.lamination ? 'With Lamination' : 'Standard covers'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-mono block">Calculated Price</span>
                      <strong className="text-brand-700 text-base font-display font-black block mt-0.5">
                        ₹{order.total_price.toFixed(2)}
                      </strong>
                      <span className="text-emerald-600 text-[10px] font-semibold">Pre-approved</span>
                    </div>
                  </div>

                  {order.special_instructions && (
                    <div className="text-xs bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl text-amber-900">
                      <strong>Customer Note:</strong> "{order.special_instructions}"
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => {
                        setPreviewOrder(order);
                        setPreviewPage(1);
                        setPreviewCanvasKey(prev => prev + 1);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-brand-600" />
                      <span>Preview PDF in Browser</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRejectingOrder(order)}
                        className="px-4 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors"
                      >
                        Reject Job
                      </button>

                      <button
                        onClick={() => handleAccept(order.id)}
                        className="px-6 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand-700/20 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Accept & Queue</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Active Laser Queue (Accepted / Printing) */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
                <p className="text-slate-400 text-sm">No jobs currently in the laser press queue.</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-base text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                        {order.order_number}
                      </span>
                      <div>
                        <strong className="text-sm text-slate-900">{order.customer_name}</strong>
                        <span className="text-xs font-mono text-slate-400 ml-2">{order.customer_phone}</span>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                      order.status === 'printing'
                        ? 'bg-indigo-100 text-indigo-800 animate-pulse'
                        : 'bg-brand-100 text-brand-800'
                    }`}>
                      ● {order.status === 'printing' ? 'RUNNING ON LASER PRESS' : 'ACCEPTED IN QUEUE'}
                    </span>
                  </div>

                  {/* Specs & Quick Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-900">{order.document.file_name}</p>
                      <p className="text-slate-600 font-mono">
                        {order.total_pages_to_print} total impressions • {order.paper_size} {order.sides} • {order.binding_type}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setPreviewOrder(order);
                          setPreviewPage(1);
                        }}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 flex items-center gap-1.5"
                      >
                        <Eye className="w-4 h-4 text-brand-600" />
                        <span>Preview</span>
                      </button>

                      <button
                        onClick={() => handleTriggerPrint(order)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Send to Printer</span>
                      </button>

                      {order.status === 'accepted' ? (
                        <button
                          onClick={() => handleStartPrinting(order.id)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                        >
                          Start Printing
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkReady(order.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Ready for Pickup</span>
                        </button>
                      )}
                    </div>
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
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
                <p className="text-slate-400 text-sm">No documents waiting for customer pickup.</p>
              </div>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-premium flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-base text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl">
                        TOKEN #{order.order_number.replace('PRN-', '')}
                      </span>
                      <strong className="text-slate-900">{order.customer_name}</strong>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      {order.document.file_name} • {order.binding_type} binding • ₹{order.total_price.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReceiptOrder(order)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Print Invoice
                    </button>

                    <button
                      onClick={() => handleMarkCompleted(order.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Check className="w-4 h-4" />
                      <span>Handed Over & Completed</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Order History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-premium">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Document</th>
                    <th className="p-4">Pages/Copies</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-bold text-slate-900">{ord.order_number}</td>
                      <td className="p-4 font-medium text-slate-900">{ord.customer_name}</td>
                      <td className="p-4 text-slate-600 truncate max-w-[180px]">{ord.document.file_name}</td>
                      <td className="p-4 font-mono text-slate-600">{ord.total_pages_to_print} pgs</td>
                      <td className="p-4 font-mono font-bold text-slate-900">₹{ord.total_price.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          ord.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setReceiptOrder(ord)}
                          className="text-brand-700 hover:underline font-semibold"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Pricing Configuration */}
        {activeTab === 'pricing' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-premium max-w-3xl space-y-6">
            <div>
              <h3 className="font-display font-extrabold text-xl text-slate-900">
                Configure Printing Rates & Fees
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These rates are automatically applied to all customer orders assigned to your shop.
              </p>
            </div>

            {saveSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Pricing rates successfully saved and published!</span>
              </div>
            )}

            <form onSubmit={handleSavePricing} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1.5">
                    Black & White Rate (Per Page)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">₹</span>
                    <input
                      type="number"
                      step="0.25"
                      value={pricingForm.black_white_price}
                      onChange={(e) => setPricingForm({ ...pricingForm, black_white_price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1.5">
                    Vibrant Color Rate (Per Page)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      value={pricingForm.color_price}
                      onChange={(e) => setPricingForm({ ...pricingForm, color_price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1.5">
                    Spiral Binding Base Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">₹</span>
                    <input
                      type="number"
                      step="1"
                      value={pricingForm.binding_price}
                      onChange={(e) => setPricingForm({ ...pricingForm, binding_price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1.5">
                    Corner Stapling Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">₹</span>
                    <input
                      type="number"
                      step="1"
                      value={pricingForm.stapling_price}
                      onChange={(e) => setPricingForm({ ...pricingForm, stapling_price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1.5">
                    Double-Sided Per Page Discount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">₹</span>
                    <input
                      type="number"
                      step="0.1"
                      value={pricingForm.double_sided_discount}
                      onChange={(e) => setPricingForm({ ...pricingForm, double_sided_discount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1.5">
                    Thermal Lamination (Per set)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">₹</span>
                    <input
                      type="number"
                      step="1"
                      value={pricingForm.lamination_price}
                      onChange={(e) => setPricingForm({ ...pricingForm, lamination_price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs uppercase tracking-wider shadow-md"
                >
                  Save New Price Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 6: Shop Profile & Settings */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-premium max-w-3xl space-y-6">
            <div>
              <h3 className="font-display font-extrabold text-xl text-slate-900">
                Shop Profile & Operating Hours
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update customer-facing details, address, phone number, and turnaround times.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>Shop profile updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveShopSettings} className="space-y-4">
              <div>
                <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1">
                  Business / Shop Name
                </label>
                <input
                  type="text"
                  value={shopSettings.shop_name}
                  onChange={(e) => setShopSettings({ ...shopSettings, shop_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1">
                  Physical Address & Location Landmark
                </label>
                <input
                  type="text"
                  value={shopSettings.address}
                  onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1">
                    Direct Contact Phone
                  </label>
                  <input
                    type="text"
                    value={shopSettings.phone}
                    onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-600 block mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={shopSettings.opening_hours}
                    onChange={(e) => setShopSettings({ ...shopSettings, opening_hours: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider"
                >
                  Update Profile Details
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* CORE FEATURE: In-Browser Document Preview & Printing Modal */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
            
            {/* Modal Header Bar */}
            <div className="p-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-sm sm:text-base truncate max-w-xs sm:max-w-md">
                      {previewOrder.document.file_name}
                    </h3>
                    <span className="font-mono text-xs text-brand-300 bg-brand-900/50 px-2 py-0.5 rounded border border-brand-700/50">
                      {previewOrder.order_number}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Customer: {previewOrder.customer_name} • {previewOrder.color_mode.toUpperCase()} • {previewOrder.paper_size} ({previewOrder.sides}) • {previewOrder.binding_type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTriggerPrint(previewOrder)}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand-600/30"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document Now</span>
                </button>

                <button
                  onClick={() => setPreviewOrder(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Subheader Controls (Zoom, Multi-page navigation) */}
            <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
              {/* Multi-page controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                  disabled={previewPage <= 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 font-bold"
                >
                  Prev
                </button>
                <span className="font-mono px-2">
                  Page <strong className="text-white">{previewPage}</strong> of {previewOrder.document.page_count}
                </span>
                <button
                  onClick={() => setPreviewPage(Math.min(previewOrder.document.page_count, previewPage + 1))}
                  disabled={previewPage >= previewOrder.document.page_count}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 font-bold"
                >
                  Next
                </button>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewScale(Math.max(0.6, previewScale - 0.2))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 text-slate-300" />
                </button>
                <span className="font-mono text-[11px] text-slate-400 w-12 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <button
                  onClick={() => setPreviewScale(Math.min(2.0, previewScale + 0.2))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 text-slate-300" />
                </button>
                <button
                  onClick={() => setPreviewScale(1.0)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Document Canvas Viewport */}
            <div className="flex-1 bg-slate-950 p-6 overflow-auto flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-2xl p-1 inline-block border border-slate-700">
                <canvas ref={canvasRef} className="block max-w-full" />
              </div>
            </div>

            {/* Preview Modal Bottom Action Bar */}
            <div className="p-4 px-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-400">
                Finishing specs: <strong>{previewOrder.copies}x copy</strong> • {previewOrder.binding_type} • {previewOrder.lamination ? 'Laminated' : 'Standard'}
              </span>

              <div className="flex items-center gap-2">
                {previewOrder.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleAccept(previewOrder.id);
                      setPreviewOrder(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold"
                  >
                    Accept Order
                  </button>
                )}
                {previewOrder.status === 'accepted' && (
                  <button
                    onClick={() => {
                      handleStartPrinting(previewOrder.id);
                      setPreviewOrder(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    Start Laser Printing
                  </button>
                )}
                {previewOrder.status === 'printing' && (
                  <button
                    onClick={() => {
                      handleMarkReady(previewOrder.id);
                      setPreviewOrder(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Mark Ready for Pickup
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Rejection Prompt Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-display font-bold text-lg text-slate-900">
              Reject Order {rejectingOrder.order_number}?
            </h3>
            <p className="text-xs text-slate-600">
              Please state a reason so the customer understands why the job could not be fulfilled:
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}

    </div>
  );
};
