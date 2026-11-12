import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import type { Order } from '../types/database';
import type {
  DetectedPrinter,
  OsPrintJobState,
  OsPrintJobStatusResult,
} from '../services/localPrinters';
import {
  cancelOsPrintJob,
  openBrowserPrintSheet,
  pollOsPrintJobStatus,
  startOsPrintJob,
} from '../services/localPrinters';
import {
  parsePageRangeList,
  renderBlobToPrintablePages,
  type RenderedPrintPage,
} from '../services/pdfService';
import { downloadBucketFileBlob } from '../services/nhostDb';
import { getCustomerOtp } from '../utils/otp';

interface PrintDispatchModalProps {
  order: Order;
  detectedPrinters: DetectedPrinter[];
  initialPrinterId?: string;
  spoolerEndpointMode: 'dev' | 'bridge' | null;
  onRefreshPrinters: () => Promise<void>;
  onCompleteOrder: (order: Order) => Promise<{ ok: boolean; message: string }>;
  onClose: () => void;
}

type ModalPhase =
  | 'loading_doc'
  | 'ready'
  | 'spooling'
  | 'printing'
  | 'browser_dialog_open'
  | 'awaiting_browser_confirm'
  | 'paper_out'
  | 'paper_jam'
  | 'offline'
  | 'paused'
  | 'cancelled'
  | 'error'
  | 'completing_db'
  | 'completed';

const BROWSER_DIALOG_ID = '__browser_native_dialog__';

export const PrintDispatchModal: React.FC<PrintDispatchModalProps> = ({
  order,
  detectedPrinters,
  initialPrinterId,
  spoolerEndpointMode,
  onRefreshPrinters,
  onCompleteOrder,
  onClose,
}) => {
  const docItem = order.order_documents?.[0];
  const fileId = docItem?.document?.storage_file_id;
  const fileName = docItem?.document?.file_name || 'Customer Document.pdf';
  const customerIdNo = getCustomerOtp(order.customer_id || order.customer?.id);

  // Pick initial printer destination: OS Spooler printer if bridge active, else Browser Print Dialog
  const osPrinters = useMemo(
    () => detectedPrinters.filter((p) => p.source === 'OS Spooler'),
    [detectedPrinters]
  );

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(() => {
    if (
      initialPrinterId &&
      osPrinters.some((p) => p.id === initialPrinterId) &&
      spoolerEndpointMode
    ) {
      return initialPrinterId;
    }
    if (spoolerEndpointMode && osPrinters.length > 0) {
      return (osPrinters.find((p) => p.isDefault) || osPrinters[0]).id;
    }
    return BROWSER_DIALOG_ID;
  });

  // Editable print settings initialized from the customer's requested job options
  const [copies, setCopies] = useState<number>(Math.max(1, order.total_copies || docItem?.copies || 1));
  const [pageRange, setPageRange] = useState<string>(docItem?.page_range || 'All');
  const [colorMode, setColorMode] = useState<'B&W' | 'Color'>(
    String(docItem?.color_mode || '').toLowerCase().includes('color') ? 'Color' : 'B&W'
  );
  const [paperSize, setPaperSize] = useState<string>(docItem?.paper_size || 'A4');
  const [sides, setSides] = useState<'Single' | 'Double'>(
    String(docItem?.sides || '').toLowerCase().includes('double') ? 'Double' : 'Single'
  );
  const [orientation, setOrientation] = useState<'Portrait' | 'Landscape'>(
    String(docItem?.orientation || '').toLowerCase().includes('land') ? 'Landscape' : 'Portrait'
  );

  const [phase, setPhase] = useState<ModalPhase>('loading_doc');
  const [statusMessage, setStatusMessage] = useState<string>('Buffering document into RAM preview...');
  const [allPages, setAllPages] = useState<RenderedPrintPage[]>([]);
  const [totalDocPages, setTotalDocPages] = useState<number>(order.total_pages || 1);
  const [pagesPrinted, setPagesPrinted] = useState<number>(0);
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null);
  const rawBlobRef = useRef<Blob | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const finalizingRef = useRef(false);

  const selectedOsPrinter = useMemo(
    () => osPrinters.find((p) => p.id === selectedPrinterId) || null,
    [osPrinters, selectedPrinterId]
  );

  // Pages matching the edited Page Range filter
  const selectedPageNumbers = useMemo(
    () => parsePageRangeList(pageRange, allPages.length || totalDocPages),
    [pageRange, allPages.length, totalDocPages]
  );

  const filteredPages = useMemo(() => {
    const allowed = new Set(selectedPageNumbers);
    return allPages.filter((p) => allowed.has(p.pageNumber));
  }, [allPages, selectedPageNumbers]);

  // Load & render document pages directly in RAM on open (zero Downloads folder write)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!fileId) {
        setPhase('error');
        setStatusMessage('No storage file attached to this print order.');
        return;
      }
      setPhase('loading_doc');
      setStatusMessage('Loading document preview in browser RAM (no file download)...');
      try {
        const blob = await downloadBucketFileBlob(fileId);
        if (!blob) {
          throw new Error('Could not load document bytes from storage.');
        }
        rawBlobRef.current = blob;
        const rendered = await renderBlobToPrintablePages(blob, {
          fileName,
          mimeType: docItem?.document?.mime_type || blob.type,
          scale: 1.85,
          grayscale: false,
        });
        if (cancelled) return;
        setAllPages(rendered.pages);
        setTotalDocPages(rendered.totalPages);
        setPhase('ready');
        setStatusMessage('Ready to print. Review options and click Start Printing.');
      } catch (err: any) {
        if (cancelled) return;
        setPhase('error');
        setStatusMessage(err?.message || 'Failed to render document preview.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileId, fileName, docItem?.document?.mime_type]);

  // Cleanup active polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const finalizePrintedJob = async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    stopPolling();
    setPhase('completing_db');
    setStatusMessage('Printing finished! Sending notification to customer & clearing job...');
    const res = await onCompleteOrder(order);
    if (res.ok) {
      setPhase('completed');
      setStatusMessage(res.message);
      window.setTimeout(() => onClose(), 1100);
    } else {
      finalizingRef.current = false;
      setPhase('error');
      setStatusMessage(res.message);
    }
  };

  const handleSpoolerSnapshot = (snap: OsPrintJobStatusResult) => {
    if (typeof snap.pagesPrinted === 'number') setPagesPrinted(snap.pagesPrinted);
    if (snap.message) setStatusMessage(snap.message);

    const st: OsPrintJobState = snap.state;
    if (st === 'completed') {
      void finalizePrintedJob();
      return;
    }
    if (st === 'paper_out') {
      setPhase('paper_out');
      return;
    }
    if (st === 'paper_jam') {
      setPhase('paper_jam');
      return;
    }
    if (st === 'offline') {
      setPhase('offline');
      return;
    }
    if (st === 'paused') {
      setPhase('paused');
      return;
    }
    if (st === 'cancelled') {
      stopPolling();
      setPhase('cancelled');
      return;
    }
    if (st === 'error') {
      stopPolling();
      setPhase('error');
      return;
    }
    if (st === 'printing') {
      setPhase('printing');
      return;
    }
    setPhase('spooling');
  };

  const beginPollingJob = (jobId: string, endpointMode: 'dev' | 'bridge') => {
    stopPolling();
    const runCheck = async () => {
      const snap = await pollOsPrintJobStatus(jobId, endpointMode);
      handleSpoolerSnapshot(snap);
    };
    pollTimerRef.current = window.setInterval(runCheck, 1500);
  };

  const handleStartDirectOsPrint = async () => {
    if (!selectedOsPrinter || !spoolerEndpointMode) return;
    if (filteredPages.length === 0) {
      setPhase('error');
      setStatusMessage('No pages matched that page range.');
      return;
    }

    finalizingRef.current = false;
    setPagesPrinted(0);
    setPhase('spooling');
    setStatusMessage(`Sending ${filteredPages.length} page(s) to ${selectedOsPrinter.name}...`);

    // If B&W chosen, re-render grayscale PNGs cleanly in RAM if needed
    let pagesToSend = filteredPages.map((p) => p.dataUrl);
    if (colorMode === 'B&W' && rawBlobRef.current) {
      try {
        const bw = await renderBlobToPrintablePages(rawBlobRef.current, {
          fileName,
          mimeType: docItem?.document?.mime_type || rawBlobRef.current.type,
          scale: 1.85,
          grayscale: true,
        });
        const allowed = new Set(selectedPageNumbers);
        pagesToSend = bw.pages.filter((p) => allowed.has(p.pageNumber)).map((p) => p.dataUrl);
      } catch {
        // Fallback to pre-rendered pages + printer Color=false
      }
    }

    const startRes = await startOsPrintJob(spoolerEndpointMode, {
      printerName: selectedOsPrinter.name,
      pagesDataUrls: pagesToSend,
      fileName,
      copies,
      colorMode,
      paperSize,
      sides,
      orientation,
    });

    if (!startRes.ok || !startRes.trackingId) {
      handleSpoolerSnapshot(startRes);
      return;
    }

    setTrackedJobId(startRes.trackingId);
    setPhase('printing');
    setStatusMessage(startRes.message || `Printing on ${selectedOsPrinter.name}...`);
    beginPollingJob(startRes.trackingId, spoolerEndpointMode);
  };

  const handleOpenBrowserPrintDialog = async () => {
    if (filteredPages.length === 0) {
      setPhase('error');
      setStatusMessage('No pages matched that page range.');
      return;
    }

    finalizingRef.current = false;
    setPhase('browser_dialog_open');
    setStatusMessage('Opening printer dialog inside website (no file download)...');

    await openBrowserPrintSheet({
      pageDataUrls: filteredPages.map((p) => p.dataUrl),
      title: `${fileName} (ID: ${customerIdNo})`,
      paperSize,
      orientation,
      grayscale: colorMode === 'B&W',
    });

    setPhase('awaiting_browser_confirm');
    setStatusMessage(
      'Print dialog closed. Confirm whether printing finished — cancelled or out-of-paper jobs will stay safely in queue.'
    );
  };

  const handleStartPrintClick = () => {
    if (selectedPrinterId === BROWSER_DIALOG_ID || !spoolerEndpointMode || !selectedOsPrinter) {
      void handleOpenBrowserPrintDialog();
    } else {
      void handleStartDirectOsPrint();
    }
  };

  const handleCancelAndKeepJob = async () => {
    stopPolling();
    if (trackedJobId && spoolerEndpointMode) {
      await cancelOsPrintJob(trackedJobId, spoolerEndpointMode);
    }
    setTrackedJobId(null);
    setPhase('cancelled');
    setStatusMessage('Print cancelled — job was NOT deleted and remains in Live Print Queue.');
  };

  const isBusyDispatching =
    phase === 'loading_doc' ||
    phase === 'spooling' ||
    phase === 'printing' ||
    phase === 'browser_dialog_open' ||
    phase === 'completing_db';

  const isHardwareIssue =
    phase === 'paper_out' ||
    phase === 'paper_jam' ||
    phase === 'offline' ||
    phase === 'paused' ||
    phase === 'cancelled' ||
    phase === 'error';

  const expectedTotalSheets = Math.max(1, filteredPages.length * copies);
  const progressPct =
    phase === 'completed' || phase === 'completing_db'
      ? 100
      : phase === 'printing'
      ? Math.max(20, Math.min(92, Math.round((Math.max(1, pagesPrinted) / expectedTotalSheets) * 100)))
      : phase === 'spooling'
      ? 15
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Print job ${fileName}`}
    >
      <div className="w-full max-w-5xl max-h-[92vh] rounded-[28px] bg-[#FAF9F6] text-[#0F1115] border-2 border-black shadow-2xl flex flex-col overflow-hidden animate-panel-in">
        {/* Header */}
        <div className="px-5 py-4 bg-black text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#FF3B00] text-white flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-lg font-bold text-white truncate">
                  {fileName}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#FDE09B] text-[#0F1115] font-mono font-bold text-[11px] tabular-nums">
                  ID: {customerIdNo}
                </span>
              </div>
              <p className="text-xs font-sans text-neutral-300 truncate">
                {order.customer?.full_name || order.customer?.email || 'Walk-in Customer'} · Zero-download in-browser print dispatch
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopPolling();
              onClose();
            }}
            disabled={phase === 'completing_db'}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40"
            aria-label="Close print dialog"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body Split: Left Live Document Preview / Right Printer & Job Settings */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT: In-RAM Rendered Preview */}
          <div className="lg:col-span-7 bg-[#E9E4DA] p-4 flex flex-col min-h-[260px] max-h-[42vh] lg:max-h-none overflow-hidden border-b lg:border-b-0 lg:border-r border-black/15">
            <div className="flex items-center justify-between gap-2 pb-2.5 shrink-0">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#0F1115] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#D93200]" aria-hidden="true" />
                <span>
                  Preview ({filteredPages.length} / {totalDocPages}{' '}
                  {totalDocPages === 1 ? 'page' : 'pages'})
                </span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-black/15 text-[11px] font-sans font-semibold text-[#0F1115]">
                {colorMode} · {paperSize} · {orientation}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto queue-scroll pr-1 space-y-3">
              {phase === 'loading_doc' ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-2 text-xs font-sans text-neutral-700">
                  <Loader2 className="w-6 h-6 text-[#D93200] animate-spin" aria-hidden="true" />
                  <span>Rendering document in RAM (no file download)...</span>
                </div>
              ) : filteredPages.length === 0 ? (
                <div className="h-full min-h-[180px] flex items-center justify-center text-xs font-sans text-neutral-700">
                  No pages to preview. Check page range or reload.
                </div>
              ) : (
                filteredPages.map((pg) => (
                  <div
                    key={pg.pageNumber}
                    className="rounded-xl bg-white border border-black/15 p-2 shadow-sm flex flex-col items-center gap-1.5"
                  >
                    <img
                      src={pg.dataUrl}
                      alt={`Page ${pg.pageNumber}`}
                      className={`max-h-[420px] w-auto object-contain rounded border border-black/10 transition-all ${
                        colorMode === 'B&W' ? 'grayscale' : ''
                      }`}
                    />
                    <span className="text-[10px] font-mono text-neutral-500">
                      Page {pg.pageNumber}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Printer Chooser, Full Settings & Live Progress */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between gap-4 overflow-y-auto queue-scroll">
            <div className="space-y-3.5">
              {/* Printer Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="print-modal-printer"
                    className="text-xs font-sans font-bold uppercase tracking-wide text-[#0F1115]"
                  >
                    Select Printer
                  </label>
                  <button
                    type="button"
                    onClick={() => void onRefreshPrinters()}
                    disabled={isBusyDispatching}
                    className="text-[11px] font-sans font-semibold text-[#D93200] hover:text-black inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw className="w-3 h-3" aria-hidden="true" />
                    <span>Refresh</span>
                  </button>
                </div>

                <select
                  id="print-modal-printer"
                  value={selectedPrinterId}
                  onChange={(e) => setSelectedPrinterId(e.target.value)}
                  disabled={isBusyDispatching}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-black/25 text-xs font-sans font-semibold text-[#0F1115] focus:outline-none focus:border-[#D93200] disabled:opacity-60"
                >
                  {spoolerEndpointMode &&
                    osPrinters.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.statusLabel || p.status} ({p.connection})
                      </option>
                    ))}
                  <option value={BROWSER_DIALOG_ID}>
                    Browser Print Dialog (Choose System / USB / Wi-Fi Printer)
                  </option>
                </select>

                {selectedOsPrinter && spoolerEndpointMode ? (
                  <p className="text-[11px] font-sans text-neutral-600">
                    Direct OS Spooler active — tracks pages printed, paper out, jams, and cancellation automatically.
                  </p>
                ) : (
                  <p className="text-[11px] font-sans text-neutral-600">
                    Opens your full system printer dialog directly on this page (no file download). Job stays in queue until confirmed printed.
                  </p>
                )}
              </div>

              {/* Editable Print Settings Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-sans font-semibold text-neutral-700 block">
                    Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={copies}
                    disabled={isBusyDispatching}
                    onChange={(e) => setCopies(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                    className="w-full h-9 px-3 rounded-xl bg-white border border-black/20 text-xs font-mono font-bold text-[#0F1115] focus:outline-none focus:border-[#D93200]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-sans font-semibold text-neutral-700 block">
                    Page Range
                  </label>
                  <input
                    type="text"
                    value={pageRange}
                    disabled={isBusyDispatching}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="All or 1-3, 5"
                    className="w-full h-9 px-3 rounded-xl bg-white border border-black/20 text-xs font-mono text-[#0F1115] focus:outline-none focus:border-[#D93200]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-sans font-semibold text-neutral-700 block">
                    Color Mode
                  </label>
                  <select
                    value={colorMode}
                    disabled={isBusyDispatching}
                    onChange={(e) => setColorMode(e.target.value === 'Color' ? 'Color' : 'B&W')}
                    className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/20 text-xs font-sans font-semibold text-[#0F1115]"
                  >
                    <option value="B&W">Black &amp; White</option>
                    <option value="Color">Color</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-sans font-semibold text-neutral-700 block">
                    Paper Size
                  </label>
                  <select
                    value={paperSize}
                    disabled={isBusyDispatching}
                    onChange={(e) => setPaperSize(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/20 text-xs font-sans font-semibold text-[#0F1115]"
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                    <option value="4x6">Photo 4×6</option>
                    <option value="Passport 35x45mm">Passport</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-sans font-semibold text-neutral-700 block">
                    Sides
                  </label>
                  <select
                    value={sides}
                    disabled={isBusyDispatching}
                    onChange={(e) => setSides(e.target.value === 'Double' ? 'Double' : 'Single')}
                    className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/20 text-xs font-sans font-semibold text-[#0F1115]"
                  >
                    <option value="Single">Single-sided</option>
                    <option value="Double">Double-sided (Duplex)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-sans font-semibold text-neutral-700 block">
                    Orientation
                  </label>
                  <select
                    value={orientation}
                    disabled={isBusyDispatching}
                    onChange={(e) =>
                      setOrientation(e.target.value === 'Landscape' ? 'Landscape' : 'Portrait')
                    }
                    className="w-full h-9 px-2.5 rounded-xl bg-white border border-black/20 text-xs font-sans font-semibold text-[#0F1115]"
                  >
                    <option value="Portrait">Portrait</option>
                    <option value="Landscape">Landscape</option>
                  </select>
                </div>
              </div>

              {order.customer_notes && (
                <div className="p-2.5 rounded-xl bg-[#FDE09B]/60 border border-black/15 text-[11px] font-sans text-[#0F1115]">
                  <strong>Customer Note:</strong> {order.customer_notes}
                </div>
              )}

              {/* Live Progress & Hardware Status Banner */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  isHardwareIssue
                    ? 'bg-rose-50 border-rose-400 text-rose-950'
                    : phase === 'completed'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                    : phase === 'awaiting_browser_confirm'
                    ? 'bg-[#FDE09B]/70 border-black/25 text-[#0F1115]'
                    : 'bg-black/5 border-black/15 text-[#0F1115]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isHardwareIssue ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : phase === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : isBusyDispatching ? (
                    <Loader2 className="w-4 h-4 text-[#D93200] animate-spin shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <Printer className="w-4 h-4 text-[#D93200] shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div className="text-xs font-sans font-medium leading-relaxed">
                    {statusMessage}
                  </div>
                </div>

                {(phase === 'spooling' ||
                  phase === 'printing' ||
                  phase === 'completing_db' ||
                  phase === 'completed') && (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          phase === 'completed' ? 'bg-emerald-600' : 'bg-[#D93200]'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-neutral-600">
                      <span>{phase.replace(/_/g, ' ').toUpperCase()}</span>
                      <span>
                        {pagesPrinted}/{expectedTotalSheets} sheets ({progressPct}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-2 border-t border-black/15 space-y-2 shrink-0">
              {phase === 'awaiting_browser_confirm' ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => void finalizePrintedJob()}
                    className="w-full h-11 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-sans font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Printing Done — Notify Customer &amp; Delete Job</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPhase('paper_out');
                        setStatusMessage(
                          'Printer ran out of paper / jammed. Job kept safely in queue — fix paper then retry.'
                        );
                      }}
                      className="h-9 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-sans font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Out of Paper</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhase('cancelled');
                        setStatusMessage(
                          'Print cancelled — print job was NOT deleted and remains in Live Print Queue.'
                        );
                      }}
                      className="h-9 rounded-full bg-black/10 hover:bg-black/20 text-[#0F1115] text-xs font-sans font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Cancelled (Keep)</span>
                    </button>
                  </div>
                </div>
              ) : isHardwareIssue ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleStartPrintClick}
                      className="h-10 rounded-full bg-[#D93200] hover:bg-black text-white text-xs font-sans font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Retry Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPrinterId(BROWSER_DIALOG_ID);
                        void handleOpenBrowserPrintDialog();
                      }}
                      className="h-10 rounded-full bg-white border border-black/25 hover:bg-black hover:text-white text-[#0F1115] text-xs font-sans font-semibold cursor-pointer transition-colors"
                    >
                      Browser Dialog
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCancelAndKeepJob()}
                    className="w-full h-9 rounded-full bg-black/10 hover:bg-black/20 text-[#0F1115] text-xs font-sans font-semibold cursor-pointer"
                  >
                    Keep Job in Queue &amp; Close
                  </button>
                </div>
              ) : phase === 'spooling' || phase === 'printing' ? (
                <button
                  type="button"
                  onClick={() => void handleCancelAndKeepJob()}
                  className="w-full h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-sans font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <XCircle className="w-4 h-4" aria-hidden="true" />
                  <span>Cancel Print (Keep Job in Queue)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusyDispatching || phase === 'completed'}
                  onClick={handleStartPrintClick}
                  className="w-full h-11 rounded-full bg-[#D93200] hover:bg-black text-white text-xs font-sans font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isBusyDispatching ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Printer className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>
                    {phase === 'loading_doc'
                      ? 'Preparing Preview...'
                      : selectedPrinterId === BROWSER_DIALOG_ID || !spoolerEndpointMode
                      ? 'Choose Printer & Print'
                      : `Print Now on ${selectedOsPrinter?.name || 'Selected Printer'}`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

