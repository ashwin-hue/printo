import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Trash2, 
  ChevronLeft,
  Clock,
  Printer,
  ShieldCheck,
  FileCheck
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

  // Print Configuration state
  const [copies, setCopies] = useState<number>(2);
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [sides, setSides] = useState<Sides>('double');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [customPageRange, setCustomPageRange] = useState<string>('1-32');
  const [bindingType, setBindingType] = useState<BindingType>('spiral');
  const [lamination, setLamination] = useState<boolean>(false);
  const [specialInstructions, setSpecialInstructions] = useState<string>(
    'Please ensure clear margin on spine for spiral wire binding.'
  );

  // Calculate effective pages
  const calculatePagesFromRange = (): number => {
    if (!docMetadata) return 0;
    if (pageRangeMode === 'all') return docMetadata.pageCount;

    try {
      const parts = customPageRange.split(',').map(p => p.trim());
      let count = 0;
      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            count += Math.min(docMetadata.pageCount, end) - Math.max(1, start) + 1;
          }
        } else {
          const page = Number(part);
          if (!isNaN(page) && page >= 1 && page <= docMetadata.pageCount) {
            count += 1;
          }
        }
      }
      return count > 0 ? count : docMetadata.pageCount;
    } catch {
      return docMetadata.pageCount;
    }
  };

  const effectivePageCount = calculatePagesFromRange();

  // Pricing formula
  const baseRate = colorMode === 'bw' ? pricing.black_white_price : pricing.color_price;
  const paperMultiplier = pricing.paper_size_multipliers[paperSize] || 1.0;
  const doubleDiscount = sides === 'double' ? pricing.double_sided_discount : 0.0;
  const pricePerPage = Math.max(0.5, (baseRate - doubleDiscount) * paperMultiplier);

  const printSubtotal = effectivePageCount * copies * pricePerPage;
  const bindingCost = bindingType === 'spiral' 
    ? pricing.binding_price 
    : bindingType === 'stapling' 
    ? pricing.stapling_price 
    : bindingType === 'hardcover' 
    ? 120 
    : 0;

  const finishingCost = lamination ? (pricing.lamination_price * copies) : 0;
  const orderSubtotal = printSubtotal + bindingCost + finishingCost;
  const taxes = orderSubtotal * 0.05;
  const grandTotal = orderSubtotal + taxes;

  // File Upload Handler
  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setParseError('Only PDF documents are supported for high-precision laser printing.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setParseError('File size exceeds 50MB limit.');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const meta = await parsePdfFile(file);
      setDocumentFile(file);
      setDocMetadata(meta);
      setCustomPageRange(`1-${meta.pageCount}`);
    } catch (err: any) {
      setParseError(err.message || 'Failed to read PDF document. Please verify the file.');
    } finally {
      setIsParsing(false);
    }
  };

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
    <div className="py-12 bg-[#EEF0F2] text-[#0F1115] min-h-[calc(100vh-64px)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw] space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-4 border-b border-[#C4C9CF]/60">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 font-sans text-xs text-[#2A2E35] hover:text-[#0F1115] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#FF5A1F]" />
            <span>Return to Overview</span>
          </button>

          <span className="font-mono text-xs text-[#0F1115] bg-[#FFE1D3] px-3 py-1 rounded-full font-bold">
            CALIBRATION PROTOCOL // DIRECT LASER ROUTE
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Form: Left 8 Columns */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Step 1: Destination Hub */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#C4C9CF] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#EEF0F2]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold bg-[#0F1115] text-white px-3 py-1 rounded-full">
                    NODE 01
                  </span>
                  <div>
                    <h3 className="font-serif font-normal text-xl text-[#0F1115]">
                      Destination Printing Hub
                    </h3>
                    <p className="font-mono text-xs text-[#7A7F88]">Routing payload to hardware destination</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#FF5A1F] font-bold">
                  {currentShop.distance}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shops.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedShopId(s.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      selectedShopId === s.id
                        ? 'border-[#FF5A1F] bg-[#FFE1D3]/30 shadow-sm'
                        : 'border-[#C4C9CF] hover:border-[#8B9098] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="font-sans text-xs font-semibold text-[#0F1115] block truncate">
                        {s.shop_name}
                      </strong>
                      <span className="font-mono text-[10px] text-[#FF5A1F]">
                        {s.distance}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-[#7A7F88] mt-0.5 truncate">{s.address}</p>
                    <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-[#2A2E35]">
                      <span>₹{getShopPricing(s.id).black_white_price}/pg</span>
                      <span>•</span>
                      <span>~{s.avg_turnaround_mins}m turnaround</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Upload Document */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#C4C9CF] shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#EEF0F2]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold bg-[#0F1115] text-white px-3 py-1 rounded-full">
                    NODE 02
                  </span>
                  <div>
                    <h3 className="font-serif font-normal text-xl text-[#0F1115]">
                      Document Payload & Inspection
                    </h3>
                    <p className="font-mono text-xs text-[#7A7F88]">Real-time PDF.js client-side page extraction</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#8B9098]">PDF UP TO 50MB</span>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-[#C4C9CF] hover:border-[#FF5A1F] rounded-2xl p-8 text-center cursor-pointer bg-[#EEF0F2]/50 hover:bg-[#FFE1D3]/20 transition-all group"
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

                <div className="w-12 h-12 rounded-xl bg-white border border-[#C4C9CF] flex items-center justify-center mx-auto text-[#FF5A1F] group-hover:scale-105 transition-all">
                  <Upload className="w-5 h-5" />
                </div>

                <p className="mt-3 font-sans font-medium text-xs sm:text-sm text-[#0F1115]">
                  {isParsing ? 'Extracting page telemetry...' : 'Click to select or drag & drop your PDF file'}
                </p>
                <p className="font-mono text-[11px] text-[#7A7F88] mt-1">
                  Lab records, thesis drafts, lecture slides, CAD blueprints
                </p>
              </div>

              {/* Error Alert */}
              {parseError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-sans text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Document Loaded Preview */}
              {docMetadata && (
                <div className="p-4 rounded-2xl bg-[#EEF0F2] border border-[#C4C9CF] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0F1115] text-white flex items-center justify-center">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-sans font-medium text-xs sm:text-sm text-[#0F1115] truncate max-w-[200px] sm:max-w-md">
                        {docMetadata.fileName}
                      </p>
                      <p className="font-mono text-[10px] text-[#7A7F88] mt-0.5">
                        {docMetadata.pageCount} Pages • {(docMetadata.fileSize / 1024 / 1024).toFixed(2)} MB • Verified PDF Payload
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDocMetadata(null)}
                    className="p-2 text-[#8B9098] hover:text-rose-600 transition-colors"
                    title="Remove document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Preset Sample Documents */}
              <div className="pt-2">
                <span className="font-mono text-[11px] text-[#7A7F88] uppercase tracking-wider block mb-2">
                  Or test with 1-click preset academic files:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => loadPreset('record')}
                    className="h-7 px-3 rounded-full border border-[#C4C9CF] bg-white text-xs font-mono text-[#2A2E35] hover:border-[#FF5A1F] transition-all"
                  >
                    Lab Record (36 pgs)
                  </button>
                  <button
                    onClick={() => loadPreset('abstract')}
                    className="h-7 px-3 rounded-full border border-[#C4C9CF] bg-white text-xs font-mono text-[#2A2E35] hover:border-[#FF5A1F] transition-all"
                  >
                    Project Abstract (6 pgs)
                  </button>
                  <button
                    onClick={() => loadPreset('thesis')}
                    className="h-7 px-3 rounded-full border border-[#C4C9CF] bg-white text-xs font-mono text-[#2A2E35] hover:border-[#FF5A1F] transition-all"
                  >
                    Thesis (84 pgs)
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3: Configure Print Specifications */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#C4C9CF] shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EEF0F2]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold bg-[#0F1115] text-white px-3 py-1 rounded-full">
                    NODE 03
                  </span>
                  <div>
                    <h3 className="font-serif font-normal text-xl text-[#0F1115]">
                      Laser & Finishing Calibration
                    </h3>
                    <p className="font-mono text-xs text-[#7A7F88]">Configures feed, duplexing, and bind hardware</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#8B9098]">HARDWARE SPECS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Copies */}
                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-2">
                    Copies Required
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCopies(Math.max(1, copies - 1))}
                      className="w-9 h-9 rounded-full border border-[#C4C9CF] bg-[#EEF0F2] text-[#0F1115] font-mono text-base hover:bg-slate-200 transition-colors"
                    >
                      -
                    </button>
                    <span className="font-sans font-light text-2xl text-[#0F1115] w-10 text-center">
                      {copies}
                    </span>
                    <button
                      onClick={() => setCopies(copies + 1)}
                      className="w-9 h-9 rounded-full border border-[#C4C9CF] bg-[#EEF0F2] text-[#0F1115] font-mono text-base hover:bg-slate-200 transition-colors"
                    >
                      +
                    </button>
                    <span className="font-mono text-xs text-[#7A7F88] ml-2">
                      ({copies * effectivePageCount} total pgs)
                    </span>
                  </div>
                </div>

                {/* Color Mode */}
                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-2">
                    Color Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setColorMode('bw')}
                      className={`p-2.5 rounded-xl border text-xs font-sans text-left transition-all ${
                        colorMode === 'bw'
                          ? 'border-[#0F1115] bg-[#0F1115] text-white'
                          : 'border-[#C4C9CF] text-[#2A2E35] hover:bg-[#EEF0F2]'
                      }`}
                    >
                      <div className="font-medium">B&W Laser</div>
                      <div className="font-mono text-[10px] opacity-80 mt-0.5">₹{pricing.black_white_price}/pg</div>
                    </button>

                    <button
                      onClick={() => setColorMode('color')}
                      className={`p-2.5 rounded-xl border text-xs font-sans text-left transition-all ${
                        colorMode === 'color'
                          ? 'border-[#0F1115] bg-[#0F1115] text-white'
                          : 'border-[#C4C9CF] text-[#2A2E35] hover:bg-[#EEF0F2]'
                      }`}
                    >
                      <div className="font-medium">Color Gloss</div>
                      <div className="font-mono text-[10px] opacity-80 mt-0.5">₹{pricing.color_price}/pg</div>
                    </button>
                  </div>
                </div>

                {/* Sides */}
                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-2">
                    Sides Feed
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSides('double')}
                      className={`p-2.5 rounded-xl border text-xs font-sans text-left transition-all ${
                        sides === 'double'
                          ? 'border-[#0F1115] bg-[#0F1115] text-white'
                          : 'border-[#C4C9CF] text-[#2A2E35] hover:bg-[#EEF0F2]'
                      }`}
                    >
                      <div className="font-medium">Double-Sided</div>
                      <div className="font-mono text-[10px] text-[#FF5A1F] mt-0.5">Saves paper & fee</div>
                    </button>

                    <button
                      onClick={() => setSides('single')}
                      className={`p-2.5 rounded-xl border text-xs font-sans text-left transition-all ${
                        sides === 'single'
                          ? 'border-[#0F1115] bg-[#0F1115] text-white'
                          : 'border-[#C4C9CF] text-[#2A2E35] hover:bg-[#EEF0F2]'
                      }`}
                    >
                      <div className="font-medium">Single-Sided</div>
                      <div className="font-mono text-[10px] opacity-80 mt-0.5">Standard leaf</div>
                    </button>
                  </div>
                </div>

                {/* Size & Orientation */}
                <div>
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-2">
                    Paper Size & Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                      className="h-10 px-3 rounded-xl border border-[#C4C9CF] text-xs font-mono text-[#0F1115] bg-white focus:outline-none focus:border-[#FF5A1F]"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="A3">A3 (Plot/Poster)</option>
                      <option value="Letter">Letter</option>
                    </select>

                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as Orientation)}
                      className="h-10 px-3 rounded-xl border border-[#C4C9CF] text-xs font-mono text-[#0F1115] bg-white focus:outline-none focus:border-[#FF5A1F]"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>

                {/* Page Range */}
                <div className="sm:col-span-2">
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-2">
                    Page Range
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <button
                      onClick={() => setPageRangeMode('all')}
                      className={`h-9 px-4 rounded-full font-mono text-xs transition-all ${
                        pageRangeMode === 'all'
                          ? 'bg-[#0F1115] text-white'
                          : 'border border-[#C4C9CF] text-[#2A2E35]'
                      }`}
                    >
                      Print All ({docMetadata?.pageCount || 0} pgs)
                    </button>
                    <button
                      onClick={() => setPageRangeMode('custom')}
                      className={`h-9 px-4 rounded-full font-mono text-xs transition-all ${
                        pageRangeMode === 'custom'
                          ? 'bg-[#0F1115] text-white'
                          : 'border border-[#C4C9CF] text-[#2A2E35]'
                      }`}
                    >
                      Custom Range
                    </button>

                    {pageRangeMode === 'custom' && (
                      <input
                        type="text"
                        value={customPageRange}
                        onChange={(e) => setCustomPageRange(e.target.value)}
                        placeholder="e.g. 1-10, 14, 20-32"
                        className="flex-1 h-9 px-3 rounded-full border border-[#C4C9CF] font-mono text-xs text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                      />
                    )}
                  </div>
                </div>

                {/* Binding */}
                <div className="sm:col-span-2">
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-2">
                    Finishing & Binding
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'none', label: 'None', price: '₹0' },
                      { id: 'stapling', label: 'Corner Staple', price: `₹${pricing.stapling_price}` },
                      { id: 'spiral', label: 'Spiral Wire', price: `₹${pricing.binding_price}` },
                      { id: 'hardcover', label: 'Hardcover Thesis', price: '₹120' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBindingType(b.id as BindingType)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          bindingType === b.id
                            ? 'border-[#FF5A1F] bg-[#FFE1D3]/50 text-[#0F1115]'
                            : 'border-[#C4C9CF] text-[#2A2E35] hover:bg-[#EEF0F2]'
                        }`}
                      >
                        <p className="font-medium text-xs truncate">{b.label}</p>
                        <p className="font-mono text-[10px] text-[#7A7F88] mt-0.5">{b.price}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-[#EEF0F2] border border-[#C4C9CF]/60">
                    <label className="flex items-center gap-2 text-xs font-sans text-[#2A2E35] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lamination}
                        onChange={(e) => setLamination(e.target.checked)}
                        className="rounded accent-[#FF5A1F]"
                      />
                      <span>Thermal lamination on outer front/back covers (+₹{pricing.lamination_price})</span>
                    </label>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="sm:col-span-2">
                  <label className="font-mono text-xs uppercase text-[#7A7F88] block mb-2">
                    Operator Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Ensure clear left margin for spiral wire. Center double-sided pages."
                    className="w-full p-3 rounded-xl border border-[#C4C9CF] font-sans text-xs text-[#0F1115] focus:outline-none focus:border-[#FF5A1F]"
                  />
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Order Summary & Checkout Card */}
          <div className="lg:col-span-4 sticky top-24 space-y-4">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#C4C9CF] shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#EEF0F2]">
                <h3 className="font-serif font-normal text-xl text-[#0F1115]">
                  Order Telemetry
                </h3>
                <span className="font-mono text-[10px] bg-[#FFE1D3] text-[#D9430F] px-2 py-0.5 rounded-full font-bold">
                  VERIFIED
                </span>
              </div>

              {/* Itemized lines */}
              <div className="space-y-2.5 font-sans text-xs text-[#2A2E35]">
                <div className="flex justify-between">
                  <span className="text-[#7A7F88]">Shop Hub</span>
                  <span className="font-medium text-[#0F1115] truncate max-w-[150px]">{currentShop.shop_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A7F88]">File</span>
                  <span className="font-medium text-[#0F1115] truncate max-w-[150px]">{docMetadata?.fileName || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A7F88]">Pages</span>
                  <span className="font-mono text-[#0F1115]">{effectivePageCount} pgs × {copies} = {effectivePageCount * copies} pgs</span>
                </div>
                <div className="flex justify-between border-t border-[#EEF0F2] pt-2">
                  <span className="text-[#7A7F88]">Laser Print</span>
                  <span className="font-mono font-medium text-[#0F1115]">₹{printSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A7F88]">Binding ({bindingType})</span>
                  <span className="font-mono font-medium text-[#0F1115]">₹{bindingCost.toFixed(2)}</span>
                </div>
                {finishingCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#7A7F88]">Lamination</span>
                    <span className="font-mono font-medium text-[#0F1115]">₹{finishingCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#8B9098]">
                  <span>Tax & GST (5%)</span>
                  <span className="font-mono">₹{taxes.toFixed(2)}</span>
                </div>
              </div>

              {/* Total Banner */}
              <div className="pt-4 border-t border-[#EEF0F2] flex items-baseline justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase text-[#7A7F88] block">Total Payable</span>
                  <span className="font-mono text-[11px] text-emerald-600 font-medium">No counter markup</span>
                </div>
                <span className="font-sans font-light text-3xl sm:text-4xl text-[#0F1115] tracking-tight">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Turnaround Pill */}
              <div className="p-3 rounded-xl bg-[#EEF0F2] text-xs font-sans text-[#2A2E35] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#FF5A1F] shrink-0" />
                <span>Estimated ready in <strong>~{currentShop.avg_turnaround_mins} mins</strong> after dispatch.</span>
              </div>

              {/* Dispatch Action Button */}
              <button
                onClick={handleSubmitOrder}
                disabled={!docMetadata}
                className={`w-full h-11 px-5 rounded-full font-sans font-medium text-xs tracking-wide flex items-center justify-center gap-2 transition-all ${
                  docMetadata
                    ? 'bg-[#FF5A1F] hover:bg-[#E84E16] text-white shadow-sm hover:-translate-y-0.5'
                    : 'bg-[#C4C9CF] text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Dispatch to Print Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="font-mono text-[10px] text-[#8B9098] text-center">
                30-second token pass issued upon completion
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
