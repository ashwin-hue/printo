import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Trash2, 
  Layers, 
  Sliders, 
  FileCheck,
  ChevronLeft,
  Info,
  Clock,
  Printer,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Shop, 
  ShopPricing, 
  Order, 
  OrderDocument, 
  ColorMode, 
  PaperSize, 
  Sides, 
  Orientation, 
  BindingType 
} from '../types';
import { 
  getShops, 
  getShopPricing, 
  createOrder, 
  getCurrentUser 
} from '../services/storage';
import { parsePdfFile } from '../services/pdfService';

interface OrderWizardProps {
  initialShopId?: string;
  onOrderCompleted: (orderId: string) => void;
  onCancel: () => void;
}

export const OrderWizard: React.FC<OrderWizardProps> = ({
  initialShopId,
  onOrderCompleted,
  onCancel
}) => {
  const user = getCurrentUser();
  const shops = getShops();
  const [selectedShopId, setSelectedShopId] = useState<string>(
    initialShopId || (shops[0]?.id ?? 'shop-1')
  );

  const currentShop = shops.find(s => s.id === selectedShopId) || shops[0];
  const pricing = getShopPricing(selectedShopId);

  // Document state
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [docMetadata, setDocMetadata] = useState<{
    fileName: string;
    pageCount: number;
    fileSize: number;
    dataUrl: string;
  } | null>({
    fileName: 'Machine_Learning_Term_Paper_Final.pdf',
    pageCount: 32,
    fileSize: 2456000,
    dataUrl: '',
  });

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration options
  const [copies, setCopies] = useState<number>(1);
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [sides, setSides] = useState<Sides>('double');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [customPageRange, setCustomPageRange] = useState<string>('1-32');
  const [bindingType, setBindingType] = useState<BindingType>('spiral');
  const [lamination, setLamination] = useState<boolean>(false);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  // Calculate pages to print based on page range
  const calculateEffectivePages = (): number => {
    if (!docMetadata) return 0;
    if (pageRangeMode === 'all') return docMetadata.pageCount;

    try {
      const parts = customPageRange.split(',').map(p => p.trim());
      let count = 0;
      parts.forEach(part => {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(n => parseInt(n));
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            count += (end - start + 1);
          }
        } else {
          const num = parseInt(part);
          if (!isNaN(num)) count += 1;
        }
      });
      return Math.max(1, Math.min(count, docMetadata.pageCount * 2));
    } catch {
      return docMetadata.pageCount;
    }
  };

  const effectivePageCount = calculateEffectivePages();

  // Price Calculation
  const baseRate = colorMode === 'bw' ? pricing.black_white_price : pricing.color_price;
  const paperMult = pricing.paper_size_multipliers[paperSize] || 1.0;
  const sideDiscount = sides === 'double' ? pricing.double_sided_discount : 0.0;
  const effectivePerPage = Math.max(0.5, (baseRate - sideDiscount) * paperMult);

  const printSubtotal = effectivePageCount * copies * effectivePerPage;
  const bindingCost = bindingType === 'spiral' 
    ? pricing.binding_price 
    : bindingType === 'stapling' 
      ? pricing.stapling_price 
      : bindingType === 'hardcover' 
        ? 120 
        : 0;

  const finishingCost = (lamination ? pricing.lamination_price : 0) * copies;
  const subtotalBeforeTax = printSubtotal + bindingCost + finishingCost;
  const taxes = subtotalBeforeTax * 0.05;
  const grandTotal = Math.round((subtotalBeforeTax + taxes) * 100) / 100;

  // Handle Real File Upload
  const handleFileUpload = async (file: File) => {
    setParseError(null);
    setIsParsing(true);
    try {
      const meta = await parsePdfFile(file);
      setDocumentFile(file);
      setDocMetadata({
        fileName: meta.fileName,
        pageCount: meta.pageCount,
        fileSize: meta.fileSize,
        dataUrl: meta.dataUrl,
      });
      setCustomPageRange(`1-${meta.pageCount}`);
    } catch (err: any) {
      setParseError(err.message || 'Failed to read PDF document. Please verify the file.');
    } finally {
      setIsParsing(false);
    }
  };

  // Preset quick-sample documents for instant 1-click testing
  const loadPreset = (preset: 'record' | 'abstract' | 'thesis') => {
    if (preset === 'record') {
      setDocMetadata({
        fileName: 'Computer_Networks_Lab_Record_Final.pdf',
        pageCount: 36,
        fileSize: 3450000,
        dataUrl: '',
      });
      setCustomPageRange('1-36');
      setBindingType('spiral');
    } else if (preset === 'abstract') {
      setDocMetadata({
        fileName: 'Robotics_Sensor_Fusion_Abstract.pdf',
        pageCount: 6,
        fileSize: 980000,
        dataUrl: '',
      });
      setCustomPageRange('1-6');
      setBindingType('stapling');
    } else {
      setDocMetadata({
        fileName: 'Final_Year_BTech_Thesis_Submission.pdf',
        pageCount: 84,
        fileSize: 12400000,
        dataUrl: '',
      });
      setCustomPageRange('1-84');
      setBindingType('hardcover');
    }
  };

  // Submit Order
  const handleSubmitOrder = () => {
    if (!docMetadata) {
      setParseError('Please upload or select a document to print.');
      return;
    }

    const newOrderId = `ord-${Date.now().toString().slice(-6)}`;
    const orderNum = `PRN-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: newOrderId,
      order_number: orderNum,
      customer_id: user.id,
      customer_name: user.name,
      customer_phone: user.phone || '+91 98765 43210',
      shop_id: currentShop.id,
      shop_name: currentShop.shop_name,
      status: 'pending',
      document: {
        id: `doc-${Date.now()}`,
        customer_id: user.id,
        order_id: newOrderId,
        file_name: docMetadata.fileName,
        file_size: docMetadata.fileSize,
        page_count: docMetadata.pageCount,
        file_url: docMetadata.dataUrl,
        created_at: new Date().toISOString(),
      },
      copies,
      color_mode: colorMode,
      paper_size: paperSize,
      sides,
      orientation,
      page_range: pageRangeMode === 'all' ? 'all' : customPageRange,
      binding_type: bindingType,
      lamination,
      special_instructions: specialInstructions,
      total_pages_to_print: effectivePageCount * copies,
      cost_breakdown: {
        paper_and_print: printSubtotal,
        binding: bindingCost,
        finishing: finishingCost,
        taxes,
      },
      total_price: grandTotal,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      estimated_pickup_time: `Ready in ~${currentShop.avg_turnaround_mins} mins`,
    };

    createOrder(newOrder);

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {}

    onOrderCompleted(newOrderId);
  };

  return (
    <div className="py-12 bg-dot-subtle min-h-[calc(100vh-80px)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Directory
          </button>

          <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            DISPATCH PIPELINE // CALIBRATION MODE
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Form: Left 8 Columns */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Step 1: Select Target Shop */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-premium space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold bg-brand-700 text-white px-3 py-1 rounded-xl shadow-sm">
                    NODE 01
                  </span>
                  <div>
                    <h3 className="font-display font-black text-lg text-slate-900">
                      Destination Printing Hub
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">Routing print job to verified hardware</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-600 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {currentShop.distance}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {shops.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedShopId(s.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      selectedShopId === s.id
                        ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-slate-900 block truncate">
                        {s.shop_name}
                      </strong>
                      <span className="text-[10px] font-mono text-brand-700 font-bold">
                        {s.distance}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{s.address}</p>
                    <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-slate-600">
                      <span className="font-bold text-slate-900">₹{getShopPricing(s.id).black_white_price}/pg</span>
                      <span>•</span>
                      <span>~{s.avg_turnaround_mins}m queue</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Upload Document */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-premium space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold bg-brand-700 text-white px-3 py-1 rounded-xl shadow-sm">
                    NODE 02
                  </span>
                  <div>
                    <h3 className="font-display font-black text-lg text-slate-900">
                      Document Payload & Inspection
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">Real-time PDF.js client-side page parser</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-mono font-bold">PDF UP TO 50MB</span>
              </div>

              {/* Drag and Drop Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-3xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-brand-50/20 transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-brand-700 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all">
                  <Upload className="w-7 h-7" />
                </div>

                <p className="mt-4 font-display font-bold text-sm text-slate-900">
                  {isParsing ? 'Inspecting PDF page telemetry...' : 'Click to upload or drag & drop your PDF'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Academic practical records, lab assignments, project reports, or CAD drawings
                </p>
              </div>

              {/* Parse Error Notification */}
              {parseError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Document Loaded Preview Pill */}
              {docMetadata && (
                <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-[200px] sm:max-w-md">
                        {docMetadata.fileName}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {docMetadata.pageCount} Pages • {(docMetadata.fileSize / 1024 / 1024).toFixed(2)} MB • Verified PDF
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDocMetadata(null)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Preset 1-Click Test Documents */}
              <div className="pt-2">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Or test with 1-click sample documents:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => loadPreset('record')}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-brand-500 bg-white text-xs font-semibold text-slate-700 hover:text-brand-700 transition-all"
                  >
                    📘 Lab Practical Record (36 pgs)
                  </button>
                  <button
                    onClick={() => loadPreset('abstract')}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-brand-500 bg-white text-xs font-semibold text-slate-700 hover:text-brand-700 transition-all"
                  >
                    📄 Project Abstract (6 pgs)
                  </button>
                  <button
                    onClick={() => loadPreset('thesis')}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-brand-500 bg-white text-xs font-semibold text-slate-700 hover:text-brand-700 transition-all"
                  >
                    📚 Capstone Thesis (84 pgs)
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Configure Print Specifications */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-premium space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold bg-brand-700 text-white px-3 py-1 rounded-xl shadow-sm">
                    NODE 03
                  </span>
                  <div>
                    <h3 className="font-display font-black text-lg text-slate-900">
                      Laser & Finishing Calibration
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">Configures machine paper feed, orientation and binding</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-mono font-bold">HARDWARE SPECS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Copies Count */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-500 block mb-2">
                    Copies Required
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCopies(Math.max(1, copies - 1))}
                      className="w-11 h-11 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-black text-lg hover:bg-slate-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-display font-black text-2xl text-slate-900 w-12 text-center">
                      {copies}
                    </span>
                    <button
                      onClick={() => setCopies(copies + 1)}
                      className="w-11 h-11 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-black text-lg hover:bg-slate-100 transition-colors"
                    >
                      +
                    </button>
                    <span className="text-xs text-slate-500 font-medium ml-2 font-mono">
                      ({copies * effectivePageCount} total pages)
                    </span>
                  </div>
                </div>

                {/* Color Mode */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-500 block mb-2">
                    Color Calibration
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setColorMode('bw')}
                      className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center justify-between ${
                        colorMode === 'bw'
                          ? 'border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>B&W Laser</span>
                      <span className="font-mono text-[10px] text-brand-700">₹{pricing.black_white_price}/pg</span>
                    </button>
                    <button
                      onClick={() => setColorMode('color')}
                      className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center justify-between ${
                        colorMode === 'color'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Color Gloss</span>
                      <span className="font-mono text-[10px] text-indigo-700">₹{pricing.color_price}/pg</span>
                    </button>
                  </div>
                </div>

                {/* Sides: Single vs Double */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-500 block mb-2">
                    Paper Feed Sides
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSides('double')}
                      className={`p-3 rounded-2xl border text-xs font-bold text-center ${
                        sides === 'double'
                          ? 'border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Double-Sided</span>
                      <span className="block text-[10px] font-mono font-normal text-emerald-600 mt-0.5">Saves paper & fee</span>
                    </button>
                    <button
                      onClick={() => setSides('single')}
                      className={`p-3 rounded-2xl border text-xs font-bold text-center ${
                        sides === 'single'
                          ? 'border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>Single-Sided</span>
                      <span className="block text-[10px] font-mono font-normal text-slate-500 mt-0.5">Standard leaf</span>
                    </button>
                  </div>
                </div>

                {/* Paper Size & Orientation */}
                <div>
                  <label className="text-xs font-mono font-bold uppercase text-slate-500 block mb-2">
                    Paper Size & Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                      className="p-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="A3">A3 (Cad / Poster)</option>
                      <option value="Letter">Letter Format</option>
                    </select>

                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as Orientation)}
                      className="p-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>

                {/* Page Range Selection */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-mono font-bold uppercase text-slate-500 block mb-2">
                    Page Range Selection
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPageRangeMode('all')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${
                          pageRangeMode === 'all'
                            ? 'bg-brand-50 border-brand-600 text-brand-900'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Print All ({docMetadata?.pageCount || 0} pages)
                      </button>
                      <button
                        onClick={() => setPageRangeMode('custom')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${
                          pageRangeMode === 'custom'
                            ? 'bg-brand-50 border-brand-600 text-brand-900'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Custom Range
                      </button>
                    </div>

                    {pageRangeMode === 'custom' && (
                      <input
                        type="text"
                        value={customPageRange}
                        onChange={(e) => setCustomPageRange(e.target.value)}
                        placeholder="e.g. 1-10, 14, 20-32"
                        className="flex-1 w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    )}
                  </div>
                </div>

                {/* Binding & Finishing */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-mono font-bold uppercase text-slate-500 block mb-2">
                    Binding & Finishing
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'none', label: 'No Binding', price: 'Free' },
                      { id: 'stapling', label: 'Stapling', price: `₹${pricing.stapling_price}` },
                      { id: 'spiral', label: 'Spiral Wire', price: `₹${pricing.binding_price}` },
                      { id: 'hardcover', label: 'Hardcover Thesis', price: '₹120' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBindingType(b.id as BindingType)}
                        className={`p-3.5 rounded-2xl border text-center transition-all ${
                          bindingType === b.id
                            ? 'border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20 font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-xs">{b.label}</p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{b.price}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lamination}
                        onChange={(e) => setLamination(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span className="font-semibold">Add Thermal Lamination to Outer Covers (+₹{pricing.lamination_price})</span>
                    </label>
                  </div>
                </div>

                {/* Special Instructions for Shop Owner */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-mono font-bold uppercase text-slate-500 block mb-2">
                    Special Instructions for Shop Owner (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Ensure clear margin on left for spiral binding spine. Staple top-left corner firmly."
                    className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Order Summary & Checkout Card */}
          <div className="lg:col-span-4 sticky top-28 space-y-4">
            <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-200/80 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  Order Summary
                </h3>
                <span className="text-[10px] font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-bold">
                  LIVE ESTIMATE
                </span>
              </div>

              {/* Itemized breakdown */}
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Printing Shop</span>
                  <strong className="text-slate-900 truncate max-w-[150px]">{currentShop.shop_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Document</span>
                  <strong className="text-slate-900 truncate max-w-[150px]">{docMetadata?.fileName || 'None'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Pages to print</span>
                  <strong className="text-slate-900 font-mono">{effectivePageCount} pgs × {copies} copy = {effectivePageCount * copies} pgs</strong>
                </div>
                <div className="flex justify-between">
                  <span>Paper & Laser Print</span>
                  <span className="font-mono font-bold text-slate-900">₹{printSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Binding ({bindingType})</span>
                  <span className="font-mono font-bold text-slate-900">₹{bindingCost.toFixed(2)}</span>
                </div>
                {finishingCost > 0 && (
                  <div className="flex justify-between">
                    <span>Lamination</span>
                    <span className="font-mono font-bold text-slate-900">₹{finishingCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>GST & Service (5%)</span>
                  <span className="font-mono">₹{taxes.toFixed(2)}</span>
                </div>
              </div>

              {/* Total Banner */}
              <div className="pt-4 border-t border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Total Payable</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Pay at counter or online</span>
                </div>
                <span className="font-display font-black text-3xl text-brand-700">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Queue turnaround notice */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Estimated ready in <strong>~{currentShop.avg_turnaround_mins} minutes</strong> after submission.</span>
              </div>

              {/* Submit CTA */}
              <button
                onClick={handleSubmitOrder}
                disabled={!docMetadata}
                className={`w-full py-4 px-5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  docMetadata
                    ? 'bg-brand-700 hover:bg-brand-800 text-white shadow-xl shadow-brand-700/25 hover:-translate-y-0.5'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Confirm & Send to Print Shop</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-slate-400 text-center font-mono">
                🔒 Private SSL Pipe • Cancelable before laser start
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
