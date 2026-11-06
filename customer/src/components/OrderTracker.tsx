import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  MapPin, 
  Phone, 
  FileText, 
  Check, 
  AlertCircle, 
  X, 
  ArrowRight,
  ExternalLink,
  Printer,
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

  const getStepStatus = (status: OrderStatus) => {
    const steps = [
      { label: 'Submitted', desc: 'Awaiting operator review' },
      { label: 'Accepted', desc: 'In queue for laser press' },
      { label: 'Printing', desc: 'Running on 1200 DPI engine' },
      { label: 'Ready for Pickup', desc: 'At express counter desk' },
      { label: 'Completed', desc: 'Collected by student' },
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
      <div className="py-24 text-center max-w-lg mx-auto px-4 bg-[#EEF0F2] min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-white border border-[#C4C9CF] flex items-center justify-center mx-auto mb-4 text-[#FF5A1F]">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-normal text-2xl sm:text-3xl text-[#0F1115]">No Active Print Payloads</h2>
        <p className="font-sans text-xs text-[#7A7F88] mt-1.5 mb-6 max-w-sm">
          You have no documents currently in print queue. Upload a document to skip campus counter queues.
        </p>
        <button
          onClick={onNewOrder}
          className="h-10 px-6 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-sans font-medium text-xs shadow-sm transition-all"
        >
          Dispatch a Document
        </button>
      </div>
    );
  }

  const { steps, currentIdx } = getStepStatus(activeOrder.status);

  return (
    <div className="py-12 bg-[#EEF0F2] text-[#0F1115] min-h-[calc(100vh-64px)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw] space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#C4C9CF]/60">
          <div>
            <div className="font-mono font-medium text-[11.5px] tracking-[0.06em] uppercase text-[#2A2E35] flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
              LIVE TELEMETRY
            </div>
            <h1 className="font-serif font-normal text-3xl sm:text-5xl tracking-[-0.025em] text-[#0F1115]">
              Real-Time Order Tracking.<br />
              <em className="italic text-[#0F1115]/90">Monitor laser progress & token codes.</em>
            </h1>
          </div>

          <button
            onClick={onNewOrder}
            className="h-9 px-4 rounded-full bg-[#0F1115] hover:bg-[#FF5A1F] text-white font-sans font-medium text-xs shadow-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>
        </div>

        {/* Order Selector Pills */}
        {orders.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {orders.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={`h-8 px-4 rounded-full text-xs font-mono transition-all border whitespace-nowrap flex items-center gap-2 ${
                  activeOrder.id === o.id
                    ? 'bg-[#0F1115] text-white border-[#0F1115]'
                    : 'bg-white text-[#2A2E35] border-[#C4C9CF] hover:border-[#8B9098]'
                }`}
              >
                <span>{o.order_number}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                  o.status === 'ready' 
                    ? 'bg-[#FFE1D3] text-[#D9430F]' 
                    : o.status === 'printing' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {o.status}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Progress Lifecycle & Status */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Status Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#C4C9CF] shadow-sm space-y-6">
              
              {/* Order ID & Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EEF0F2]">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-serif font-normal text-3xl text-[#0F1115]">
                      {activeOrder.order_number}
                    </h2>
                    <span className="font-mono text-xs text-[#7A7F88]">
                      ID: {activeOrder.id}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[#7A7F88] mt-1">
                    Submitted on {new Date(activeOrder.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(activeOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs px-3 py-1 rounded-full font-bold uppercase ${
                    activeOrder.status === 'ready'
                      ? 'bg-[#FFE1D3] text-[#D9430F]'
                      : activeOrder.status === 'printing'
                      ? 'bg-indigo-100 text-indigo-900'
                      : activeOrder.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-[#EEF0F2] text-[#2A2E35]'
                  }`}>
                    {activeOrder.status === 'ready' ? '⚡ Ready for Pickup' : activeOrder.status}
                  </span>

                  {activeOrder.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(activeOrder.id)}
                      className="font-mono text-xs text-rose-600 hover:underline px-2 py-1"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>

              {/* 5-Stage Step Progress Visualizer */}
              <div className="space-y-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#7A7F88] block">
                  Laser Dispatch Progress
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {steps.map((st, sIdx) => {
                    const isDone = currentIdx > sIdx;
                    const isCurrent = currentIdx === sIdx;
                    return (
                      <div
                        key={st.label}
                        className={`p-3 rounded-2xl border transition-all ${
                          isCurrent
                            ? 'border-[#FF5A1F] bg-[#FFE1D3]/30 text-[#0F1115]'
                            : isDone
                            ? 'border-[#C4C9CF] bg-white text-[#0F1115]'
                            : 'border-[#EEF0F2] bg-[#EEF0F2]/50 text-[#8B9098]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5 font-mono text-[10px]">
                          <span>0{sIdx + 1}</span>
                          {isDone ? (
                            <span className="text-[#FF5A1F] font-bold">✓</span>
                          ) : isCurrent ? (
                            <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
                          ) : null}
                        </div>
                        <div className="font-sans font-medium text-xs">{st.label}</div>
                        <div className="font-mono text-[9px] text-[#7A7F88] mt-1 leading-tight">{st.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Specs Overview */}
              <div className="border-t border-[#EEF0F2] pt-6 space-y-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#7A7F88] block">
                  Document Specifications
                </span>

                <div className="p-4 rounded-2xl bg-[#EEF0F2] border border-[#C4C9CF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#C4C9CF] flex items-center justify-center text-[#FF5A1F]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-sans font-medium text-xs text-[#0F1115] truncate max-w-sm">
                        {activeOrder.document.file_name}
                      </div>
                      <div className="font-mono text-[10px] text-[#7A7F88] mt-0.5">
                        {activeOrder.total_pages_to_print} pages to print • {activeOrder.copies} {activeOrder.copies === 1 ? 'copy' : 'copies'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] bg-white border border-[#C4C9CF] px-2 py-0.5 rounded-full">
                      {activeOrder.color_mode === 'bw' ? 'B&W Laser' : 'Vibrant Color'}
                    </span>
                    <span className="font-mono text-[10px] bg-white border border-[#C4C9CF] px-2 py-0.5 rounded-full">
                      {activeOrder.sides === 'double' ? 'Double-Sided' : 'Single'}
                    </span>
                    <span className="font-mono text-[10px] bg-white border border-[#C4C9CF] px-2 py-0.5 rounded-full">
                      {activeOrder.binding_type}
                    </span>
                  </div>
                </div>

                {activeOrder.special_instructions && (
                  <p className="font-mono text-xs text-[#7A7F88] bg-white p-3 rounded-xl border border-[#C4C9CF]">
                    Note for shop: "{activeOrder.special_instructions}"
                  </p>
                )}
              </div>

            </div>

          </div>

          {/* Right Column: High-Contrast 30-Second Pickup Pass Card */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Express Token Pass */}
            <div className="rounded-3xl p-6 sm:p-7 bg-[#0D1017] text-white border border-white/10 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-mono text-[10px] text-[#FF5A1F] uppercase font-bold tracking-widest">
                  30-SECOND PICKUP PASS
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Huge Alphanumeric Token */}
              <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="font-mono text-[11px] text-[#8B9098] uppercase block">Counter Verification Code</span>
                <div className="font-mono font-bold text-4xl sm:text-5xl text-white tracking-wider mt-1 text-[#FF5A1F]">
                  {activeOrder.order_number}
                </div>
                <span className="font-mono text-[10px] text-slate-400 mt-2 block">
                  Show this pass at counter for instant grab & go
                </span>
              </div>

              {/* Shop Destination */}
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between text-[#8B9098]">
                  <span>Pickup Location</span>
                  <span className="text-white font-medium truncate max-w-[170px]">{activeOrder.shop_name}</span>
                </div>
                {shop && (
                  <>
                    <div className="flex justify-between text-[#8B9098]">
                      <span>Address</span>
                      <span className="text-white font-medium truncate max-w-[170px]">{shop.address}</span>
                    </div>
                    <div className="flex justify-between text-[#8B9098]">
                      <span>Contact</span>
                      <span className="text-[#FF5A1F] font-mono">{shop.phone}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-[#8B9098] pt-2 border-t border-white/10">
                  <span>Total Amount</span>
                  <span className="font-sans font-light text-xl text-white">₹{activeOrder.total_price.toFixed(2)}</span>
                </div>
              </div>

              {/* View Receipt Button */}
              <button
                onClick={() => setReceiptOrder(activeOrder)}
                className="w-full h-10 px-4 rounded-full bg-white text-[#0F1115] hover:bg-[#EEF0F2] font-sans font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span>View Itemized Tax Invoice</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#FF5A1F]" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Itemized Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};
