import React, { useState } from 'react';
import { Calculator, Check, ArrowRight, Sparkles, Layers, Sliders } from 'lucide-react';
import { ColorMode, PaperSize, Sides, BindingType } from '../types';

interface InteractiveCostCalculatorProps {
  onStartOrder?: () => void;
}

export const InteractiveCostCalculator: React.FC<InteractiveCostCalculatorProps> = ({
  onStartOrder
}) => {
  const [pageCount, setPageCount] = useState<number>(35);
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [sides, setSides] = useState<Sides>('double');
  const [binding, setBinding] = useState<BindingType>('spiral');
  const [lamination, setLamination] = useState<boolean>(false);

  // Pricing constants (representative of Metro Xerox average)
  const baseRate = colorMode === 'bw' ? 1.50 : 8.00;
  const paperMultiplier = paperSize === 'A3' ? 2.2 : 1.0;
  const sidesDiscount = sides === 'double' ? 0.30 : 0.0;
  const effectivePerPage = Math.max(0.5, (baseRate - sidesDiscount) * paperMultiplier);

  const printTotal = pageCount * copies * effectivePerPage;
  const bindingCost = binding === 'spiral' ? 35 : binding === 'stapling' ? 5 : binding === 'hardcover' ? 120 : 0;
  const laminationCost = lamination ? (20 * copies) : 0;
  const subtotal = printTotal + bindingCost + laminationCost;
  const estimatedTax = subtotal * 0.05;
  const grandTotal = subtotal + estimatedTax;

  return (
    <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Decorative background grid and lighting */}
      <div className="absolute inset-0 bg-grid-subtle opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading and info */}
          <div className="lg:col-span-5 space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30">
              <Calculator className="w-3.5 h-3.5" />
              Live Pricing Engine
            </span>

            <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight leading-tight">
              Know your exact printing cost upfront.
            </h2>

            <p className="text-slate-300 text-base leading-relaxed">
              No hidden counter fees. No surprise surcharges for spiral binding or double-sided pages. Every rupee is calculated with real-time shop pricing.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                <span>Automatic double-sided paper discount applied</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                <span>Spiral binding includes transparent front & matte back cover</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                <span>Itemized digital tax invoice generated instantly</span>
              </div>
            </div>

            {onStartOrder && (
              <div className="pt-4">
                <button
                  onClick={onStartOrder}
                  className="px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-600/30 transition-all"
                >
                  <span>Start This Print Job</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Controls & Live Price Card */}
          <div className="lg:col-span-7 bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Controls Column */}
              <div className="space-y-5">
                {/* Page Slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-mono font-bold uppercase text-slate-400">Total Document Pages</label>
                    <span className="font-display font-extrabold text-xl text-white bg-slate-700 px-3 py-0.5 rounded-lg">
                      {pageCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="150"
                    value={pageCount}
                    onChange={(e) => setPageCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>1 page</span>
                    <span>75 pages</span>
                    <span>150 pages</span>
                  </div>
                </div>

                {/* Copies Count */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-mono font-bold uppercase text-slate-400">Number of Copies</label>
                    <span className="font-mono font-bold text-brand-300 text-sm">{copies} copy/set</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setCopies(num)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          copies === num
                            ? 'bg-brand-600 border-brand-500 text-white'
                            : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {num}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Mode */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-400 block mb-2">Color Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setColorMode('bw')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between ${
                        colorMode === 'bw'
                          ? 'bg-brand-600/20 border-brand-500 text-white ring-1 ring-brand-500'
                          : 'bg-slate-700/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>B&W Laser</span>
                      <span className="font-mono text-[10px] text-brand-300">₹1.50/pg</span>
                    </button>
                    <button
                      onClick={() => setColorMode('color')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center justify-between ${
                        colorMode === 'color'
                          ? 'bg-brand-600/20 border-brand-500 text-white ring-1 ring-brand-500'
                          : 'bg-slate-700/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>Color Gloss</span>
                      <span className="font-mono text-[10px] text-amber-300">₹8.00/pg</span>
                    </button>
                  </div>
                </div>

                {/* Sides */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-400 block mb-2">Print Sides</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSides('single')}
                      className={`py-2 rounded-lg text-xs font-bold border ${
                        sides === 'single'
                          ? 'bg-brand-600/20 border-brand-500 text-white'
                          : 'bg-slate-700/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      Single Sided
                    </button>
                    <button
                      onClick={() => setSides('double')}
                      className={`py-2 rounded-lg text-xs font-bold border ${
                        sides === 'double'
                          ? 'bg-brand-600/20 border-brand-500 text-white'
                          : 'bg-slate-700/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      Double Sided (-20%)
                    </button>
                  </div>
                </div>

                {/* Binding Options */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-400 block mb-2">Finishing & Binding</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'No Binding', price: 'Free' },
                      { id: 'stapling', label: 'Staple', price: '₹5' },
                      { id: 'spiral', label: 'Spiral Wire', price: '₹35' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBinding(b.id as BindingType)}
                        className={`p-2 rounded-lg text-center border text-[11px] font-semibold transition-all ${
                          binding === b.id
                            ? 'bg-brand-600 border-brand-400 text-white'
                            : 'bg-slate-700/30 border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="truncate">{b.label}</div>
                        <div className="text-[10px] font-mono text-slate-300 mt-0.5">{b.price}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Calculation Card Column */}
              <div className="bg-slate-900/90 rounded-2xl border border-slate-700/90 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-mono uppercase text-slate-400">Estimate Summary</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                      Live Rate
                    </span>
                  </div>

                  <div className="py-4 space-y-2.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Total impressions</span>
                      <span className="font-mono font-bold text-white">{pageCount * copies} pgs</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Paper & Printing</span>
                      <span className="font-mono text-white">₹{printTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Binding ({binding})</span>
                      <span className="font-mono text-white">₹{bindingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>GST (5%)</span>
                      <span className="font-mono">₹{estimatedTax.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-xs font-medium text-slate-400">Estimated Total:</span>
                    <div className="text-right">
                      <span className="font-display font-black text-3xl text-emerald-400">
                        ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Ready for pickup in ~12 mins at Metro Xerox</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

