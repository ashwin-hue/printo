import React from 'react';
import { Printer, X, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 space-y-6 relative">
        
        {/* Top Close Button (hidden during print) */}
        <div className="flex items-center justify-between no-print">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
            Official Tax Invoice & Print Receipt
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Printable Container */}
        <div className="space-y-6 p-2">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4 border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-700 text-white flex items-center justify-center font-bold text-sm">
                  ⚡
                </div>
                <h2 className="font-display font-black text-xl text-slate-900">Printo Network</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">Direct Campus Printing Dispatch</p>
            </div>

            <div className="text-right">
              <span className="font-mono font-bold text-sm text-brand-700 block">{order.order_number}</span>
              <span className="text-[10px] font-mono text-slate-400">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Fulfillment Hub:</span>
              <strong className="text-slate-900 block mt-0.5">{order.shop_name}</strong>
              <p className="text-slate-500 text-[11px]">Gate 3, Campus Tech Avenue</p>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Customer Details:</span>
              <strong className="text-slate-900 block mt-0.5">{order.customer_name}</strong>
              <p className="text-slate-500 text-[11px] font-mono">{order.customer_phone}</p>
            </div>
          </div>

          {/* Document & Finishing Specs */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-600">Document File:</span>
              <span className="font-bold text-slate-900 truncate max-w-[200px]">{order.document.file_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Specifications:</span>
              <span className="font-mono text-slate-900">
                {order.copies}x • {order.color_mode.toUpperCase()} • {order.paper_size} • {order.sides}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Finishing:</span>
              <span className="font-semibold text-slate-900 capitalize">{order.binding_type} Binding</span>
            </div>
          </div>

          {/* Itemized Price Table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                <th className="text-left pb-2">Description</th>
                <th className="text-center pb-2">Qty</th>
                <th className="text-right pb-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 text-slate-800">
                  Laser Print ({order.color_mode === 'bw' ? 'B&W' : 'Color'}, {order.sides})
                </td>
                <td className="py-2.5 text-center font-mono">{order.total_pages_to_print} pgs</td>
                <td className="py-2.5 text-right font-mono font-semibold">₹{order.cost_breakdown.paper_and_print.toFixed(2)}</td>
              </tr>
              {order.cost_breakdown.binding > 0 && (
                <tr>
                  <td className="py-2.5 text-slate-800">{order.binding_type} Finishing</td>
                  <td className="py-2.5 text-center font-mono">1</td>
                  <td className="py-2.5 text-right font-mono font-semibold">₹{order.cost_breakdown.binding.toFixed(2)}</td>
                </tr>
              )}
              {order.cost_breakdown.finishing > 0 && (
                <tr>
                  <td className="py-2.5 text-slate-800">Thermal Lamination</td>
                  <td className="py-2.5 text-center font-mono">{order.copies}</td>
                  <td className="py-2.5 text-right font-mono font-semibold">₹{order.cost_breakdown.finishing.toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td className="py-2.5 text-slate-500">Service Fee & GST (5%)</td>
                <td className="py-2.5 text-center font-mono">-</td>
                <td className="py-2.5 text-right font-mono text-slate-500">₹{order.cost_breakdown.taxes.toFixed(2)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 font-bold">
                <td className="pt-3 text-slate-900 text-sm">Grand Total</td>
                <td></td>
                <td className="pt-3 text-right font-display text-base text-brand-700">₹{order.total_price.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Pickup Verification Token */}
          <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-200/60 text-center space-y-1">
            <span className="text-[10px] font-mono text-brand-700 uppercase font-bold tracking-wider">
              Shop Pickup Token
            </span>
            <div className="font-display font-black text-2xl tracking-widest text-slate-900 font-mono">
              TOKEN #{order.order_number.replace('PRN-', '')}
            </div>
            <p className="text-[10px] text-slate-500">
              Present this code at counter for instant zero-wait collection.
            </p>
          </div>

        </div>

        {/* Footer Actions (hidden during print) */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>

          <button
            onClick={handlePrintReceipt}
            className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs flex items-center gap-2 shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
};

