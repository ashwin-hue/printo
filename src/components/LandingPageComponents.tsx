import React, { useState } from 'react';
import { 
  Upload, 
  MapPin, 
  Printer, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  CreditCard, 
  Layers, 
  ChevronDown, 
  Sparkles,
  Users,
  Store,
  FileText,
  Zap,
  TrendingUp,
  Sliders,
  DollarSign
} from 'lucide-react';

interface HowItWorksProps {
  onStartOrder?: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksProps> = ({ onStartOrder }) => {
  const steps = [
    {
      num: '01',
      title: 'Select a Printing Shop',
      desc: 'Browse verified printing hubs near your campus or office. Compare live queues, prices, and available equipment.',
      icon: MapPin,
      tag: '0.2 km nearby'
    },
    {
      num: '02',
      title: 'Upload Document & Configure',
      desc: 'Drop your PDF. Set copies, B&W or color, single or double-sided, spiral binding, and custom page ranges with instant auto-pricing.',
      icon: Upload,
      tag: 'PDF.js Parser'
    },
    {
      num: '03',
      title: 'Shop Owner Laser-Prints',
      desc: 'The printing shop previews the PDF directly in-browser and initiates native laser printing without handling your USB drive.',
      icon: Printer,
      tag: 'High-DPI Laser'
    },
    {
      num: '04',
      title: 'Grab & Go with Zero Queue',
      desc: 'Get a notification the instant your job is finished. Flash your pickup token at the express desk and walk out in under 30 seconds.',
      icon: CheckCircle2,
      tag: 'Zero Wait'
    }
  ];

  return (
    <section className="py-20 lg:py-28 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200/60">
            Frictionless Flow
          </span>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
            How Printo Works
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            A seamless bridge between digital document dispatch and physical print output.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={idx}
                className="relative bg-white rounded-3xl p-7 border border-slate-200/80 shadow-premium hover:shadow-premium-hover transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-display font-black text-3xl text-slate-200 group-hover:text-brand-300 transition-colors">
                      {step.num}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-all duration-300">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <span className="inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 mb-3">
                    {step.tag}
                  </span>

                  <h3 className="font-display font-bold text-lg text-slate-900 mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-brand-700">
                  <span>Step {idx + 1} of 4</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Clock,
      title: 'Real-Time Queue Telemetry',
      desc: 'See the current backlog at every printing shop before ordering. Avoid peak submission rush hours effortlessly.'
    },
    {
      icon: FileText,
      title: 'In-Browser PDF.js Inspection',
      desc: 'High-fidelity document rendering with multi-page navigation, zoom, and orientation checking for shop operators.'
    },
    {
      icon: Sliders,
      title: 'Granular Print Finishing',
      desc: 'Full control over spiral wire binding, corner stapling, thermal lamination, page ranges, and paper dimensions.'
    },
    {
      icon: ShieldCheck,
      title: 'Private & Secure Document Pipe',
      desc: 'No shared USBs. Documents are encrypted, authenticated, and access-restricted strictly to your selected printing shop.'
    },
    {
      icon: CreditCard,
      title: 'Automated Pricing Calculator',
      desc: 'Dynamic calculations accounting for volume tiers, double-sided discounts, and finishing accessories in real time.'
    },
    {
      icon: Zap,
      title: '1-Click Native Print Engine',
      desc: 'Shop owners trigger browser-native laser prints formatted with proper page breaks and orientation metadata.'
    }
  ];

  return (
    <section className="py-20 lg:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200/60">
            Enterprise Architecture
          </span>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
            Engineered for high-volume academic and commercial printing.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            Everything students, researchers, and professional print businesses need for a flawless workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div 
                key={idx}
                className="p-7 rounded-3xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:shadow-premium transition-all duration-300 space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export const BenefitsSection: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Benefits for Customers / Students */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-premium space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-mono text-xs font-bold uppercase tracking-wider">
              <Users className="w-4 h-4" />
              For Students & Customers
            </div>

            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900">
              Never miss a submission deadline due to shop queues.
            </h3>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p><strong className="text-slate-900">Send files from your hostel or office:</strong> Upload assignments directly after finishing, whether it's 2 AM or 10 minutes before class.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p><strong className="text-slate-900">Guaranteed print formatting:</strong> What you configure (spiral binding, double-sided, color pages) is exactly what the machine prints.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p><strong className="text-slate-900">Live order tracking with pickup PIN:</strong> You know when your order changes from Pending to Printing to Ready.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p><strong className="text-slate-900">Complete historical records:</strong> Re-order past documents or download official GST receipts anytime.</p>
              </div>
            </div>
          </div>

          {/* Benefits for Printing Shops */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-card-dark space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 font-mono text-xs font-bold uppercase tracking-wider">
              <Store className="w-4 h-4" />
              For Printing Shop Owners
            </div>

            <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
              Double your daily throughput without adding staff.
            </h3>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p><strong className="text-white">Zero counter bottlenecks:</strong> No more 20 customers huddling over your PC trying to open WhatsApp attachments or email accounts.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p><strong className="text-white">1-Click Browser Printing:</strong> Click Print to send high-resolution jobs straight to your local laser printers through browser native print.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p><strong className="text-white">Pre-calculated pricing:</strong> Customers pay upfront according to your configured rates for B/W, Color, A3, and spiral binding.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p><strong className="text-white">Live daily analytics:</strong> Monitor daily revenue, active queue backlog, and turnaround metrics from your personal dashboard.</p>
              </div>
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
      q: 'How do I know my document will be printed correctly without errors?',
      a: 'Printo parses your PDF in your browser using PDF.js to verify page counts, dimension ratios, and readability. When the shop owner opens your order, they see an identical browser preview alongside your explicit instructions for double-sided orientation, spiral binding, and paper size.'
    },
    {
      q: 'Are my private documents and academic papers kept confidential?',
      a: 'Yes. Customer documents are isolated and accessible only by you and the specific printing shop fulfilling your job. Shops access files via authenticated sessions, and document retention policies ensure completed files can be purged.'
    },
    {
      q: 'Can I cancel an order if I uploaded the wrong PDF file?',
      a: 'Yes! You can cancel your order immediately as long as its status is "Pending". Once the printing shop accepts and begins the laser printing process, cancellation is locked to avoid wasted paper and ink.'
    },
    {
      q: 'How does browser-based printing work for the shop owner?',
      a: 'Shop owners do not need to install complex local printer daemons. When an order is opened in the Shop Dashboard, our engine renders the document and uses the browser\'s native print functionality (Ctrl+P / window.print) to route the job directly to the shop\'s connected laser or plot printer.'
    },
    {
      q: 'What finishing options are supported?',
      a: 'You can choose between No Binding, Corner Stapling (top-left or multi-point), Spiral Wire-O Binding with transparent front/black cardstock back, Hardcover Thesis Binding, and thermal lamination.'
    }
  ];

  return (
    <section className="py-20 lg:py-28 bg-white border-t border-slate-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16 space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200/60">
            Got Questions?
          </span>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 text-base">
            Everything you need to know about the Printo zero-wait printing experience.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx}
                className="rounded-2xl border border-slate-200/80 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 bg-white hover:bg-slate-50 transition-colors"
                >
                  <span className="font-display font-bold text-base sm:text-lg text-slate-900">
                    {faq.q}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-700' : ''}`} />
                </button>

                {isOpen && (
                  <div className="p-5 sm:p-6 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed bg-white border-t border-slate-100">
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
