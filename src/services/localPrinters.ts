/**
 * ==============================================================================
 * LOCAL SYSTEM PRINTER AUTO-DETECTION SERVICE (ZERO DB STORAGE)
 * ==============================================================================
 * Automatically discovers printers connected directly to the computer where
 * the Printo Shop Hub website is opened:
 *   1. OS Print Spooler (via Vite local middleware `/__local-printers` or Bridge `127.0.0.1:9191`)
 *   2. Browser WebUSB API (`navigator.usb`) for plugged-in USB Class 0x07 Printers
 *   3. Browser WebSerial API (`navigator.serial`) for USB/COM Receipt Printers
 * ==============================================================================
 */

export interface DetectedPrinter {
  id: string;
  name: string;
  driver: string;
  port: string;
  status: 'online' | 'offline' | 'ready' | 'paused' | 'attention' | 'paper_out' | 'paper_jam';
  statusLabel?: string;
  isDefault: boolean;
  connection: string;
  source: 'OS Spooler' | 'WebUSB' | 'WebSerial' | 'Browser Spooler';
}

export interface PrinterScanResult {
  printers: DetectedPrinter[];
  hostname?: string;
  platform?: string;
  bridgeActive: boolean;
  endpointMode?: 'dev' | 'bridge' | null;
}

export type OsPrintJobState =
  | 'spooling'
  | 'printing'
  | 'paper_out'
  | 'paper_jam'
  | 'offline'
  | 'paused'
  | 'error'
  | 'cancelled'
  | 'completed';

export interface OsPrintJobStatusResult {
  ok: boolean;
  state: OsPrintJobState;
  trackingId?: string;
  printerName?: string;
  pagesPrinted?: number;
  totalPages?: number;
  message?: string;
  error?: string;
}

const BRIDGE_URL = 'http://127.0.0.1:9191';

function deduplicatePrinters(list: DetectedPrinter[]): DetectedPrinter[] {
  const seen = new Set<string>();
  const out: DetectedPrinter[] = [];
  for (const p of list) {
    const key = `${p.source}:${p.name}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

export async function detectConnectedPrinters(): Promise<PrinterScanResult> {
  const collected: DetectedPrinter[] = [];
  let hostname = '';
  let platform = '';
  let bridgeActive = false;
  let endpointMode: 'dev' | 'bridge' | null = null;

  // 1. Check same-origin dev auto-detector (/\_\_local-printers)
  try {
    const res = await fetch('/__local-printers', { signal: AbortSignal.timeout(1800) });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (json?.ok && Array.isArray(json.printers)) {
          bridgeActive = true;
          endpointMode = 'dev';
          hostname = json.hostname || '';
          platform = json.platform || '';
          collected.push(...json.printers);
        }
      }
    }
  } catch {
    // Dev endpoint not present (e.g. remote cloud hosting)
  }

  // 2. Check standalone Local Printer Bridge (http://127.0.0.1:9191/printers)
  if (!bridgeActive) {
    try {
      const res = await fetch(`${BRIDGE_URL}/printers`, { signal: AbortSignal.timeout(1400) });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && Array.isArray(json.printers)) {
          bridgeActive = true;
          endpointMode = 'bridge';
          hostname = json.hostname || '';
          platform = json.platform || '';
          collected.push(...json.printers);
        }
      }
    } catch {
      // Local agent not started on 9191
    }
  }

  // 3. Auto-detect already-permitted USB Printers via Browser WebUSB API
  const nav = navigator as any;
  if (nav?.usb?.getDevices) {
    try {
      const devices: any[] = await nav.usb.getDevices();
      for (const dev of devices) {
        const isPrinterClass = dev.configuration?.interfaces?.some((iface: any) =>
          iface.alternates?.some((alt: any) => alt.interfaceClass === 7)
        );
        const label =
          dev.productName ||
          (dev.manufacturerName ? `${dev.manufacturerName} USB Printer` : `USB Device (${dev.vendorId})`);
        collected.push({
          id: `webusb-${dev.vendorId}-${dev.productId}-${dev.serialNumber || 'usb'}`,
          name: label,
          driver: dev.manufacturerName || (isPrinterClass ? 'USB Printer Class 07' : 'WebUSB Hardware'),
          port: `USB ${dev.vendorId.toString(16)}:${dev.productId.toString(16)}`,
          status: dev.opened ? 'online' : 'online',
          isDefault: collected.length === 0,
          connection: 'WebUSB Direct',
          source: 'WebUSB',
        });
      }
    } catch {
      // WebUSB blocked or unsupported
    }
  }

  // 4. Auto-detect already-permitted Serial Thermal/Label Printers via WebSerial
  if (nav?.serial?.getPorts) {
    try {
      const ports: any[] = await nav.serial.getPorts();
      ports.forEach((port, idx) => {
        const info = port.getInfo?.() || {};
        collected.push({
          id: `webserial-${idx}-${info.usbVendorId || 'com'}`,
          name: info.usbProductId
            ? `USB Serial Printer (${info.usbVendorId?.toString(16)}:${info.usbProductId?.toString(16)})`
            : `Serial Port Printer #${idx + 1}`,
          driver: 'WebSerial Thermal/POS',
          port: 'COM / Serial',
          status: 'online',
          isDefault: collected.length === 0,
          connection: 'WebSerial Port',
          source: 'WebSerial',
        });
      });
    } catch {
      // WebSerial unsupported
    }
  }

  return {
    printers: deduplicatePrinters(collected),
    hostname,
    platform,
    bridgeActive,
    endpointMode,
  };
}

/**
 * Prompts browser USB chooser for USB Printers (Class 0x07),
 * falling back to all USB devices if no standard Class 7 descriptor is found.
 */
export async function scanUsbHardware(): Promise<DetectedPrinter | null> {
  const nav = navigator as any;
  if (!nav?.usb?.requestDevice) {
    throw new Error('WebUSB is supported in Chrome, Edge, and Chromium browsers over HTTPS or localhost.');
  }

  let device: any = null;
  try {
    device = await nav.usb.requestDevice({ filters: [{ classCode: 7 }] });
  } catch (err: any) {
    if (err?.name === 'NotFoundError') {
      // User dismissed or printer didn't advertise class 7 -> fallback or cancel
      throw new Error('No USB printer selected. Ensure your USB printer is powered on and connected.');
    }
    throw err;
  }

  if (!device) return null;

  return {
    id: `webusb-${device.vendorId}-${device.productId}-${device.serialNumber || Date.now()}`,
    name: device.productName || `${device.manufacturerName || 'USB'} Printer`,
    driver: device.manufacturerName || 'USB Printer Driver',
    port: `USB ${device.vendorId.toString(16)}:${device.productId.toString(16)}`,
    status: 'online',
    isDefault: false,
    connection: 'WebUSB Direct',
    source: 'WebUSB',
  };
}

/**
 * Triggers printing for a document URL (and/or already-downloaded Blob) via
 * Local OS Bridge (if active) or same-origin local Blob print dialog so the
 * remote storage file can be safely deleted afterwards without breaking printing.
 */
export async function dispatchToSystemPrinter(
  fileUrl: string,
  printer?: DetectedPrinter | null,
  options?: {
    blob?: Blob | null;
    preOpenedWindow?: Window | null;
  }
): Promise<boolean> {
  const preOpenedWindow = options?.preOpenedWindow || null;

  // 1. If local bridge on 9191 is active, dispatch directly to OS Spooler
  if (printer?.source === 'OS Spooler') {
    try {
      const res = await fetch(`${BRIDGE_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, printerName: printer.name }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        if (preOpenedWindow && !preOpenedWindow.closed) {
          preOpenedWindow.close();
        }
        return true;
      }
    } catch {
      // Fallback gracefully to browser native print dialog
    }
  }

  // 2. Buffer document into local RAM (Blob) before opening print preview so remote cleanup cannot 404 it
  let localBlob = options?.blob || null;
  if (!localBlob && fileUrl) {
    try {
      const resp = await fetch(fileUrl);
      if (resp.ok) {
        localBlob = await resp.blob();
      }
    } catch {
      // Fall back to direct URL if cross-origin fetch fails
    }
  }

  const targetUrl = localBlob ? URL.createObjectURL(localBlob) : fileUrl;
  if (!targetUrl) {
    if (preOpenedWindow && !preOpenedWindow.closed) {
      preOpenedWindow.close();
    }
    return false;
  }

  if (localBlob) {
    window.setTimeout(() => URL.revokeObjectURL(targetUrl), 120_000);
  }

  const printWin = preOpenedWindow && !preOpenedWindow.closed
    ? preOpenedWindow
    : window.open(targetUrl, '_blank');

  if (printWin) {
    printWin.addEventListener('load', () => {
      try {
        printWin.focus();
        printWin.print();
      } catch {
        // Native PDF viewer handles its own Print command
      }
    });
    if (preOpenedWindow && !preOpenedWindow.closed) {
      preOpenedWindow.location.replace(targetUrl);
    }
    return true;
  }

  // 3. Fallback if popups are blocked: trigger print via hidden same-origin iframe
  if (localBlob && typeof document !== 'undefined') {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.src = targetUrl;
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Ignore cross-plugin print error
      }
      window.setTimeout(() => iframe.remove(), 60_000);
    };
    document.body.appendChild(iframe);
    return true;
  }

  return false;
}

function getSpoolerEndpoints(mode: 'dev' | 'bridge') {
  return mode === 'dev'
    ? {
        print: '/__local-print-job',
        status: '/__local-job-status',
        cancel: '/__local-cancel-job',
      }
    : {
        print: `${BRIDGE_URL}/print`,
        status: `${BRIDGE_URL}/job-status`,
        cancel: `${BRIDGE_URL}/cancel-job`,
      };
}

export async function startOsPrintJob(
  endpointMode: 'dev' | 'bridge',
  payload: {
    printerName: string;
    pagesDataUrls?: string[];
    fileBase64?: string;
    fileUrl?: string;
    fileName: string;
    copies: number;
    colorMode: string;
    paperSize: string;
    sides: string;
    orientation: string;
  }
): Promise<OsPrintJobStatusResult> {
  const endpoints = getSpoolerEndpoints(endpointMode);
  try {
    const res = await fetch(endpoints.print, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    return {
      ok: Boolean(json?.ok),
      state: (json?.state as OsPrintJobState) || (json?.ok ? 'spooling' : 'error'),
      trackingId: json?.trackingId,
      printerName: json?.printerName || payload.printerName,
      totalPages: json?.totalPages,
      message: json?.message || json?.error,
      error: json?.error,
    };
  } catch (err: any) {
    return {
      ok: false,
      state: 'error',
      printerName: payload.printerName,
      error: err?.message || 'Could not reach local printer spooler.',
    };
  }
}

export async function pollOsPrintJobStatus(
  trackingId: string,
  endpointMode: 'dev' | 'bridge'
): Promise<OsPrintJobStatusResult> {
  const endpoints = getSpoolerEndpoints(endpointMode);
  try {
    const res = await fetch(`${endpoints.status}?id=${encodeURIComponent(trackingId)}`, {
      signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    return {
      ok: Boolean(json?.ok),
      state: (json?.state as OsPrintJobState) || 'error',
      trackingId,
      printerName: json?.printerName,
      pagesPrinted: json?.pagesPrinted,
      totalPages: json?.totalPages,
      message: json?.message || json?.error,
    };
  } catch (err: any) {
    return {
      ok: false,
      state: 'error',
      trackingId,
      message: err?.message || 'Lost connection to printer spooler.',
    };
  }
}

export async function cancelOsPrintJob(
  trackingId: string,
  endpointMode: 'dev' | 'bridge'
): Promise<void> {
  const endpoints = getSpoolerEndpoints(endpointMode);
  try {
    await fetch(endpoints.cancel, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingId }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Best-effort cancel
  }
}

/**
 * Opens the browser's full native Printer Chooser & Settings dialog directly inside
 * the website using rendered in-RAM page images inside a hidden print frame
 * (zero file downloads to disk, zero popup tabs). Resolves once the print dialog closes.
 */
export async function openBrowserPrintSheet(params: {
  pageDataUrls: string[];
  title: string;
  paperSize: string;
  orientation: string;
  grayscale?: boolean;
}): Promise<boolean> {
  if (typeof document === 'undefined' || params.pageDataUrls.length === 0) return false;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return false;
  }

  const normalizedPaper =
    /a3/i.test(params.paperSize)
      ? 'A3'
      : /letter/i.test(params.paperSize)
      ? 'letter'
      : 'A4';
  const orientCss = /landscape/i.test(params.orientation) ? 'landscape' : 'portrait';
  const filterCss = params.grayscale ? 'filter: grayscale(100%);' : '';

  const imgsHtml = params.pageDataUrls
    .map(
      (url) => `
      <div class="sheet-page">
        <img src="${url}" alt="Print page" />
      </div>
    `
    )
    .join('');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${params.title.replace(/[<>&"]/g, '')}</title>
        <style>
          @page { size: ${normalizedPaper} ${orientCss}; margin: 6mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #fff; }
          .sheet-page {
            width: 100%;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            break-after: page;
          }
          .sheet-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .sheet-page img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            ${filterCss}
          }
        </style>
      </head>
      <body>${imgsHtml}</body>
    </html>
  `);
  doc.close();

  // Wait for every rendered image inside the hidden frame to finish decoding
  const imgs = Array.from(doc.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        img.complete ||
        new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      window.setTimeout(() => iframe.remove(), 400);
      resolve(true);
    };

    win.onafterprint = cleanup;
    win.addEventListener('afterprint', cleanup, { once: true });

    window.setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
      }
    }, 120);
  });
}

