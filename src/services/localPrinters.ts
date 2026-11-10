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
  status: 'online' | 'offline' | 'ready' | 'paused' | 'attention';
  isDefault: boolean;
  connection: string;
  source: 'OS Spooler' | 'WebUSB' | 'WebSerial' | 'Browser Spooler';
}

export interface PrinterScanResult {
  printers: DetectedPrinter[];
  hostname?: string;
  platform?: string;
  bridgeActive: boolean;
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

  // 1. Check same-origin dev auto-detector (/\_\_local-printers)
  try {
    const res = await fetch('/__local-printers', { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (json?.ok && Array.isArray(json.printers)) {
          bridgeActive = true;
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
      const res = await fetch(`${BRIDGE_URL}/printers`, { signal: AbortSignal.timeout(1200) });
      if (res.ok) {
        const json = await res.json();
        if (json?.ok && Array.isArray(json.printers)) {
          bridgeActive = true;
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
 * Triggers printing for a document URL directly via Local OS Bridge (if active)
 * or opens the system's native Print Dialog so all connected printers appear.
 */
export async function dispatchToSystemPrinter(
  fileUrl: string,
  printer?: DetectedPrinter | null
): Promise<boolean> {
  // 1. If local bridge on 9191 is active, dispatch directly to OS Spooler
  if (printer?.source === 'OS Spooler') {
    try {
      const res = await fetch(`${BRIDGE_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, printerName: printer.name }),
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return true;
      }
    } catch {
      // Fallback gracefully to browser native print window
    }
  }

  // 2. Fallback: Load document into clean print window / hidden iframe & trigger OS print dialog
  const printWin = window.open(fileUrl, '_blank');
  if (printWin) {
    printWin.addEventListener('load', () => {
      try {
        printWin.focus();
        printWin.print();
      } catch {
        // Cross-origin PDF viewer handles its own Print shortcut
      }
    });
    return true;
  }

  return false;
}

