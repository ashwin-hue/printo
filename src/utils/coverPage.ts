import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import spidermanImg from '../assets/activities/spiderman-papercraft.jpg';
import cuteColoringImg from '../assets/activities/cute-coloring.jpg';
import helloKittyPixelImg from '../assets/activities/hello-kitty-pixel.jpg';
import mysteryPixelImg from '../assets/activities/mystery-pixel.jpg';
import avengersWordSearchImg from '../assets/activities/avengers-word-search.jpg';
import connectDotsImg from '../assets/activities/connect-the-dots.jpg';
import onePieceWordSearchImg from '../assets/activities/one-piece-word-search.jpg';
import castleMazeImg from '../assets/activities/castle-maze.jpg';

export interface FunCoverActivity {
  id: string;
  title: string;
  badge: string;
  imageUrl: string;
}

export const FUN_COVER_ACTIVITIES: readonly FunCoverActivity[] = [
  { id: 'spiderman', title: 'Spider-Man Papercraft', badge: 'Cut & Fold', imageUrl: spidermanImg },
  { id: 'coloring', title: 'Cute Things Coloring', badge: 'Coloring', imageUrl: cuteColoringImg },
  { id: 'hello-kitty', title: 'Hello Kitty Pixel', badge: 'Color by #', imageUrl: helloKittyPixelImg },
  { id: 'mystery-pixel', title: 'Mystery Pixel Reveal', badge: 'Pixel Art', imageUrl: mysteryPixelImg },
  { id: 'avengers-search', title: 'Avengers Word Search', badge: 'Word Search', imageUrl: avengersWordSearchImg },
  { id: 'connect-dots', title: 'Connect the Dots', badge: '108 Dots', imageUrl: connectDotsImg },
  { id: 'onepiece-search', title: 'One Piece Word Search', badge: 'Word Search', imageUrl: onePieceWordSearchImg },
  { id: 'castle-maze', title: 'Castle Woods Maze', badge: 'Maze Puzzle', imageUrl: castleMazeImg },
] as const;

export function resolveCoverActivity(activityId: string, randomIdx: number): FunCoverActivity {
  if (activityId === 'random') {
    const safeIdx = Math.abs(randomIdx) % FUN_COVER_ACTIVITIES.length;
    return FUN_COVER_ACTIVITIES[safeIdx];
  }
  return FUN_COVER_ACTIVITIES.find((a) => a.id === activityId) || FUN_COVER_ACTIVITIES[0];
}

/**
 * Picks a random, previously unused fun activity for each new document order
 * so the customer never gets the same surprise sheet back-to-back.
 */
export function pickNextSurpriseActivity(userId?: string | null): FunCoverActivity {
  const scope = userId || 'guest';
  const usedKey = `prinrox_used_acts_${scope}`;
  const lastKey = `prinrox_last_act_${scope}`;

  let usedIds: string[] = [];
  let lastId: string | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawUsed = window.localStorage.getItem(usedKey);
      if (rawUsed) {
        const parsed = JSON.parse(rawUsed);
        if (Array.isArray(parsed)) usedIds = parsed.filter((x) => typeof x === 'string');
      }
      lastId = window.localStorage.getItem(lastKey);
    }
  } catch {
    // Ignore storage read errors cleanly
  }

  let pool = FUN_COVER_ACTIVITIES.filter((a) => !usedIds.includes(a.id) && a.id !== lastId);
  let resetHistory = false;
  if (pool.length === 0) {
    resetHistory = true;
    pool = FUN_COVER_ACTIVITIES.filter((a) => a.id !== lastId);
    if (pool.length === 0) pool = [...FUN_COVER_ACTIVITIES];
  }

  const chosen = pool[Math.floor(Math.random() * pool.length)];

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const nextUsed = resetHistory ? [chosen.id] : Array.from(new Set([...usedIds, chosen.id]));
      window.localStorage.setItem(usedKey, JSON.stringify(nextUsed));
      window.localStorage.setItem(lastKey, chosen.id);
    }
  } catch {
    // Ignore storage write errors cleanly
  }

  return chosen;
}

function toAsciiSafeText(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function imageFileToJpgOrPngBytes(
  file: File
): Promise<{ kind: 'jpg' | 'png'; bytes: ArrayBuffer }> {
  const buf = await file.arrayBuffer();
  const mime = (file.type || '').toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return { kind: 'jpg', bytes: buf };
  }
  if (mime === 'image/png') {
    return { kind: 'png', bytes: buf };
  }

  // Convert WEBP/other browser-supported formats to PNG via an offscreen canvas
  const objUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image load failed'));
      el.src = objUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 1000;
    canvas.height = img.naturalHeight || 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const pngBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png')
    );
    return { kind: 'png', bytes: await pngBlob.arrayBuffer() };
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}

/**
 * Adds a crisp A4 portrait Page 1 containing:
 * - Medium-sized identification header strip (Customer Name, file count/summary, 4-digit Pickup OTP)
 * - Printable fun activity filling the remaining ~81% of the page
 */
export async function addIdentificationCoverPage(
  pdfDoc: PDFDocument,
  options: {
    customerName: string;
    pickupOtp: string;
    documentSummary: string;
    docPageCount: number;
    activity: FunCoverActivity;
  }
): Promise<void> {
  const PAGE_W = 595.28; // A4 width in pt
  const PAGE_H = 841.89; // A4 height in pt
  const MARGIN = 22;
  const HEADER_H = 112;
  const HEADER_Y = PAGE_H - MARGIN - HEADER_H;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMonoBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Page background clean white
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: rgb(1, 1, 1),
  });

  // ------------------------------------------------------------------
  // TOP HEADER BAND: Name + 4-Digit Pickup OTP for easy shop lookup
  // ------------------------------------------------------------------
  page.drawRectangle({
    x: MARGIN,
    y: HEADER_Y,
    width: CONTENT_W,
    height: HEADER_H,
    color: rgb(0.985, 0.98, 0.965),
    borderColor: rgb(0.06, 0.07, 0.08),
    borderWidth: 1.5,
  });

  // Left vertical accent stripe
  page.drawRectangle({
    x: MARGIN,
    y: HEADER_Y,
    width: 6,
    height: HEADER_H,
    color: rgb(0.85, 0.2, 0),
  });

  const safeName = toAsciiSafeText(options.customerName || 'Prinrox Customer') || 'Prinrox Customer';
  const displayName = safeName.length > 26 ? `${safeName.slice(0, 25)}...` : safeName;
  const safeDocSummary = toAsciiSafeText(options.documentSummary || 'Print Document');
  const trimmedSummary =
    safeDocSummary.length > 42 ? `${safeDocSummary.slice(0, 41)}...` : safeDocSummary;

  page.drawText('PRINROX  |  PICKUP IDENTIFICATION & ACTIVITY SHEET', {
    x: MARGIN + 18,
    y: HEADER_Y + HEADER_H - 22,
    size: 8.5,
    font: fontBold,
    color: rgb(0.85, 0.2, 0),
  });

  page.drawText(displayName, {
    x: MARGIN + 18,
    y: HEADER_Y + HEADER_H - 52,
    size: 20,
    font: fontBold,
    color: rgb(0.06, 0.07, 0.08),
  });

  page.drawText(
    `Doc: ${trimmedSummary}   |   Pages: ${options.docPageCount} + 1 Fun Cover`,
    {
      x: MARGIN + 18,
      y: HEADER_Y + 34,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.22, 0.24, 0.27),
    }
  );

  page.drawText(`Fun Cover: ${toAsciiSafeText(options.activity.title)} (${toAsciiSafeText(options.activity.badge)})`, {
    x: MARGIN + 18,
    y: HEADER_Y + 15,
    size: 8.5,
    font: fontBold,
    color: rgb(0.35, 0.35, 0.38),
  });

  // Right-side Medium OTP Callout Box (high contrast for B&W or Color prints)
  const otpBoxW = 166;
  const otpBoxH = HEADER_H - 20;
  const otpBoxX = PAGE_W - MARGIN - otpBoxW - 10;
  const otpBoxY = HEADER_Y + 10;
  const otpBannerH = 22;

  page.drawRectangle({
    x: otpBoxX,
    y: otpBoxY,
    width: otpBoxW,
    height: otpBoxH,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.06, 0.07, 0.08),
    borderWidth: 2,
  });

  page.drawRectangle({
    x: otpBoxX,
    y: otpBoxY + otpBoxH - otpBannerH,
    width: otpBoxW,
    height: otpBannerH,
    color: rgb(0.06, 0.07, 0.08),
  });

  page.drawText('CUSTOMER ID NO', {
    x: otpBoxX + 38,
    y: otpBoxY + otpBoxH - 15,
    size: 9,
    font: fontBold,
    color: rgb(0.99, 0.88, 0.61),
  });

  const spacedOtp = (options.pickupOtp || '0000').slice(0, 4).split('').join(' ');
  page.drawText(spacedOtp, {
    x: otpBoxX + 20,
    y: otpBoxY + 21,
    size: 30,
    font: fontMonoBold,
    color: rgb(0.06, 0.07, 0.08),
  });

  // ------------------------------------------------------------------
  // REMAINING PAGE AREA (~81%): Printable Fun Activity Image
  // ------------------------------------------------------------------
  const actTop = HEADER_Y - 12;
  const actBottom = MARGIN;
  const actMaxW = CONTENT_W;
  const actMaxH = actTop - actBottom;

  page.drawRectangle({
    x: MARGIN,
    y: actBottom,
    width: actMaxW,
    height: actMaxH,
    borderColor: rgb(0.84, 0.84, 0.86),
    borderWidth: 0.75,
  });

  const imgRes = await fetch(options.activity.imageUrl);
  const imgBytes = await imgRes.arrayBuffer();
  const embeddedImg = await pdfDoc.embedJpg(imgBytes);
  const pad = 8;
  const boxW = actMaxW - pad * 2;
  const boxH = actMaxH - pad * 2;
  const scale = Math.min(boxW / embeddedImg.width, boxH / embeddedImg.height);
  const drawW = embeddedImg.width * scale;
  const drawH = embeddedImg.height * scale;
  const drawX = MARGIN + (actMaxW - drawW) / 2;
  const drawY = actBottom + (actMaxH - drawH) / 2;

  page.drawImage(embeddedImg, {
    x: drawX,
    y: drawY,
    width: drawW,
    height: drawH,
  });
}

/**
 * Builds upload-ready document files with the Name+OTP + Fun Activity cover page prepended.
 * - Merges all PDFs and image uploads into a single multi-page PDF with Page 1 = Cover Sheet.
 * - For non-PDF Office files (.docx, .pptx, .txt), prepends a standalone Cover Sheet PDF ahead of them.
 */
export async function prepareDocumentsWithCoverPage(params: {
  files: File[];
  customerName: string;
  pickupOtp: string;
  docPageCount: number;
  activity: FunCoverActivity;
}): Promise<{
  preparedFiles: File[];
  totalPages: number;
}> {
  const { files, customerName, pickupOtp, docPageCount, activity } = params;
  if (files.length === 0) {
    return { preparedFiles: files, totalPages: docPageCount };
  }

  const isPdfFile = (f: File) =>
    f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
  const isImageFile = (f: File) => f.type.startsWith('image/');
  const canMergeInline = files.every((f) => isPdfFile(f) || isImageFile(f));

  const docSummary =
    files.length === 1 ? files[0].name : `${files[0].name} (+${files.length - 1} more)`;

  if (canMergeInline) {
    try {
      const mergedPdf = await PDFDocument.create();
      await addIdentificationCoverPage(mergedPdf, {
        customerName,
        pickupOtp,
        documentSummary: docSummary,
        docPageCount,
        activity,
      });

      for (const item of files) {
        if (isPdfFile(item)) {
          const bytes = await item.arrayBuffer();
          const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          copiedPages.forEach((p) => mergedPdf.addPage(p));
        } else if (isImageFile(item)) {
          const { kind, bytes } = await imageFileToJpgOrPngBytes(item);
          const embedded =
            kind === 'jpg' ? await mergedPdf.embedJpg(bytes) : await mergedPdf.embedPng(bytes);
          const isLandscapeImg = embedded.width > embedded.height;
          const pW = isLandscapeImg ? 841.89 : 595.28;
          const pH = isLandscapeImg ? 595.28 : 841.89;
          const imgPage = mergedPdf.addPage([pW, pH]);
          const margin = 24;
          const scale = Math.min((pW - margin * 2) / embedded.width, (pH - margin * 2) / embedded.height);
          const w = embedded.width * scale;
          const h = embedded.height * scale;
          imgPage.drawImage(embedded, {
            x: (pW - w) / 2,
            y: (pH - h) / 2,
            width: w,
            height: h,
          });
        }
      }

      const savedBytes = await mergedPdf.save();
      const baseName = files[0].name.replace(/\.[^.]+$/, '') || 'document';
      const outFile = new File([new Uint8Array(savedBytes)], `${baseName}.pdf`, {
        type: 'application/pdf',
      });

      return {
        preparedFiles: [outFile],
        totalPages: mergedPdf.getPageCount(),
      };
    } catch (mergeErr) {
      console.warn('Inline PDF merge fallback triggered; prepending standalone cover PDF:', mergeErr);
    }
  }

  // Fallback for DOCX / PPTX / protected PDFs: prepend dedicated Page 1 sheet ahead of original files
  const coverOnlyPdf = await PDFDocument.create();
  await addIdentificationCoverPage(coverOnlyPdf, {
    customerName,
    pickupOtp,
    documentSummary: docSummary,
    docPageCount,
    activity,
  });
  const coverBytes = await coverOnlyPdf.save();
  const coverFile = new File([new Uint8Array(coverBytes)], `ID-${pickupOtp}.pdf`, {
    type: 'application/pdf',
  });

  return {
    preparedFiles: [coverFile, ...files],
    totalPages: docPageCount + 1,
  };
}

