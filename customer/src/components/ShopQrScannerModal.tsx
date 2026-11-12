import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  AlertCircle,
  Camera,
  ImageUp,
  Loader2,
  QrCode,
  Search,
  X,
} from 'lucide-react';
import type { Shop } from '../types/database';
import { findShopByQrPayload, getShopUniqueCode } from '../utils/shopQr';

interface ShopQrScannerModalProps {
  shops: Shop[];
  onClose: () => void;
  onShopDetected: (shop: Shop) => void;
}

export function ShopQrScannerModal({
  shops,
  onClose,
  onShopDetected,
}: ShopQrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [cameraState, setCameraState] = useState<'starting' | 'active' | 'unavailable'>('starting');
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const stopCamera = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const handleDecodedText = (rawText: string) => {
    const matched = findShopByQrPayload(shops, rawText);
    if (matched) {
      stopCamera();
      onShopDetected(matched);
      return true;
    }
    setScanError(`Scanned QR did not match an active print shop ("${rawText.slice(0, 48)}").`);
    return false;
  };

  useEffect(() => {
    let cancelled = false;

    const startScanner = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraState('unavailable');
        setCameraMessage('Camera access is not available in this browser. Upload a QR image or enter the Shop ID below.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState('active');

        const scanFrame = () => {
          if (cancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            const w = video.videoWidth;
            const h = video.videoHeight;
            if (w > 0 && h > 0) {
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, w, h);
                const imgData = ctx.getImageData(0, 0, w, h);
                const qr = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
                if (qr?.data) {
                  const found = handleDecodedText(qr.data);
                  if (found) return;
                }
              }
            }
          }
          rafRef.current = window.requestAnimationFrame(scanFrame);
        };

        rafRef.current = window.requestAnimationFrame(scanFrame);
      } catch (err: any) {
        if (cancelled) return;
        setCameraState('unavailable');
        setCameraMessage(
          err?.name === 'NotAllowedError'
            ? 'Camera permission denied. Upload a shop QR image or enter the Shop ID below.'
            : 'No live camera detected. Upload a shop QR image or enter the Shop ID below.'
        );
      }
    };

    startScanner();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [shops]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopCamera();
        onClose();
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const handleScanImageFile = async (file?: File | null) => {
    if (!file) return;
    setScanError(null);
    const objUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Could not read QR image.'));
        el.src = objUrl;
      });
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.max(1, Math.round((img.naturalWidth || 600) * scale));
      const h = Math.max(1, Math.round((img.naturalHeight || 600) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas unavailable.');
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const decoded = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
      if (!decoded?.data) {
        setScanError('No valid QR code found in that image. Try cropping closer to the QR square.');
        return;
      }
      handleDecodedText(decoded.data);
    } catch (err: any) {
      setScanError(err?.message || 'Failed to decode uploaded QR image.');
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    if (!manualCode.trim()) return;
    const matched = findShopByQrPayload(shops, manualCode);
    if (matched) {
      stopCamera();
      onShopDetected(matched);
    } else {
      setScanError('No active print shop matches that Shop ID or link.');
    }
  };

  return (
    <div
      onClick={() => {
        stopCamera();
        onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 animate-backdrop-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-shop-qr-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-[24px] bg-[#FAF9F6] text-[#0F1115] p-5 sm:p-6 border border-black/20 shadow-2xl space-y-4 animate-panel-in"
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3.5">
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#D93200] flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Counter Direct Upload</span>
            </div>
            <h2
              id="scan-shop-qr-title"
              className="font-serif text-xl font-bold text-[#0F1115] mt-0.5"
            >
              Scan Shop QR Code
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-black hover:bg-[#D93200] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close QR scanner"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Live Camera Viewfinder */}
        <div className="relative w-full aspect-square max-h-[260px] rounded-[20px] bg-black overflow-hidden border border-black/25 flex items-center justify-center">
          <video
            ref={videoRef}
            muted
            playsInline
            className={`w-full h-full object-cover ${cameraState === 'active' ? 'opacity-100' : 'opacity-0'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {cameraState === 'active' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-44 h-44 rounded-2xl border-2 border-[#FDE09B] shadow-[0_0_0_9999px_rgba(0,0,0,0.42)] relative">
                <span className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-4 border-l-4 border-[#FF3B00] rounded-tl-md" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-4 border-r-4 border-[#FF3B00] rounded-tr-md" />
                <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-4 border-l-4 border-[#FF3B00] rounded-bl-md" />
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-4 border-r-4 border-[#FF3B00] rounded-br-md" />
              </div>
            </div>
          )}

          {cameraState === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs font-sans text-[#FAF9F6]">
              <Loader2 className="w-5 h-5 animate-spin text-[#FDE09B]" aria-hidden="true" />
              <span>Starting camera...</span>
            </div>
          )}

          {cameraState === 'unavailable' && (
            <div className="absolute inset-0 p-5 flex flex-col items-center justify-center text-center gap-2 text-neutral-300">
              <Camera className="w-7 h-7 text-[#FDE09B]" aria-hidden="true" />
              <p className="text-xs font-sans leading-relaxed max-w-xs">
                {cameraMessage || 'Camera unavailable. Use QR image upload or Shop ID below.'}
              </p>
            </div>
          )}
        </div>

        {scanError && (
          <div className="rounded-xl bg-rose-50 border border-rose-300 px-3 py-2 text-xs font-sans text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Alternative: Upload QR Image or Enter Unique Shop ID */}
        <div className="space-y-3 pt-1">
          <label className="w-full h-10 px-4 rounded-full bg-[#FDE09B] hover:bg-black hover:text-[#FDE09B] border border-black/15 text-xs font-sans font-bold text-[#0F1115] flex items-center justify-center gap-2 cursor-pointer transition-colors">
            <ImageUp className="w-4 h-4" aria-hidden="true" />
            <span>Scan QR from Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleScanImageFile(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
              className="hidden"
            />
          </label>

          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3.5 top-3" aria-hidden="true" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setScanError(null);
                }}
                placeholder={
                  shops[0]
                    ? `Shop ID (e.g. ${getShopUniqueCode(shops[0].id)})`
                    : 'Enter Shop ID (e.g. PRX-7K4M9Q)'
                }
                className="w-full h-10 pl-9 pr-3 rounded-full bg-white border border-black/25 text-xs font-mono font-semibold text-[#0F1115] placeholder:font-sans placeholder:font-normal placeholder:text-neutral-500 focus:outline-none focus:border-[#D93200]"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-4 rounded-full bg-[#D93200] hover:bg-black text-white text-xs font-sans font-bold transition-colors cursor-pointer shrink-0"
            >
              Open
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

