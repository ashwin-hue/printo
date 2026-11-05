import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  Printer, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  FileCheck,
  Zap,
  Layers,
  ChevronRight,
  Sliders,
  Check
} from 'lucide-react';
import gsap from 'gsap';

interface HeroSectionProps {
  onFindShop: () => void;
  onRegisterShop: () => void;
  onQuickUpload: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onFindShop,
  onRegisterShop,
  onQuickUpload
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Interactive Live Simulator state on the hero card
  const [heroColorMode, setHeroColorMode] = useState<'bw' | 'color'>('bw');
  const [heroCopies, setHeroCopies] = useState<number>(2);
  const [heroSides, setHeroSides] = useState<'single' | 'double'>('double');

  const baseRate = heroColorMode === 'bw' ? 1.50 : 8.00;
  const sidesFactor = heroSides === 'double' ? 0.8 : 1.0;
  const effectivePrice = (32 * heroCopies * baseRate * sidesFactor) + 35.0; // 35 spiral binding

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        '.hero-reveal',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' }
      );
    }
  }, []);

  return (
    <section ref={containerRef} className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-36 bg-[#F8FAFC]">
      {/* Background Architectural Grid & Luminous Ambient Lighting */}
      <div className="absolute inset-0 bg-dot-subtle opacity-70 pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-brand-400/15 via-indigo-300/20 to-purple-400/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-12 right-12 w-96 h-96 bg-brand-600/10 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Subtle Technical Grid Lines */}
      <div className="absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-center">
          
          {/* Left Column: Hero Typography & CTAs */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            
            {/* Top pill badge */}
            <div className="hero-reveal inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-brand-200/90 text-brand-700 shadow-sm text-xs font-semibold tracking-wide">
              <span className="flex h-2 w-2 rounded-full bg-brand-600 animate-ping" />
              <Zap className="w-3.5 h-3.5 text-brand-600" />
              <span className="font-mono text-[11px] uppercase tracking-wider font-bold">
                Zero-Queue Campus Print Dispatch Engine
              </span>
            </div>

            {/* Main Headline */}
            <div className="hero-reveal space-y-2">
              <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-[76px] tracking-[-0.035em] text-slate-900 leading-[1.04]">
                Print Without <br />
                <span className="text-gradient relative inline-block">
                  Waiting.
                  <span className="absolute left-0 bottom-1 w-full h-[3px] bg-gradient-to-r from-brand-600 via-indigo-500 to-transparent rounded-full" />
                </span>
              </h1>
            </div>

            {/* Subheading strictly following prompt spec */}
            <p className="hero-reveal text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Upload your documents, choose a nearby printing shop, and collect your prints when they're ready. <span className="font-bold text-slate-900">No queues. No unnecessary waiting.</span>
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="hero-reveal flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1">
              <button
                onClick={onFindShop}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-brand-700/30 hover:shadow-2xl hover:shadow-brand-700/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2.5 group"
              >
                <span>Find a Print Shop</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </button>

              <button
                onClick={onRegisterShop}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-sm sm:text-base shadow-subtle hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-brand-700" />
                <span>Register Your Shop</span>
              </button>
            </div>

            {/* Fast Value Signals */}
            <div className="hero-reveal pt-8 border-t border-slate-200/80 grid grid-cols-3 gap-6 text-center lg:text-left">
              <div>
                <p className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">0 min</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Counter Wait Time</p>
              </div>
              <div>
                <p className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">₹1.50</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Starting Per Page</p>
              </div>
              <div>
                <p className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">100%</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Confidential SSL Pipe</p>
              </div>
            </div>

          </div>

          {/* Right Column: High-Precision Interactive Live Dispatch Card */}
          <div className="hero-reveal lg:col-span-5 relative">
            
            {/* Outer Specular Aura */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-600 rounded-[32px] blur-xl opacity-20 group-hover:opacity-40 transition duration-700" />

            <div className="relative rounded-[28px] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-6">
              
              {/* Card Header with Technical HUD details */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200/80 flex items-center justify-center text-brand-700 shadow-sm">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-900">Live Dispatch Console</h3>
                    <p className="text-[11px] font-mono text-slate-400">SESSION: #PRN-8842 • LASER 01</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  LASER ACTIVE
                </span>
              </div>

              {/* Document Specs Preview */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-sm text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                      Machine_Learning_Term_Paper_Final.pdf
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      32 pages • Spiral Binding included
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-brand-100 text-brand-800 rounded">
                    A4 75GSM
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-600">High-Speed Laser Progress</span>
                    <span className="text-brand-700 font-mono font-bold">{32 * heroCopies} / {32 * heroCopies} pages (100%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Interactive micro-controls right on the hero card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-slate-400">
                  <span>Interactive Live Tuning</span>
                  <span>Instant Recalc</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setHeroColorMode(heroColorMode === 'bw' ? 'color' : 'bw')}
                    className={`p-2 rounded-xl border text-[11px] font-bold transition-all text-center ${
                      heroColorMode === 'color' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{heroColorMode === 'bw' ? 'B&W Laser' : 'Vibrant Color'}</span>
                  </button>

                  <button
                    onClick={() => setHeroSides(heroSides === 'single' ? 'double' : 'single')}
                    className={`p-2 rounded-xl border text-[11px] font-bold transition-all text-center ${
                      heroSides === 'double' 
                        ? 'border-brand-600 bg-brand-50 text-brand-900' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{heroSides === 'double' ? 'Double Sided' : 'Single Sided'}</span>
                  </button>

                  <button
                    onClick={() => setHeroCopies(heroCopies === 1 ? 2 : heroCopies === 2 ? 3 : 1)}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-[11px] font-bold hover:bg-slate-50 text-center"
                  >
                    <span>{heroCopies}x Copies</span>
                  </button>
                </div>
              </div>

              {/* Hub & Instant Calculation */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase font-bold">Assigned Hub</span>
                  <strong className="text-slate-900 block truncate font-bold mt-0.5">
                    Metro Digital Prints
                  </strong>
                  <span className="text-brand-700 text-[11px] font-mono font-medium">Gate 3 • 200m away</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950">
                  <span className="text-emerald-700 block text-[10px] font-mono uppercase font-bold">Live Estimated Cost</span>
                  <strong className="text-emerald-950 block font-display font-black text-xl mt-0.5">
                    ₹{effectivePrice.toFixed(2)}
                  </strong>
                  <span className="text-emerald-700 text-[10px] font-medium">Ready in ~12 mins</span>
                </div>
              </div>

              {/* Action trigger button */}
              <button
                onClick={onQuickUpload}
                className="w-full py-4 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 group"
              >
                <span>Upload Your Document Now</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

            </div>

            {/* Corner Decorative HUD Marks */}
            <div className="absolute -bottom-3 -right-3 text-slate-400 font-mono text-[10px] select-none pointer-events-none hidden sm:block">
              + [LOC_CAMPUS_TECH] +
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
