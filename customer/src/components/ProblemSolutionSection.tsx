import React from 'react';
import { 
  X, 
  Check, 
  Clock, 
  FileWarning, 
  ShieldCheck, 
  ArrowRight,
  Zap,
  Printer
} from 'lucide-react';

export const ProblemSolutionSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-[#EEF0F2] text-[#0F1115] relative overflow-hidden border-t border-[#C4C9CF]/60">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw]">
        
        {/* Editorial Section Header */}
        <div className="max-w-2xl mb-14 space-y-3">
          <div className="font-mono font-medium text-[11.5px] tracking-[0.06em] uppercase text-[#2A2E35] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
            CAMPUS BOTTLENECK SOLVED
          </div>
          <h2 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl leading-[1.08] tracking-[-0.025em] text-[#0F1115]">
            The old campus queue.<br />
            <em className="italic text-[#0F1115]/90">Replaced by edge laser dispatch.</em>
          </h2>
          <p className="font-sans font-normal text-sm sm:text-base text-[#2A2E35] leading-relaxed pt-1">
            Whether for semester lab records, final thesis reports, or architectural CAD plots, campus printing has remained stubbornly manual for decades. Printo turns it into an instant 30-second token pass.
          </p>
        </div>

        {/* High-Contrast Editorial Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* Card 1: The Old Way (Moody Obsidian Dark #0D1017) */}
          <div className="rounded-[24px] p-8 sm:p-10 bg-[#0D1017] text-white border border-white/10 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="font-mono text-[11px] font-medium text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  THE ANALOG BOTTLENECK
                </span>
                <span className="font-mono text-[11px] text-slate-500">LEGACY · 45 MIN WAIT</span>
              </div>

              <div>
                <h3 className="font-serif font-normal text-2xl sm:text-3xl text-white leading-tight">
                  The Pre-Submission Morning Chaos
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#8B9098] mt-2 leading-relaxed">
                  What happens at 8:30 AM outside campus xerox centers right before a 9:00 AM academic submission deadline.
                </p>
              </div>

              {/* Problem Breakdown List */}
              <div className="space-y-3 font-sans text-xs sm:text-[13px] text-slate-300">
                <div className="border-t border-white/10 pt-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">✕</span>
                  <div>
                    <span className="font-medium text-white">45-Minute Physical Lines:</span> Crowded shops with 30 students jostling for 2 operators.
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">✕</span>
                  <div>
                    <span className="font-medium text-white">Corrupted USB Drives & Viruses:</span> Malware transmission between public counter computers and student thumb drives.
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">✕</span>
                  <div>
                    <span className="font-medium text-white">Verbal Miscommunications:</span> Pages printed single-sided instead of double, wrong orientation, incorrect binding coils.
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">✕</span>
                  <div>
                    <span className="font-medium text-white">Surprise Surge Pricing:</span> Ad-hoc rate calculation at the counter with no itemized receipt or breakdown.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-rose-400">
              <span>AVERAGE LOST TIME</span>
              <span className="font-bold text-sm">~45 MIN / SUBMISSION</span>
            </div>
          </div>

          {/* Card 2: The Printo Protocol (Luminous Pale Cream/White) */}
          <div className="rounded-[24px] p-8 sm:p-10 bg-white text-[#0F1115] border border-[#C4C9CF] shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#EEF0F2] pb-4">
                <span className="font-mono text-[11px] font-medium text-[#FF5A1F] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
                  THE PRINTO PROTOCOL
                </span>
                <span className="font-mono text-[11px] text-[#FF5A1F] bg-[#FFE1D3] px-2 py-0.5 rounded-full font-bold">
                  30-SEC PICKUP
                </span>
              </div>

              <div>
                <h3 className="font-serif font-normal text-2xl sm:text-3xl text-[#0F1115] leading-tight">
                  Calibrated Remote Laser Dispatch
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#7A7F88] mt-2 leading-relaxed">
                  Upload your PDF from your hostel room, cafeteria, or lecture hall. Collect from the shop counter in under 30 seconds.
                </p>
              </div>

              {/* Solution List */}
              <div className="space-y-3 font-sans text-xs sm:text-[13px] text-[#2A2E35]">
                <div className="border-t border-[#EEF0F2] pt-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#FFE1D3] text-[#D9430F] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✓</span>
                  <div>
                    <span className="font-medium text-[#0F1115]">Zero Counter Waiting:</span> Jobs print in background laser queues while you walk to the shop.
                  </div>
                </div>

                <div className="border-t border-[#EEF0F2] pt-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#FFE1D3] text-[#D9430F] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✓</span>
                  <div>
                    <span className="font-medium text-[#0F1115]">Direct In-Browser PDF.js Inspection:</span> Automatic page count extraction, zero USB sticks, zero virus hazards.
                  </div>
                </div>

                <div className="border-t border-[#EEF0F2] pt-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#FFE1D3] text-[#D9430F] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✓</span>
                  <div>
                    <span className="font-medium text-[#0F1115]">Sub-Millimeter Finishing Calibration:</span> Choose single/double-sided, spiral, hardcover, or staple with instant live visual review.
                  </div>
                </div>

                <div className="border-t border-[#EEF0F2] pt-3 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#FFE1D3] text-[#D9430F] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">✓</span>
                  <div>
                    <span className="font-medium text-[#0F1115]">Instant Token Verification Code:</span> Flash your code (`PRN-8842`) and collect your bound printout immediately.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#EEF0F2] flex items-center justify-between font-mono text-[11px] text-[#FF5A1F]">
              <span>AVERAGE COUNTER TURNAROUND</span>
              <span className="font-bold text-sm">30 SECONDS TOTAL</span>
            </div>
          </div>

        </div>

        {/* Triple Stat Counter Strip */}
        <div className="mt-12 pt-10 border-t border-[#C4C9CF]/60 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="font-sans font-light text-4xl sm:text-5xl text-[#0F1115] tracking-tight">−42 min</div>
            <div className="font-mono text-xs text-[#7A7F88] mt-1 uppercase">Queue Latency Eliminated</div>
          </div>
          <div>
            <div className="font-sans font-light text-4xl sm:text-5xl text-[#0F1115] tracking-tight">100%</div>
            <div className="font-mono text-xs text-[#7A7F88] mt-1 uppercase">USB Stick Free Remote Upload</div>
          </div>
          <div>
            <div className="font-sans font-light text-4xl sm:text-5xl text-[#0F1115] tracking-tight">₹1.50</div>
            <div className="font-mono text-xs text-[#7A7F88] mt-1 uppercase">Standardized B&W Laser Rate</div>
          </div>
        </div>

      </div>
    </section>
  );
};
