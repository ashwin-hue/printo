import React, { useState } from 'react';
import { Calculator, Check, ArrowRight, Sparkles, Sliders } from 'lucide-react';
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

  // Pricing constants (standard academic rates)
  const baseRate = colorMode === 'bw' ? 1.50 : 8.00;
  const paperMultiplier = paperSize === 'A3' ? 2.2 : 1.0;
  const sidesDiscount = sides === 'double' ? 0.25 : 0.0;
  const effectivePerPage = Math.max(0.5, (baseRate - sidesDiscount) * paperMultiplier);

  const printTotal = pageCount * copies * effectivePerPage;
  const bindingCost = binding === 'spiral' ? 35 : binding === 'stapling' ? 5 : binding === 'hardcover' ? 120 : 0;
  const laminationCost = lamination ? (20 * copies) : 0;
  const subtotal = printTotal + bindingCost + laminationCost;
  const estimatedTax = subtotal * 0.05;
  const grandTotal = subtotal + estimatedTax;

  return (
    <section className="py-20 lg:py-28 bg-[#EEF0F2] text-[#0F1115] border-t border-[#C4C9CF]/60">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw]">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Heading & Telemetry Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="font-mono font-medium text-[11.5px] tracking-[0.06em] uppercase text-[#2A2E35] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
              INSTANT COST CALCULATION
            </div>

            <h2 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl leading-[1.08] tracking-[-0.025em] text-[#0F1115]">
              Real-time pricing.<br />
              <em className="italic text-[#0F1115]/90">No counter surprises.</em>
            </h2>

            <p className="font-sans text-sm sm:text-base text-[#2A2E35] leading-relaxed">
              Standardized campus laser rates with automatic discounts for double-sided printing. Toggle page counts, binding styles, and finishes below to calculate your exact payload cost.
            </p>

            {/* Spec Highlights */}
            <div className="pt-4 space-y-2.5 font-sans text-xs sm:text-sm text-[#2A2E35]">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#FFE1D3] text-[#D9430F] flex items-center justify-center font-bold text-[10px]">✓</span>
                <span>Automatic 40% paper discount on duplex printing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#FFE1D3] text-[#D9430F] flex items-center justify-center font-bold text-[10px]">✓</span>
                <span>Fixed academic rates for spiral, staple & thesis binding</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#FFE1D3] text-[#D9430F] flex items-center justify-center font-bold text-[10px]">✓</span>
                <span>GST-compliant printable digital invoice</span>
              </div>
            </div>

            {/* Summary Price Box */}
            <div className="mt-6 p-6 rounded-2xl bg-white border border-[#C4C9CF] shadow-sm">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-[#7A7F88]">Calculated Total</div>
                  <div className="font-sans font-light text-4xl sm:text-5xl text-[#0F1115] mt-1 tracking-tight">
                    ₹{grandTotal.toFixed(2)}
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-[#7A7F88]">
                  <span>{pageCount * copies} printed pages</span>
                  <div className="text-[#FF5A1F] font-medium mt-0.5">Ready in ~12 mins</div>
                </div>
              </div>

              {onStartOrder && (
                <button
                  onClick={onStartOrder}
                  className="w-full mt-5 h-10 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-sans font-medium text-xs shadow-sm hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <span>Start Order With This Configuration</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Calculator Controls Panel (White Card) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#C4C9CF] p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Page Count Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-sans font-medium text-xs sm:text-sm text-[#0F1115]">Document Page Count</label>
                <span className="font-mono text-sm font-bold text-[#FF5A1F] bg-[#FFE1D3] px-2.5 py-0.5 rounded-full">
                  {pageCount} pages
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="250"
                value={pageCount}
                onChange={(e) => setPageCount(Number(e.target.value))}
                className="w-full h-1.5 bg-[#EEF0F2] rounded-lg appearance-none cursor-pointer accent-[#FF5A1F]"
              />
              <div className="flex justify-between font-mono text-[10px] text-[#8B9098]">
                <span>1 page</span>
                <span>50</span>
                <span>100</span>
                <span>150</span>
                <span>250 pages</span>
              </div>
            </div>

            {/* Copies Count */}
            <div className="space-y-2 border-t border-[#EEF0F2] pt-4">
              <label className="font-sans font-medium text-xs sm:text-sm text-[#0F1115]">Number of Copies</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 5, 10].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCopies(c)}
                    className={`h-8 px-4 rounded-full font-mono text-xs transition-all ${
                      copies === c
                        ? 'bg-[#0F1115] text-white shadow-sm'
                        : 'bg-[#EEF0F2] text-[#2A2E35] hover:bg-slate-200'
                    }`}
                  >
                    {c} {c === 1 ? 'copy' : 'copies'}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Mode */}
            <div className="space-y-2 border-t border-[#EEF0F2] pt-4">
              <label className="font-sans font-medium text-xs sm:text-sm text-[#0F1115]">Print Color Palette</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setColorMode('bw')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    colorMode === 'bw'
                      ? 'border-[#0F1115] bg-[#0D1017] text-white'
                      : 'border-[#C4C9CF] bg-white text-[#0F1115] hover:bg-[#EEF0F2]'
                  }`}
                >
                  <div className="font-mono text-xs uppercase opacity-70">1200 DPI Laser</div>
                  <div className="font-sans font-semibold text-sm mt-0.5">Black & White</div>
                  <div className="font-mono text-xs mt-1 text-[#FF5A1F]">₹1.50 / page</div>
                </button>

                <button
                  type="button"
                  onClick={() => setColorMode('color')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    colorMode === 'color'
                      ? 'border-[#0F1115] bg-[#0D1017] text-white'
                      : 'border-[#C4C9CF] bg-white text-[#0F1115] hover:bg-[#EEF0F2]'
                  }`}
                >
                  <div className="font-mono text-xs uppercase opacity-70">High-Res CMYK</div>
                  <div className="font-sans font-semibold text-sm mt-0.5">Vibrant Color</div>
                  <div className="font-mono text-xs mt-1 text-[#FF5A1F]">₹8.00 / page</div>
                </button>
              </div>
            </div>

            {/* Sides / Duplex */}
            <div className="space-y-2 border-t border-[#EEF0F2] pt-4">
              <label className="font-sans font-medium text-xs sm:text-sm text-[#0F1115]">Printing Sides</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSides('single')}
                  className={`p-3 rounded-xl border text-left text-xs font-sans ${
                    sides === 'single'
                      ? 'border-[#0F1115] bg-[#0F1115] text-white'
                      : 'border-[#C4C9CF] text-[#2A2E35] hover:bg-[#EEF0F2]'
                  }`}
                >
                  <span className="font-medium block">Single-Sided</span>
                  <span className="opacity-70 text-[11px]">1 sheet per page</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSides('double')}
                  className={`p-3 rounded-xl border text-left text-xs font-sans ${
                    sides === 'double'
                      ? 'border-[#0F1115] bg-[#0F1115] text-white'
                      : 'border-[#C4C9CF] text-[#2A2E35] hover:bg-[#EEF0F2]'
                  }`}
                >
                  <span className="font-medium block flex items-center justify-between">
                    <span>Double-Sided</span>
                    <span className="text-[10px] text-[#FF5A1F] font-mono">SAVE ₹0.25</span>
                  </span>
                  <span className="opacity-70 text-[11px]">Duplex paper saving</span>
                </button>
              </div>
            </div>

            {/* Binding Type */}
            <div className="space-y-2 border-t border-[#EEF0F2] pt-4">
              <label className="font-sans font-medium text-xs sm:text-sm text-[#0F1115]">Finishing & Binding</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'None', cost: '₹0' },
                  { id: 'stapling', label: 'Corner Staple', cost: '₹5' },
                  { id: 'spiral', label: 'Spiral Coil', cost: '₹35' },
                  { id: 'hardcover', label: 'Hardcover Thesis', cost: '₹120' },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBinding(b.id as BindingType)}
                    className={`p-2.5 rounded-xl border text-left text-xs ${
                      binding === b.id
                        ? 'border-[#FF5A1F] bg-[#FFE1D3]/50 text-[#0F1115]'
                        : 'border-[#C4C9CF] text-[#2A2E35] hover:bg-[#EEF0F2]'
                    }`}
                  >
                    <span className="font-medium block truncate">{b.label}</span>
                    <span className="font-mono text-[10px] text-[#7A7F88]">{b.cost}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
