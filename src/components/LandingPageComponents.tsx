import React, { useState } from 'react';
import { 
  Upload, 
  MapPin, 
  Printer, 
  Check, 
  Clock, 
  ShieldCheck, 
  ChevronDown, 
  ArrowRight,
  FileText,
  Zap,
  Sparkles
} from 'lucide-react';

interface HowItWorksProps {
  onStartOrder?: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksProps> = ({ onStartOrder }) => {
  const steps = [
    {
      num: 'NODE 01',
      title: 'Target Nearby Campus Hub',
      desc: 'Discover verified print centers within 0.2 to 1.2 km of your lecture hall. View live queue lengths and turnaround times before dispatching.',
      tag: 'GEO-DISCOVERY'
    },
    {
      num: 'NODE 02',
      title: 'Upload Payload & Inspect',
      desc: 'Drop your PDF document. Our client-side PDF.js rasterizer counts pages instantly, prevents corrupted files, and calculates upfront cost.',
      tag: 'PDF.JS RASTERIZER'
    },
    {
      num: 'NODE 03',
      title: 'Edge Laser Calibration',
      desc: 'The print shop receives your calibrated specs (B&W/Color, Duplex, Spiral Coil) and dispatches straight to high-speed commercial laser presses.',
      tag: '1200 DPI CMYK'
    },
    {
      num: 'NODE 04',
      title: '30-Second Token Grab & Go',
      desc: 'Receive an instant notification when your job is hot off the press. Flash your pickup token pass (e.g. PRN-8842) at the express counter and walk out.',
      tag: 'ZERO WAITING'
    }
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#EEF0F2] text-[#0F1115] border-t border-[#C4C9CF]/60">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw]">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-14 space-y-3">
          <div className="font-mono font-medium text-[11.5px] tracking-[0.06em] uppercase text-[#2A2E35] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
            SEQUENTIAL CALIBRATION NODES
          </div>
          <h2 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl leading-[1.08] tracking-[-0.025em] text-[#0F1115]">
            How Prinrox works.<br />
            <em className="italic text-[#0F1115]/90">From device to finished printout in 4 steps.</em>
          </h2>
        </div>

        {/* 4 Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => (
            <div
              key={s.num}
              className="p-6 rounded-2xl bg-white border border-[#C4C9CF] shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#EEF0F2] pb-3 mb-4">
                  <span className="font-mono text-xs font-bold text-[#FF5A1F]">{s.num}</span>
                  <span className="font-mono text-[10px] text-[#8B9098] uppercase tracking-wider">{s.tag}</span>
                </div>
                <h3 className="font-serif font-normal text-xl text-[#0F1115] leading-snug">
                  {s.title}
                </h3>
                <p className="font-sans text-xs text-[#2A2E35] mt-2.5 leading-relaxed">
                  {s.desc}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-[#EEF0F2] font-mono text-[11px] text-[#7A7F88] flex items-center justify-between">
                <span>STAGE 0{idx + 1}</span>
                <span className="text-[#0F1115] font-semibold">&rarr;</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Bar */}
        {onStartOrder && (
          <div className="mt-12 text-center">
            <button
              onClick={onStartOrder}
              className="h-10 px-6 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-sans font-medium text-xs shadow-sm hover:-translate-y-0.5 transition-all inline-flex items-center gap-2"
            >
              <span>Begin Your First Calibration Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </section>
  );
};

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      title: 'In-Browser PDF.js Inspection',
      desc: 'Direct parsing in browser memory. Verifies exact page counts, protects against corrupted PDFs, and eliminates public computer USB malware.',
      tag: 'SECURITY'
    },
    {
      title: 'Automatic Duplex Paper Discount',
      desc: 'Double-sided printing reduces physical paper consumption by 50% and automatically deducts ₹0.25 to ₹0.50 per sheet off your total order.',
      tag: 'ECO & SAVINGS'
    },
    {
      title: 'Academic Binding Specification',
      desc: 'Spiral wire, corner staple, hardcover thesis binding with gold-foil spine calibration, and thermal glossy lamination.',
      tag: 'FINISHING'
    },
    {
      title: '30-Second Token Grab-and-Go',
      desc: 'Each completed order generates a high-contrast alphanumeric pickup token. Operators pull your ready package the moment you arrive.',
      tag: 'EXPRESS PASS'
    }
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#EEF0F2] text-[#0F1115] border-t border-[#C4C9CF]/60">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw]">
        
        <div className="max-w-2xl mb-14 space-y-3">
          <div className="font-mono font-medium text-[11.5px] tracking-[0.06em] uppercase text-[#2A2E35] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
            PRECISION FEATURES
          </div>
          <h2 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl leading-[1.08] tracking-[-0.025em] text-[#0F1115]">
            Engineered for university workloads.<br />
            <em className="italic text-[#0F1115]/90">Built for speed, accuracy, and clarity.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-8 rounded-2xl bg-white border border-[#C4C9CF] shadow-sm flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-[10px] font-bold text-[#FF5A1F] uppercase tracking-wider bg-[#FFE1D3] px-2.5 py-1 rounded-full">
                  {f.tag}
                </span>
                <h3 className="font-serif font-normal text-2xl text-[#0F1115] mt-4">
                  {f.title}
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#2A2E35] mt-2.5 leading-relaxed">
                  {f.desc}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-[#EEF0F2] flex items-center justify-between font-mono text-[11px] text-[#7A7F88]">
                <span>PRINROX PRECISION ENGINE</span>
                <span className="text-[#0F1115]">VERIFIED</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export const BenefitsSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-[#0D1017] text-white border-t border-white/10 relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw] relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="font-mono text-xs font-bold text-[#FF5A1F] uppercase tracking-wider">
              TELEMETRY & IMPACT
            </span>
            <h2 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl leading-tight text-white">
              Zero lost minutes.<br />
              <em className="italic opacity-90">100% verified print delivery.</em>
            </h2>
            <p className="font-sans text-sm text-[#8B9098] leading-relaxed">
              University students previously spent an average of 42 minutes standing in lines outside campus printing shops during exam submission weeks. Prinrox compresses this down to 30 seconds.
            </p>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="font-sans font-light text-4xl sm:text-5xl text-white tracking-tight">−94%</div>
              <div className="font-mono text-[11px] text-[#FF5A1F] mt-1.5 uppercase">Queue Time Saved</div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="font-sans font-light text-4xl sm:text-5xl text-white tracking-tight">12s</div>
              <div className="font-mono text-[11px] text-[#FF5A1F] mt-1.5 uppercase">Counter Collection</div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="font-sans font-light text-4xl sm:text-5xl text-white tracking-tight">0</div>
              <div className="font-mono text-[11px] text-[#FF5A1F] mt-1.5 uppercase">Corrupted Thumb Drives</div>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="font-sans font-light text-4xl sm:text-5xl text-white tracking-tight">4</div>
              <div className="font-mono text-[11px] text-[#FF5A1F] mt-1.5 uppercase">Campus Hubs Mapped</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does remote laser dispatch work without a physical USB drive?',
      a: 'When you upload your PDF on Prinrox, our client-side PDF.js rasterizer reads your file, extracts page counts, and formats the job payload directly for the shop laser console. The shop prints the file without ever inserting a thumb drive into a shared PC.'
    },
    {
      q: 'How do I pick up my documents once they are printed?',
      a: 'When your order status turns to "Ready for Pickup", you receive an express token code (e.g. PRN-8842). Walk to the express counter, quote or show your code, and receive your printed, bound document in under 30 seconds.'
    },
    {
      q: 'What happens if I need custom page ranges, like pages 1-12 and 24-30?',
      a: 'In the Order Wizard, simply select "Custom Page Range" and enter your exact page selection (e.g. "1-12, 24-30"). Our calculator automatically updates the page count and cost breakdown.'
    },
    {
      q: 'Can I cancel an order if I uploaded the wrong PDF file?',
      a: 'Yes! While your order is in the "Submitted" or "Pending" queue, you can cancel it with one click from the Order Tracker. Once the laser shop accepts and starts printing, jobs cannot be cancelled.'
    }
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#EEF0F2] text-[#0F1115] border-t border-[#C4C9CF]/60">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw]">
        
        <div className="max-w-2xl mb-12 space-y-3">
          <div className="font-mono font-medium text-[11.5px] tracking-[0.06em] uppercase text-[#2A2E35] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
            COMMONLY ASKED QUESTIONS
          </div>
          <h2 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl leading-[1.08] tracking-[-0.025em] text-[#0F1115]">
            Frequently asked questions.<br />
            <em className="italic text-[#0F1115]/90">Everything you need to know about Prinrox.</em>
          </h2>
        </div>

        <div className="max-w-3xl space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={faq.q}
                className="rounded-2xl bg-white border border-[#C4C9CF] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-serif text-lg sm:text-xl text-[#0F1115]"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#FF5A1F] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#2A2E35] font-sans leading-relaxed border-t border-[#EEF0F2]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
