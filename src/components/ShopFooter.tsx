import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export const ShopFooter: React.FC = () => {
  return (
    <footer className="bg-[#0D1017] text-white border-t border-white/10 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw] py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="w-6 h-6 rounded bg-[#FF5A1F] flex items-center justify-center font-bold text-xs font-mono">
                ⚡
              </div>
              <span className="font-serif font-normal text-xl text-white">Prinrox Partner</span>
            </div>
            <p className="font-sans text-xs text-[#8B9098] leading-relaxed">
              Commercial dispatch management & laser queue telemetry for campus print hubs, copy centers, and plotters.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#8B9098] mb-3">Laser Operations</h4>
            <ul className="space-y-2 font-sans text-xs text-slate-300">
              <li className="hover:text-white cursor-pointer">Native In-Browser PDF.js Print</li>
              <li className="hover:text-white cursor-pointer">1200 DPI CMYK Calibration</li>
              <li className="hover:text-white cursor-pointer">Paper Size Pricing Multipliers</li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#8B9098] mb-3">Settlements & GST</h4>
            <ul className="space-y-2 font-sans text-xs text-slate-300">
              <li className="hover:text-white cursor-pointer">Daily Automated Payouts</li>
              <li className="hover:text-white cursor-pointer">Official Tax Invoices</li>
              <li className="hover:text-white cursor-pointer">30-Second SLA Compliance</li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-[#8B9098] mb-3">Operator Support</h4>
            <p className="font-mono text-xs text-slate-400 mb-2">
              Hotline: +91 98123 45678
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-emerald-400 text-[11px] font-mono border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Laser Dispatch Online
            </span>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] text-[#7A7F88]">
          <span>&copy; {new Date().getFullYear()} Prinrox Technologies. Designed for operators. Calibrated for speed.</span>
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FF5A1F] hover:underline font-medium inline-flex items-center gap-1"
          >
            Switch to Student App <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
};
