import React from 'react';
import { Store, ShieldCheck, Headphones, FileText, ArrowUpRight } from 'lucide-react';

export const ShopFooter: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Store className="w-5 h-5 text-brand-400" />
              <span className="font-display font-bold text-lg">Printo Partner</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Professional dispatch management & digital queue system for campus printing hubs, copy centers, and plotters.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm text-white mb-3">Merchant Operations</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>Hardware Compatibility</span>
              </li>
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>Direct PDF.js Rasterizer</span>
              </li>
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>Paper Size Multipliers</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm text-white mb-3">Compliance & Payouts</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>Daily Settlements</span>
              </li>
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>GST Tax Invoice Records</span>
              </li>
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>Queue SLA Policies</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-sm text-white mb-3">Partner Support</h4>
            <p className="text-xs text-slate-400 mb-2">
              Operator Hotline: +91 98123 45678
            </p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-mono border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Laser Dispatch Online
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Printo Technologies Inc. All rights reserved.</span>
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1"
          >
            Switch to Customer App <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
};

