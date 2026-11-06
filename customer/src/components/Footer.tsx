import React from 'react';
import { Printer, Heart, Mail, Phone, MapPin, ShieldCheck, Zap } from 'lucide-react';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg">
                <Printer className="w-5 h-5" />
              </div>
              <span className="font-display font-black text-2xl text-white tracking-tight">
                Printo
              </span>
            </div>
            
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              The premier SaaS platform connecting university campuses and professionals with verified local printing shops. Eliminate lines, upload remotely, and collect with zero wait.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono bg-emerald-950 border border-emerald-800 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ALL CAMPUS PRINT HUBS ONLINE
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">Platform</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate?.('shops')} className="hover:text-white transition-colors">
                  Find Print Shops
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('order_wizard')} className="hover:text-white transition-colors">
                  Upload PDF & Configure
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('order_tracker')} className="hover:text-white transition-colors">
                  Live Order Tracker
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate?.('shop_dashboard')} className="hover:text-white transition-colors">
                  Shop Owner Portal
                </button>
              </li>
            </ul>
          </div>

          {/* For Businesses */}
          <div className="space-y-3">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">Printing Shops</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <button onClick={() => onNavigate?.('shop_dashboard')} className="hover:text-white transition-colors">
                  Owner Dashboard
                </button>
              </li>
              <li>
                <span className="text-slate-400">Pricing Configuration</span>
              </li>
              <li>
                <span className="text-slate-400">PDF.js Native Print Engine</span>
              </li>
              <li>
                <span className="text-slate-400">Queue Management</span>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="space-y-3">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">Help & Support</p>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brand-400" />
                <span>support@printo.network</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-brand-400" />
                <span>+91 (080) 4920-8800</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-brand-400" />
                <span>Campus Tech Park, Gate 3</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Printo Cloud Platform Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Security Audits</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

