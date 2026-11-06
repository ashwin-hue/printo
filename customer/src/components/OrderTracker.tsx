import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Phone, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Receipt, 
  X, 
  ArrowRight,
  ExternalLink,
  Printer,
  ChevronRight,
  Sparkles,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { getOrders, updateOrderStatus, getCurrentUser, getShopById } from '../services/storage';
import { Order, OrderStatus } from '../types';
import { ReceiptModal } from './ReceiptModal';

interface OrderTrackerProps {
  highlightOrderId?: string;
  onNewOrder: () => void;
  onViewShop: (shopId: string) => void;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({
  highlightOrderId,
  onNewOrder,
  onViewShop
}) => {
  const user = getCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(highlightOrderId || null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const loadOrders = () => {
    const all = getOrders();
    const userOrders = all.filter(o => o.customer_id === user.id);
    setOrders(userOrders);
    if (!selectedOrderId && userOrders.length > 0) {
      setSelectedOrderId(userOrders[0].id);
    }
  };

  useEffect(() => {
    loadOrders();
    const handleUpdate = () => loadOrders();
    window.addEventListener('printo_storage_update', handleUpdate);
    return () => window.removeEventListener('printo_storage_update', handleUpdate);
  }, [user.id]);

  useEffect(() => {
    if (highlightOrderId) {
      setSelectedOrderId(highlightOrderId);
    }
  }, [highlightOrderId]);

  const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0];
  const shop = activeOrder ? getShopById(activeOrder.shop_id) : null;

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this print order?')) {
      updateOrderStatus(orderId, 'cancelled');
    }
  };

  // Step index calculation for progress bar
  const getStepStatus = (status: OrderStatus) => {
    const steps: { label: string; desc: string; icon: string }[] = [
      { label: 'Submitted', desc: 'Order placed & awaiting shop review', icon: '📝' },
      { label: 'Accepted', desc: 'Shop verified & queued in laser queue', icon: '⚡' },
      { label: 'Printing', desc: 'Running on high-speed press', icon: '🖨️' },
      { label: 'Ready for Pickup', desc: 'Bound and waiting at express counter', icon: '🎉' },
      { label: 'Completed', desc: 'Collected by student', icon: '✨' },
    ];

    let currentIdx = 0;
    if (status === 'pending') currentIdx = 0;
    else if (status === 'accepted') currentIdx = 1;
    else if (status === 'printing') currentIdx = 2;
    else if (status === 'ready') currentIdx = 3;
    else if (status === 'completed') currentIdx = 4;
    else if (status === 'cancelled' || status === 'rejected') currentIdx = -1;

    return { steps, currentIdx };
  };

  if (orders.length === 0) {
    return (
      <div className="py-20 text-center max-w-lg mx-auto px-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="font-display font-extrabold text-2xl text-slate-900">No Orders in Flight</h2>
        <p className="text-slate-500 text-xs mt-1 mb-6">
          You haven't submitted any print jobs yet. Drop your academic documents to eliminate counter queues.
        </p>
        <button
          onClick={onNewOrder}
          className="px-6 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-700/20"
        >
          Start a New Print Job
        </button>
      </div>
    );
  }

  const { steps, currentIdx } = getStepStatus(activeOrder.status);

  return (
    <div className="py-10 bg-dot-subtle min-h-[calc(100vh-80px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Live Order Telemetry
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
              Real-Time Order Tracking
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewOrder}
              className="px-4 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand-700/20"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Submit Another Print</span>
            </button>
          </div>
        </div>

        {/* Order Selector Pills if multiple orders */}
        {orders.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {orders.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                  activeOrder.id === o.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{o.order_number}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                  o.status === 'ready' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'
                }`}>
                  {o.status}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main Tracker Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Progress lifecycle & pickup pass */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Status card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-premium space-y-8">
              
              {/* Order identifier and status chip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display font-black text-2xl text-slate-900">
                      {activeOrder.order_number}
                    </h2>
                    <span className="text-xs font-mono text-slate-400">
                      Placed at {new Date(activeOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    {activeOrder.document.file_name} • {activeOrder.copies} copy ({activeOrder.total_pages_to_print} pages total)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    activeOrder.status === 'ready'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse'
                      : activeOrder.status === 'printing'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : activeOrder.status === 'accepted'
                          ? 'bg-brand-100 text-brand-800'
                          : activeOrder.status === 'completed'
                            ? 'bg-slate-100 text-slate-700'
                            : activeOrder.status === 'rejected' || activeOrder.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                  }`}>
                    ● {activeOrder.status.replace('_', ' ')}
                  </span>

                  <button
                    onClick={() => setReceiptOrder(activeOrder)}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                    title="View & Print Official Receipt"
                  >
                    <Receipt className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Steps Indicator */}
              {currentIdx >= 0 ? (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="hidden sm:block absolute top-5 left-8 right-8 h-1 bg-slate-100 -z-0">
                      <div
                        className="h-full bg-brand-600 transition-all duration-700"
                        style={{ width: `${(currentIdx / (steps.length - 1)) * 100}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                      {steps.map((st, i) => {
                        const isDone = i <= currentIdx;
                        const isCurrent = i === currentIdx;

                        return (
                          <div key={i} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm transition-all ${
                              isDone
                                ? 'bg-brand-700 text-white shadow-brand-700/20'
                                : 'bg-slate-100 text-slate-400'
                            } ${isCurrent ? 'ring-4 ring-brand-100 scale-110' : ''}`}>
                              {isDone ? (isCurrent ? st.icon : '✓') : i + 1}
                            </div>
                            <div>
                              <p className={`text-xs font-bold leading-tight ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                                {st.label}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5 sm:max-w-[120px] mx-auto leading-tight">
                                {st.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estimated Pickup Notice Banner */}
                  <div className="p-4 rounded-2xl bg-brand-50/60 border border-brand-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                        ⚡
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-brand-700 uppercase font-bold">Estimated Turnaround</span>
                        <p className="font-bold text-xs sm:text-sm text-slate-900">
                          {activeOrder.estimated_pickup_time || 'Calculating queue ETA...'}
                        </p>
                      </div>
                    </div>

                    {activeOrder.status === 'ready' && (
                      <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold animate-bounce">
                        Counter Token #{activeOrder.order_number.replace('PRN-', '')}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <p className="font-bold">This order is {activeOrder.status}.</p>
                  <p className="mt-1">{activeOrder.rejection_reason || 'Order was stopped.'}</p>
                </div>
              )}

              {/* Express Pickup Pass Card */}
              {activeOrder.status === 'ready' && (
                <div className="p-6 rounded-3xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                        EXPRESS COUNTER PASS
                      </span>
                      <h3 className="font-display font-extrabold text-xl mt-0.5">Ready for Collection</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <QrCode className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-300 block">Flash This Token to Operator:</span>
                      <strong className="font-mono text-2xl font-black tracking-widest text-emerald-300">
                        {activeOrder.order_number}
                      </strong>
                    </div>
                    <span className="text-xs bg-emerald-500 text-slate-950 font-bold px-3 py-1 rounded-full font-mono">
                      CONFIRMED
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Walk to <strong>{activeOrder.shop_name}</strong> express counter. Your documents are printed, bound, and waiting. Zero queue required.
                  </p>
                </div>
              )}

              {/* Cancel Button if still Pending */}
              {activeOrder.status === 'pending' && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleCancelOrder(activeOrder.id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel this pending order</span>
                  </button>
                </div>
              )}

            </div>

          </div>

          {/* Right Column: Shop & Order Details */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Shop Details Card */}
            {shop && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium space-y-4">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                  Printing Shop Vendor
                </span>

                <div className="space-y-1">
                  <h3 className="font-display font-extrabold text-base text-slate-900">{shop.shop_name}</h3>
                  <p className="text-xs text-slate-500">{shop.address}</p>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>{shop.distance} from your dorm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>{shop.opening_hours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <a href={`tel:${shop.phone}`} className="font-mono text-brand-700 hover:underline">
                      {shop.phone}
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => onViewShop(shop.id)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>View Full Shop Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Specifications Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium space-y-4">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                Job Specifications
              </span>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Color Mode:</span>
                  <span className="font-bold">{activeOrder.color_mode === 'bw' ? 'Black & White Laser' : 'Vibrant Color'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sides:</span>
                  <span className="font-bold capitalize">{activeOrder.sides}-Sided</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paper & Size:</span>
                  <span className="font-mono">{activeOrder.paper_size} ({activeOrder.orientation})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Binding:</span>
                  <span className="font-bold capitalize">{activeOrder.binding_type}</span>
                </div>
                {activeOrder.lamination && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Finishing:</span>
                    <span className="font-bold text-brand-700">Thermal Lamination</span>
                  </div>
                )}
                {activeOrder.special_instructions && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 text-[11px] block">Instructions:</span>
                    <p className="text-slate-800 text-[11px] italic mt-0.5">"{activeOrder.special_instructions}"</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs text-slate-500 font-medium">Total Cost:</span>
                <span className="font-display font-black text-xl text-brand-700">₹{activeOrder.total_price.toFixed(2)}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Printable Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}
    </div>
  );
};

