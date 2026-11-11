import React from 'react';
import { ExternalLink, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#0D1017] text-white border-t border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw] py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#FF5A1F] flex items-center justify-center text-white font-mono text-xs font-bold">
                ⚡
              </div>
              <span className="font-sans font-semibold text-2xl tracking-[-0.035em] text-white">
                Prinrox
              </span>
            </div>
            
            <p className="font-sans text-xs text-[#8B9098] max-w-sm leading-relaxed">
              University cloud printing protocol connecting students and faculty with verified campus laser presses. Zero queues, zero USB drives, 30-second grab-and-go.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono bg-white/5 border border-white/10 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                CAMPUS LASER STATIONS ACTIVE
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[#8B9098]">Protocol</p>
            <ul className="space-y-2 font-sans text-xs text-slate-300">
              <li>
                <button onClick={() => onNavigate?.('shops')} className="hover:text-white transition-colors">
                  Find Campus Shops
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('order_wizard')} className="hover:text-white transition-colors">
                  Upload PDF Payload
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('order_tracker')} className="hover:text-white transition-colors">
                  Live Order Tracker
                </button>
              </li>
              <li>
                <a href="http://localhost:5174" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1 text-[#FF5A1F]">
                  Shop Owner Console <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Finishing Services */}
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[#8B9098]">Finishing</p>
            <ul className="space-y-2 font-sans text-xs text-slate-300">
              <li>B&W 1200 DPI Laser (₹1.50)</li>
              <li>Vibrant Color CMYK (₹8.00)</li>
              <li>Spiral Wire Binding (₹35)</li>
              <li>Thesis Gold-Foil Hardcover</li>
              <li>Thermal Glossy Lamination</li>
            </ul>
          </div>

          {/* Support & SLA */}
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-[#8B9098]">SLA & Support</p>
            <ul className="space-y-2 font-sans text-xs text-slate-300">
              <li>30-Sec Counter Pickup SLA</li>
              <li>Itemized GST Print Invoices</li>
              <li>Encrypted PDF In-Browser Memory</li>
              <li>Campus Operator Helpline</li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[#7A7F88]">
          <div>&copy; {new Date().getFullYear()} Prinrox Technologies. Designed for people. Calibrated for lasers.</div>
          <div className="flex items-center gap-4">
            <span className="hover:text-white cursor-pointer">Privacy</span>
            <span>·</span>
            <span className="hover:text-white cursor-pointer">Academic Terms</span>
            <span>·</span>
            <span className="text-[#FF5A1F]">v2.0 Distill Engine</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
