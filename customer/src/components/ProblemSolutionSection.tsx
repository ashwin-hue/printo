import React from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  FileWarning, 
  ShieldCheck, 
  Sparkles,
  Zap,
  Printer,
  AlertTriangle
} from 'lucide-react';

export const ProblemSolutionSection: React.FC = () => {
  return (
    <section className="py-24 lg:py-32 bg-white relative overflow-hidden border-t border-slate-200/80">
      {/* Ambient background lighting */}
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Editorial Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-mono font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
            Systemic Inefficiency Solved
          </div>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 tracking-[-0.03em] leading-tight">
            Stop losing hours standing in crowded xerox shops.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Whether it's semester lab records, capstone project reports, or legal blueprints, campus printing has remained stubbornly manual for decades.
          </p>
        </div>

        {/* High-Contrast Editorial Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Card 1: The Frustrating Old Way (Moody Dark Charcoal with Crimson Accents) */}
          <div className="rounded-[32px] p-8 sm:p-10 bg-slate-950 text-white border border-slate-800/90 shadow-card-dark flex flex-col justify-between relative overflow-hidden group">
            {/* Ambient inner glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-rose-950/80 border border-rose-800/60 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  THE OLD ANALOG BOTTLE-NECK
                </span>
                <span className="text-rose-400 font-mono text-xs">STATUS: BROKEN</span>
              </div>

              <div>
                <h3 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                  The 45-Minute Pre-Submission Chaos
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2">
                  What happens at 8:30 AM right before a 9:00 AM academic submission deadline.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✕
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Chaotic Counters & Lost Order Priority</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Twenty students shouting across a glass counter while the shopkeeper juggles random WhatsApp chats and emails.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✕
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Public USB Virus & Privacy Leaks</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Plugging your personal flash drive into malware-infested shop terminals or leaving confidential documents on open desktop folders.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✕
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">Misprinted Copies & Surprise Surcharges</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Accidental single-sided prints that waste reams of paper, missed spiral binding margins, and unpredictable pricing.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-rose-300">
              <span>AVERAGE WASTED TIME:</span>
              <strong className="text-rose-400 font-extrabold text-sm">~45 minutes</strong>
            </div>
          </div>

          {/* Card 2: The Modern Printo Way (Luminous Frosted White with Indigo & Emerald Laser Precision) */}
          <div className="rounded-[32px] p-8 sm:p-10 bg-gradient-to-b from-white to-slate-50 border border-brand-200 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
            {/* Ambient top light */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-brand-700 uppercase tracking-widest bg-brand-50 border border-brand-200/80 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  THE ENGINE: PRINTO DISPATCH
                </span>
                <span className="text-emerald-700 font-mono text-xs font-bold">STATUS: ZERO WAIT</span>
              </div>

              <div>
                <h3 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                  Upload Remote. Pick Up When Ready.
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2">
                  Complete customer-to-press orchestration from your desk or dorm.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-brand-100 shadow-sm">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">In-Browser PDF.js Analysis & Instant Quote</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Instant client-side verification of total page counts, paper orientation, and double-sided discounts before submission.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-brand-100 shadow-sm">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Dedicated Shop Owner Laser Terminal</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Operators preview documents directly in their browser and send them directly to local high-speed printers via native print.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white border border-brand-100 shadow-sm">
                  <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Real-Time Progress & Express Pickup Pass</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Receive an instant push notification the second your document is bound. Flash your token and collect in under 30 seconds.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono text-emerald-700">
              <span>COUNTER PICKUP TIME:</span>
              <strong className="text-emerald-800 font-extrabold text-sm">&lt; 30 seconds</strong>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
