import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { Order } from '../types';

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1115]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#C4C9CF] space-y-6 relative">
        
        {/* Top Close Button (hidden during print) */}
        <div className="flex items-center justify-between no-print border-b border-[#EEF0F2] pb-3">
          <span className="font-mono text-xs uppercase tracking-wider text-[#7A7F88]">
            Official Tax Invoice & Print Pass
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#8B9098] hover:text-[#0F1115] hover:bg-[#EEF0F2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Printable Container */}
        <div className="space-y-5">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4 border-[#EEF0F2]">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#FF5A1F] text-white flex items-center justify-center font-bold text-xs font-mono">
                  ⚡
                </div>
                <h2 className="font-serif font-normal text-2xl text-[#0F1115]">Prinrox Protocol</h2>
              </div>
              <p className="font-sans text-xs text-[#7A7F88] mt-0.5">Campus Laser Dispatch Network</p>
            </div>

            <div className="text-right">
              <span className="font-mono font-bold text-sm text-[#FF5A1F] block">{order.order_number}</span>
              <span className="text-[10px] font-mono text-[#8B9098]">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <span className="text-[10px] font-mono text-[#7A7F88] uppercase block">Fulfillment Hub:</span>
              <strong className="text-[#0F1115] block mt-0.5">{order.shop_name}</strong>
              <p className="text-[#8B9098] text-[11px]">Gate 3, Campus Tech Avenue</p>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#7A7F88] uppercase block">Student Details:</span>
              <strong className="text-[#0F1115] block mt-0.5">{order.customer_name}</strong>
              <p className="text-[#8B9098] text-[11px] font-mono">{order.customer_phone}</p>
            </div>
          </div>

          {/* Document & Finishing Specs */}
          <div className="p-3.5 rounded-2xl bg-[#EEF0F2] border border-[#C4C9CF] text-xs font-sans space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#7A7F88]">Payload File:</span>
              <span className="font-medium text-[#0F1115] truncate max-w-[200px]">{order.document.file_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A7F88]">Laser Calibration:</span>
              <span className="font-mono text-[#0F1115]">{order.color_mode.toUpperCase()} • {order.paper_size} • {order.sides}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A7F88]">Finishing:</span>
              <span className="font-medium text-[#0F1115]">{order.binding_type} {order.lamination ? '+ Lamination' : ''}</span>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 text-xs font-sans">
            <div className="flex justify-between text-[#2A2E35]">
              <span>Laser Printing ({order.total_pages_to_print} pages)</span>
              <span className="font-mono text-[#0F1115]">₹{order.cost_breakdown.paper_and_print.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#2A2E35]">
              <span>Binding ({order.binding_type})</span>
              <span className="font-mono text-[#0F1115]">₹{order.cost_breakdown.binding.toFixed(2)}</span>
            </div>
            {order.cost_breakdown.finishing > 0 && (
              <div className="flex justify-between text-[#2A2E35]">
                <span>Finishing</span>
                <span className="font-mono text-[#0F1115]">₹{order.cost_breakdown.finishing.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#7A7F88]">
              <span>GST & Campus Tax (5%)</span>
              <span className="font-mono">₹{order.cost_breakdown.taxes.toFixed(2)}</span>
            </div>

            <div className="pt-3 border-t border-[#EEF0F2] flex justify-between font-serif text-xl text-[#0F1115]">
              <span>Total Paid</span>
              <span className="font-mono font-medium text-[#FF5A1F]">₹{order.total_price.toFixed(2)}</span>
            </div>
          </div>

          {/* Pass Footer */}
          <div className="p-3 rounded-xl bg-white border border-[#C4C9CF] text-center font-mono text-[11px] text-[#7A7F88]">
            <span>EXPRESS PASS CODE: </span>
            <strong className="text-[#0F1115] font-bold text-sm tracking-wider">{order.order_number}</strong>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 no-print pt-2">
          <button
            onClick={handlePrintReceipt}
            className="flex-1 h-10 px-4 rounded-full bg-[#0F1115] hover:bg-[#FF5A1F] text-white font-sans font-medium text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice & Pass</span>
          </button>
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-full border border-[#C4C9CF] hover:bg-[#EEF0F2] text-[#2A2E35] font-sans font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
