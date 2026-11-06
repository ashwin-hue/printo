import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles, MapPin, Printer } from 'lucide-react';

interface HeroSectionProps {
  onFindShop: () => void;
  onRegisterShop?: () => void;
  onQuickUpload: () => void;
}

interface CardData {
  id: string;
  original: number;
  distilled: number;
  saved: number;
  percent: number;
  url: string;
  htmlCode: string;
  metaComment: string;
}

const CARDS_DATA: CardData[] = [
  {
    id: 'home',
    original: 70411,
    distilled: 6140,
    saved: 64271,
    percent: 91,
    url: 'printo.in/hubs/metro',
    htmlCode: `<h1>Printo — Campus Laser Protocol</h1>
<p>
  Zero-waiting cloud printing for students.
  High-speed laser hubs calibrated with
  instant 30-second counter dispatch.
</p>
<h2>At a glance</h2>
<ul>
  <li>Speed: 30s token pickup</li>
  <li>Queue latency: 94% lower</li>
  <li>Campus hubs: 4 verified centers</li>
  <li>Resolution: 1200 DPI laser</li>
</ul>
<h2>Services</h2>
<ul>
  <li>B&W Laser — ₹1.50/page</li>
  <li>Vibrant Color — ₹8.00/page</li>
  <li>Thesis Spiral — ₹35.00</li>
</ul>
<a href="/upload">Upload & Print</a>`,
    metaComment: `<!-- payload: 6,140 tokens -->
<!-- queue: physical line eliminated -->
<!-- printo.in/hubs/metro -->`
  },
  {
    id: 'price',
    original: 41208,
    distilled: 4960,
    saved: 36248,
    percent: 88,
    url: 'printo.in/pricing',
    htmlCode: `<h1>Printo — Transparent Rates</h1>
<p>
  Standardized academic pricing across all
  campus printing hubs. No hidden charges.
</p>
<h2>B&W Laser — ₹1.50 / page</h2>
<ul>
  <li>Double-sided discount: -₹0.50</li>
  <li>Paper: 80 GSM Ultra-white</li>
  <li>Speed: 60 pages/min</li>
</ul>
<h2>Vibrant Color — ₹8.00 / page</h2>
<ul>
  <li>Paper: 100 GSM Premium Bond</li>
  <li>Resolution: 1200 DPI CMYK</li>
  <li>Finishing: Spiral, Staple, Gloss</li>
</ul>`,
    metaComment: `<!-- rate_card: verified -->
<!-- original: 41,208 tokens -->
<!-- printo.in/pricing -->`
  },
  {
    id: 'case',
    original: 98432,
    distilled: 6300,
    saved: 92132,
    percent: 94,
    url: 'printo.in/cases/quadrangle',
    htmlCode: `<h1>Case Study: Quadrangle Hub</h1>
<p>
  How 4,200 Engineering students cut final
  exam printing queues from 45 mins to 12s.
</p>
<h2>The challenge</h2>
<p>
  Long physical queues outside Engineering
  Gate 3, corrupted USB drives, lost files.
</p>
<h2>The result</h2>
<ul>
  <li>94% reduction in counter wait time</li>
  <li>30s average grab-and-go token pickup</li>
  <li>0 missing or misplaced student documents</li>
</ul>
<p>"We completely eliminated physical queues."</p>`,
    metaComment: `<!-- distilled: 6,300 tokens -->
<!-- queue_eliminated: 42 mins -->
<!-- printo.in/cases/quadrangle -->`
  },
  {
    id: 'vision',
    original: 55870,
    distilled: 8215,
    saved: 47655,
    percent: 85,
    url: 'printo.in/vision',
    htmlCode: `<article>
  <h1>The Printo Vision</h1>
  <p>
    Documents ready for pickup before you even
    step foot inside the print shop.
  </p>
  <p>
    We route PDF payloads directly to high-speed
    laser presses across campus: instant queue
    calibration, zero physical line standing.
  </p>
  <h2>Principles</h2>
  <ol>
    <li>In-browser PDF.js inspection</li>
    <li>Edge cost calculation with zero surprises</li>
    <li>30-second token verification pass</li>
  </ol>
</article>`,
    metaComment: `<!-- payload: 8,215 tokens -->
<!-- protocol: direct_dispatch -->
<!-- printo.in/vision -->`
  },
  {
    id: 'alloy',
    original: 63904,
    distilled: 5512,
    saved: 58392,
    percent: 91,
    url: 'printo.in/specs/laser-press',
    htmlCode: `<h1>High-Speed Laser Press Spec</h1>
<p>Industrial thermal laser calibration.</p>
<h2>Specification</h2>
<ul>
  <li>Resolution: 1200 x 1200 DPI</li>
  <li>Paper stock: 75 to 300 GSM</li>
  <li>Max print width: A3 Full Bleed</li>
  <li>Finishing: 360° Spiral, Thermal Lamination</li>
</ul>
<h2>Available Formats</h2>
<ul>
  <li>Lab Manuals, CAD Plots, Thesis Binding</li>
</ul>
<a href="/specs.pdf">Hardware Datasheet</a>`,
    metaComment: `<!-- distilled: 5,512 tokens -->
<!-- turnaround: 12s pickup -->
<!-- printo.in/specs/laser-press -->`
  },
  {
    id: 'journal',
    original: 47316,
    distilled: 7602,
    saved: 39714,
    percent: 84,
    url: 'printo.in/journal',
    htmlCode: `<h1>Printo Journal</h1>
<p>Field notes from university printing hubs.</p>
<article>
  <h2>Why duplex printing saves 40% paper</h2>
  <time>2026-03-14</time>
</article>
<article>
  <h2>30-second pickup token design system</h2>
  <time>2026-02-02</time>
</article>
<article>
  <h2>Eliminating USB viruses in university print shops</h2>
  <time>2026-01-09</time>
</article>`,
    metaComment: `<!-- payload: 7,602 tokens -->
<!-- campus_telemetry: live -->
<!-- printo.in/journal -->`
  }
];

// Media asset URLs from CDN
const ASSETS = {
  dunes: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/0e201fcd-ffc0-46a0-bd06-faa07bf0e84b.webp',
  foundry: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/e80ba08d-d7b6-4b27-b0cd-8d0ad09c788c.webp',
  mineral: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/2bebad68-8177-446a-9550-d64074166364.webp',
  mesa: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/62b0d7c1-3eb7-44bd-9b19-57b975fb250f.webp',
  fire: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/156ff74d-ee37-4443-8f3a-11ae2095ed4c.webp',
  saltflat: 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/7b6ad638-89ec-4dec-be74-d36fbff3ea53.webp',
};

// 32-bit Integer Hash
function hash32(a: number, b: number, c: number): number {
  let h = ((a * 374761393) + (b * 668265263) + (c * 2147483647)) | 0;
  h = (Math.imul(h ^ (h >>> 13), 1274126177)) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onFindShop,
  onQuickUpload
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const codesContainerRef = useRef<HTMLDivElement>(null);

  // Counter UI state
  const [counterNum, setCounterNum] = useState<string>('−64,271');
  const [counterPct, setCounterPct] = useState<string>('91% less');

  useEffect(() => {
    const container = containerRef.current;
    const belt = beltRef.current;
    const canvas = canvasRef.current;
    const cardsEl = cardsContainerRef.current;
    const codesEl = codesContainerRef.current;
    if (!container || !belt || !canvas || !cardsEl || !codesEl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Palette: white-hot to fiery orange
    const PALETTE = ['#FF4A12', '#FF5A1F', '#FF6B2C', '#FF8A3D', '#FFB06A', '#FFD9B5', '#FFF3E6'];

    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
      maxLife: number;
    }
    const sparks: Spark[] = [];

    let animId = 0;
    let lastT = performance.now();
    let off = 0;
    let vel = 0;
    let hoverVal = 0;
    let isHovered = false;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartOff = 0;
    let lastDragX = 0;
    let lastDragT = 0;
    let currentShownNumber = 64271;
    let targetNumber = 64271;

    // Geometry state
    let cw = 0;
    let ch = 0;
    let gap = 0;
    let Lx = 0;
    let dpr = 1;

    const measure = () => {
      const w = window.innerWidth;
      const isMobile = w <= 767;
      cw = isMobile ? w * 0.84 : w * 0.46;
      ch = isMobile ? w * 0.54 : window.innerHeight * 0.52;
      gap = isMobile ? w * 0.07 : w * 0.0475;
      Lx = window.innerWidth / 2;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      const beltRect = belt.getBoundingClientRect();
      canvas.width = beltRect.width * dpr;
      canvas.height = beltRect.height * dpr;
      canvas.style.width = `${beltRect.width}px`;
      canvas.style.height = `${beltRect.height}px`;

      // Set CSS variables on container
      container.style.setProperty('--cw', `${cw}px`);
      container.style.setProperty('--ch', `${ch}px`);
      container.style.setProperty('--gap', `${gap}px`);
    };

    measure();
    off = Lx - 0.62 * cw;
    window.addEventListener('resize', measure);

    // Pointer events for dragging
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartOff = off;
      lastDragX = e.clientX;
      lastDragT = performance.now();
      belt.setPointerCapture(e.pointerId);
      belt.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const now = performance.now();
      const dx = e.clientX - lastDragX;
      const dt = Math.max(8, now - lastDragT);
      const instantVel = (dx / dt) * 1000;
      vel = instantVel * 0.8 + vel * 0.2;
      off += dx;
      lastDragX = e.clientX;
      lastDragT = now;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        belt.releasePointerCapture(e.pointerId);
      } catch (_) {}
      belt.style.cursor = 'grab';
    };

    const onMouseEnter = () => { isHovered = true; };
    const onMouseLeave = () => { isHovered = false; };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        vel += -e.deltaX * 6;
      }
    };

    belt.addEventListener('pointerdown', onPointerDown);
    belt.addEventListener('pointermove', onPointerMove);
    belt.addEventListener('pointerup', onPointerUp);
    belt.addEventListener('pointercancel', onPointerUp);
    belt.addEventListener('mouseenter', onMouseEnter);
    belt.addEventListener('mouseleave', onMouseLeave);
    belt.addEventListener('wheel', onWheel, { passive: true });

    // Main animation loop
    const frame = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;

      // Speed control
      const autoSpeed = -0.075 * window.innerWidth;
      const hoverTarget = isHovered ? 1 : 0;
      hoverVal += (hoverTarget - hoverVal) * Math.min(1, dt * 4);
      const targetSpeed = autoSpeed * (1 - 0.65 * hoverVal);

      if (!isDragging) {
        vel += (targetSpeed - vel) * (1 - Math.exp(-2.2 * dt));
        off += vel * dt;
      }

      const span = cw + gap;
      const period = span * 6;

      // Clear canvas
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      let activeCrossingCardIdx = -1;
      let activeProgress = 0;

      const cardNodes = cardsEl.children;
      const codeNodes = codesEl.children;

      // Top offset inside belt
      const topOffset = 70;

      for (let i = 0; i < 6; i++) {
        // Compute wrapped x coordinate
        let x = (((off + i * span + span) % period) + period) % period - span;
        const cut = Math.max(0, Math.min(cw, Lx - x));

        const cardEl = cardNodes[i] as HTMLElement;
        const codeEl = codeNodes[i] as HTMLElement;

        if (cardEl) {
          cardEl.style.transform = `translate3d(${x}px, 0, 0)`;
          if (cut > 0) {
            cardEl.style.clipPath = `inset(0 0 0 ${cut}px round 0 1.6vw 1.6vw 0)`;
            cardEl.style.maskImage = `linear-gradient(90deg, transparent ${cut}px, #000 ${cut + 26}px)`;
            (cardEl.style as any).webkitMaskImage = `linear-gradient(90deg, transparent ${cut}px, #000 ${cut + 26}px)`;
          } else {
            cardEl.style.clipPath = 'none';
            cardEl.style.maskImage = 'none';
            (cardEl.style as any).webkitMaskImage = 'none';
          }
        }

        if (codeEl) {
          codeEl.style.transform = `translate3d(${x}px, 0, 0)`;
          if (cut > 0) {
            codeEl.style.visibility = 'visible';
            codeEl.style.clipPath = `inset(0 ${cw - cut}px 0 0)`;
          } else {
            codeEl.style.visibility = 'hidden';
          }
        }

        // Active crossing card for counter
        if (cut > 0 && cut < cw) {
          activeCrossingCardIdx = i;
          activeProgress = cut / cw;
        }

        // Dissolve Canvas Particle FX
        const rightEdgePast = x + cw > Lx;
        if (cut > 0 && rightEdgePast) {
          // 1. Glowing Haze
          const hazeW = Math.min(150, x + cw - Lx);
          if (hazeW > 0) {
            const grad = ctx.createLinearGradient(Lx, 0, Lx + hazeW, 0);
            grad.addColorStop(0, 'rgba(255, 96, 40, 0.42)');
            grad.addColorStop(1, 'rgba(255, 96, 40, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(Lx, topOffset, hazeW, ch);
          }

          // 2. Dithered 3px Grid Particles
          const R = 0.3 * cw;
          const gxStart = Math.floor(cut / 3);
          const gxEnd = Math.floor(Math.min(cw, cut + R) / 3);
          const rows = Math.floor(ch / 3);

          const timeFloor = Math.floor((t / 1000) * 9) + 97;

          for (let gx = gxStart; gx <= gxEnd; gx++) {
            const sx = x + gx * 3;
            const d = sx - Lx;
            if (d < 0) continue;
            const p = Math.pow(Math.max(0, 1 - d / R), 1.7);

            for (let row = -5; row <= rows + 5; row++) {
              const isInside = row >= 0 && row < rows;
              const prob = isInside ? p * 0.92 : p * 0.16 * Math.max(0, 1 - Math.abs(row < 0 ? row : row - rows) / 5);

              const h1 = hash32(gx, row, i);
              if (h1 >= prob) continue;

              // Twinkle skip
              if (hash32(gx, row, timeFloor) < 0.22) continue;

              const h2 = hash32(row, gx, i + 31);
              let color = PALETTE[Math.floor(h2 * h2 * 7)];
              if (d <= 10) {
                // White-hot edge
                color = PALETTE[Math.min(6, 4 + Math.floor(h2 * 3))];
              }

              const size = 1.1 + h2 * 1.7;
              const jx = (hash32(gx, row, 11) - 0.5) * 1.6;
              const jy = (hash32(row, gx, 22) - 0.5) * 1.6;

              ctx.fillStyle = color;
              ctx.fillRect(sx + jx, topOffset + row * 3 + jy, size, size);
            }
          }

          // 3. Free Sparks Spawning
          if (Math.random() < 0.7 && sparks.length < 90) {
            const sparkY = topOffset - 10 + Math.random() * (ch + 20);
            const sparkX = Lx + Math.random() * 30;
            const hColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];
            sparks.push({
              x: sparkX,
              y: sparkY,
              vx: (-30 + Math.random() * 70) + vel * 0.6,
              vy: -25 + Math.random() * 50,
              size: 0.8 + Math.random() * 1.8,
              color: hColor,
              life: 0.3 + Math.random() * 0.8,
              maxLife: 0.3 + Math.random() * 0.8
            });
          }
        }
      }

      // Update and Draw Free Sparks
      for (let sIdx = sparks.length - 1; sIdx >= 0; sIdx--) {
        const s = sparks[sIdx];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(sIdx, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const alpha = Math.min(1, s.life * 2.2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.size, s.size);
        ctx.restore();
      }

      ctx.restore();

      // Counter update
      if (activeCrossingCardIdx !== -1) {
        const data = CARDS_DATA[activeCrossingCardIdx];
        targetNumber = Math.round(data.saved * activeProgress);
        setCounterPct(`${data.percent}% less`);
      }
      currentShownNumber += (targetNumber - currentShownNumber) * Math.min(1, dt * 14);
      setCounterNum(`\u2212${Math.round(currentShownNumber).toLocaleString('en-US')}`);

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', measure);
      belt.removeEventListener('pointerdown', onPointerDown);
      belt.removeEventListener('pointermove', onPointerMove);
      belt.removeEventListener('pointerup', onPointerUp);
      belt.removeEventListener('pointercancel', onPointerUp);
      belt.removeEventListener('mouseenter', onMouseEnter);
      belt.removeEventListener('mouseleave', onMouseLeave);
      belt.removeEventListener('wheel', onWheel);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[92vh] lg:min-h-[96vh] bg-[#EEF0F2] text-[#0F1115] overflow-hidden select-none"
      style={{
        ['--bg' as any]: '#EEF0F2',
        ['--ink' as any]: '#0F1115',
        ['--body' as any]: '#2A2E35',
        ['--muted' as any]: '#8B9098',
        ['--code' as any]: '#7A7F88',
        ['--comment' as any]: '#B3B8BF',
        ['--hot' as any]: '#FF5A1F',
        ['--hot-soft' as any]: '#FFE1D3'
      }}
    >
      {/* Top Hero Copy: Two Column Grid (1fr | 34vw) */}
      <div className="max-w-[1440px] mx-auto pt-8 sm:pt-10 px-6 sm:px-10 lg:px-[8.9vw] grid grid-cols-1 lg:grid-cols-[1fr_34vw] gap-6 lg:gap-[4vw] items-start relative z-20">
        
        {/* Left Column: Eyebrow + Serif Headline */}
        <div>
          <div className="font-plex font-medium text-[11.5px] tracking-[0.06em] uppercase text-[#2A2E35] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse"></span>
            CAMPUS ZERO-WAITING PROTOCOL
          </div>
          <h1 className="font-newsreader text-[32px] sm:text-[44px] lg:text-[clamp(32px,3.2vw,58px)] leading-[1.05] tracking-[-0.025em] text-[#0F1115] mt-3">
            Uploaded in seconds.
            <br />
            <em className="italic text-[#0F1115]/90">Printed before you arrive.</em>
          </h1>
        </div>

        {/* Right Column: Paragraph + Hot Pill Button */}
        <div className="flex flex-col items-start lg:items-start lg:max-w-[34vw]">
          <p className="font-inter font-normal text-[14.5px] sm:text-[15.5px] lg:text-[clamp(14px,1.05vw,19px)] leading-[1.55] text-[#2A2E35]">
            Printo detects university PDF payloads at the edge, calculates laser finishing specs, and routes them directly to nearby campus print hubs—ready for 30‑second grab‑and‑go pickup.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onQuickUpload}
              className="h-10 px-[22px] rounded-full bg-[#FF5A1F] hover:bg-[#e84e16] text-white font-inter font-medium text-[13px] shadow-sm hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex items-center gap-2"
            >
              <span>Upload & Print Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onFindShop}
              className="h-10 px-[18px] rounded-full bg-white/60 hover:bg-white text-[#2A2E35] border border-[#C4C9CF] font-inter font-medium text-[13px] transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Campus Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Belt Stage */}
      <div className="relative w-full mt-6 sm:mt-8 pb-10">
        
        {/* The Belt Container */}
        <div
          ref={beltRef}
          className="belt relative w-full h-[calc(var(--ch,380px)+140px)] cursor-grab active:cursor-grabbing touch-pan-y overflow-hidden"
          style={{ height: 'calc(var(--ch, 420px) + 140px)' }}
        >
          {/* Layer 1: Code Layer (.codes) */}
          <div
            ref={codesContainerRef}
            className="codes absolute inset-0 pointer-events-none"
            style={{
              maskImage: 'linear-gradient(90deg, transparent 0, #000 24vw)',
              WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 24vw)'
            }}
          >
            {CARDS_DATA.map((card) => (
              <div
                key={`code-${card.id}`}
                className="code-card absolute top-[70px] left-0 rounded-[1.6vw] overflow-hidden bg-slate-900/90 border border-slate-700/60 p-6 shadow-xl"
                style={{
                  width: 'var(--cw, 660px)',
                  height: 'var(--ch, 420px)',
                  containerType: 'inline-size'
                }}
              >
                {/* HTML Monospace Printout */}
                <div className="absolute top-6 left-6 right-[48%] bottom-6 overflow-hidden">
                  <pre className="font-plex text-[#7A7F88] text-[1.56cqw] leading-[1.39] whitespace-pre font-normal select-text">
                    {card.htmlCode}
                  </pre>
                </div>

                {/* Meta Block: Right side comments */}
                <div className="absolute top-6 left-[54%] right-6 bottom-6 overflow-hidden border-l border-slate-800 pl-4">
                  <pre className="font-plex text-[#B3B8BF] text-[1.56cqw] leading-[1.39] whitespace-pre font-normal select-text">
                    {card.metaComment}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* Layer 2: Real Website/Document Cards (.cards) */}
          <div
            ref={cardsContainerRef}
            className="cards absolute inset-0 pointer-events-none"
          >
            {/* Card 1: Home / Research Thesis */}
            <div
              className="card-item absolute top-[70px] left-0 rounded-[1.6vw] overflow-hidden text-white shadow-2xl bg-[#140a04]"
              style={{
                width: 'var(--cw, 660px)',
                height: 'var(--ch, 420px)',
                backgroundImage: `linear-gradient(to bottom, rgba(20,10,4,0.3) 0%, transparent 35%, rgba(20,10,4,0.7) 100%), url(${ASSETS.dunes})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                containerType: 'inline-size'
              }}
            >
              {/* Card Nav Header */}
              <div className="absolute top-[4cqw] left-[4.4cqw] right-[4.4cqw] flex items-center justify-between">
                <div className="flex items-center gap-[1.3cqw]">
                  <div className="w-[5.4cqw] h-[4.2cqw] rounded bg-white/20 flex items-center justify-center font-bold text-[2.5cqw]">⚡</div>
                  <span className="font-inter font-medium text-[4.6cqw] tracking-[-0.03em]">Printo</span>
                </div>
                <div className="flex items-center gap-[3.4cqw] font-inter font-medium text-[1.32cqw] tracking-[0.14em] uppercase opacity-90">
                  <span className="px-[1.6cqw] py-[0.7cqw] rounded-full border border-white/60">DISPATCH</span>
                  <span>HUBS</span>
                  <span>SPECS</span>
                </div>
              </div>

              {/* Bottom Content */}
              <div className="absolute bottom-[4.5cqw] left-[4.4cqw] right-[4.4cqw] flex items-end justify-between">
                <div className="flex items-end gap-[4cqw]">
                  <div>
                    <div className="font-inter font-light text-[9cqw] leading-[0.9] tracking-[-0.04em]">200x</div>
                    <div className="font-inter text-[1.9cqw] opacity-80 mt-1">faster pickup</div>
                  </div>
                  <div className="w-px h-[6cqw] bg-white/35" />
                  <div>
                    <div className="font-inter font-light text-[9cqw] leading-[0.9] tracking-[-0.04em]">94%</div>
                    <div className="font-inter text-[1.9cqw] opacity-80 mt-1">queue avoided</div>
                  </div>
                </div>
                <p className="font-inter font-normal text-[2.2cqw] max-w-[24cqw] leading-tight text-right opacity-90">
                  Zero physical queues. High-speed laser calibrated.
                </p>
              </div>
            </div>

            {/* Card 2: Price / Standardized Rates */}
            <div
              className="card-item absolute top-[70px] left-0 rounded-[1.6vw] overflow-hidden text-[#2A1406] shadow-2xl"
              style={{
                width: 'var(--cw, 660px)',
                height: 'var(--ch, 420px)',
                background: 'radial-gradient(120% 90% at 20% 110%, #FF6A1F 0%, #FF9A4A 35%, #F7C79A 62%, #EFD9C4 100%)',
                containerType: 'inline-size'
              }}
            >
              {/* Card Nav Header */}
              <div className="absolute top-[4cqw] left-[4.4cqw] right-[4.4cqw] flex items-center justify-between">
                <div className="flex items-center gap-[1.3cqw]">
                  <span className="font-inter font-bold text-[4.6cqw] tracking-[-0.03em]">Printo</span>
                </div>
                <div className="flex items-center gap-[3.4cqw] font-inter font-medium text-[1.32cqw] tracking-[0.14em] uppercase">
                  <span>DISPATCH</span>
                  <span className="px-[1.6cqw] py-[0.7cqw] rounded-full border border-[#2A1406]/60">PRICING</span>
                  <span>HUBS</span>
                </div>
              </div>

              {/* Price Content */}
              <div className="absolute top-[34%] left-[4.4cqw]">
                <div className="font-inter font-light text-[13cqw] tracking-[-0.05em] leading-none">
                  <span className="text-[7cqw] align-top mr-1">₹</span>1.50
                </div>
                <div className="font-plex font-medium text-[1.6cqw] opacity-75 mt-2 tracking-wider uppercase">
                  PER PAGE · B&W LASER 1200 DPI
                </div>
              </div>

              {/* Right: Plans List */}
              <div className="absolute top-[32%] right-[4.4cqw] w-[36cqw] space-y-[1.8cqw]">
                <div className="border-t border-[#2A1406]/25 pt-2 flex justify-between font-inter text-[1.8cqw] font-medium">
                  <span>B&W Duplex</span>
                  <span>₹1.25 / p</span>
                </div>
                <div className="border-t border-[#2A1406]/25 pt-2 flex justify-between font-inter text-[1.8cqw] font-medium">
                  <span>Vibrant Color</span>
                  <span>₹8.00 / p</span>
                </div>
                <div className="border-t border-[#2A1406]/25 pt-2 flex justify-between font-inter text-[1.8cqw] font-medium">
                  <span>Thesis Spiral</span>
                  <span>₹35.00</span>
                </div>
              </div>

              {/* Bottom Left Button */}
              <div className="absolute bottom-[4.5cqw] left-[4.4cqw]">
                <button className="px-[2.8cqw] py-[1.2cqw] rounded-full bg-[#2A1406] text-[#F7E6D6] font-inter font-medium text-[1.6cqw]">
                  Start a print
                </button>
              </div>
            </div>

            {/* Card 3: Case Study / Campus Impact */}
            <div
              className="card-item absolute top-[70px] left-0 rounded-[1.6vw] overflow-hidden text-white shadow-2xl"
              style={{
                width: 'var(--cw, 660px)',
                height: 'var(--ch, 420px)',
                backgroundImage: `linear-gradient(rgba(25,14,8,0.2), rgba(25,14,8,0.7)), url(${ASSETS.mineral})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                containerType: 'inline-size'
              }}
            >
              <div className="absolute top-[4cqw] left-[4.4cqw] right-[4.4cqw] flex items-center justify-between">
                <span className="font-inter font-medium text-[4.6cqw]">Printo</span>
                <span className="font-inter font-medium text-[1.32cqw] tracking-[0.14em] uppercase opacity-90 px-[1.6cqw] py-[0.7cqw] rounded-full border border-white/60">
                  CASE STUDY
                </span>
              </div>

              <div className="absolute top-[17%] left-[4.4cqw] font-plex text-[1.4cqw] tracking-widest uppercase opacity-80">
                CASE STUDY · CAMPUS QUADRANGLE
              </div>
              <h2 className="absolute top-[25%] left-[4.4cqw] max-w-[56cqw] font-newsreader text-[4.4cqw] leading-[1.1] font-normal">
                How 4,200 Engineering Students Eliminated Exam Queue Waiting
              </h2>

              <div className="absolute bottom-[4.5cqw] left-[4.4cqw] right-[4.4cqw] grid grid-cols-3 gap-4 border-t border-white/30 pt-[2cqw]">
                <div>
                  <div className="font-inter font-light text-[6cqw]">30s</div>
                  <div className="font-inter text-[1.5cqw] opacity-80">counter pickup</div>
                </div>
                <div>
                  <div className="font-inter font-light text-[6cqw]">94%</div>
                  <div className="font-inter text-[1.5cqw] opacity-80">less waiting</div>
                </div>
                <div>
                  <div className="font-inter font-light text-[6cqw]">0</div>
                  <div className="font-inter text-[1.5cqw] opacity-80">lost documents</div>
                </div>
              </div>
            </div>

            {/* Card 4: Vision / High Precision */}
            <div
              className="card-item absolute top-[70px] left-0 rounded-[1.6vw] overflow-hidden text-white shadow-2xl bg-[#1B1311]"
              style={{
                width: 'var(--cw, 660px)',
                height: 'var(--ch, 420px)',
                containerType: 'inline-size'
              }}
            >
              <div className="absolute top-[4cqw] left-[4.4cqw] right-[4.4cqw] flex items-center justify-between">
                <span className="font-inter font-medium text-[4.6cqw]">Printo</span>
                <span className="font-inter font-medium text-[1.32cqw] tracking-[0.14em] uppercase opacity-90 px-[1.6cqw] py-[0.7cqw] rounded-full border border-white/60">
                  VISION
                </span>
              </div>

              {/* Tiles Row */}
              <div className="absolute top-[21%] left-[4.4cqw] right-[4.4cqw] h-[46%] grid grid-cols-[1fr_1fr_1.2fr] gap-[2cqw] items-center">
                <div
                  className="h-full rounded-[1.4cqw] bg-cover bg-center"
                  style={{ backgroundImage: `url(${ASSETS.foundry})` }}
                />
                <div
                  className="h-full rounded-[1.4cqw] bg-cover bg-center"
                  style={{ backgroundImage: `url(${ASSETS.mesa})` }}
                />
                <p className="font-newsreader text-[3.4cqw] leading-[1.2] px-2">
                  The Printo vision: <em className="italic opacity-80">prints ready before you step across the threshold.</em>
                </p>
              </div>

              <div className="absolute bottom-[4.5cqw] left-[4.4cqw] right-[4.4cqw] flex justify-between font-inter text-[1.6cqw] opacity-70">
                <span>High-speed laser presses across campus</span>
                <span>Manifesto · 30-sec Protocol</span>
              </div>
            </div>

            {/* Card 5: Laser Tech / Thermal Spec */}
            <div
              className="card-item absolute top-[70px] left-0 rounded-[1.6vw] overflow-hidden text-white shadow-2xl bg-[#140C08]"
              style={{
                width: 'var(--cw, 660px)',
                height: 'var(--ch, 420px)',
                backgroundImage: `linear-gradient(to right, rgba(20,12,8,0.9), rgba(20,12,8,0.3)), url(${ASSETS.fire})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                containerType: 'inline-size'
              }}
            >
              <div className="absolute top-[4cqw] left-[4.4cqw] right-[4.4cqw] flex items-center justify-between">
                <span className="font-inter font-medium text-[4.6cqw]">Printo</span>
                <span className="font-inter font-medium text-[1.32cqw] tracking-[0.14em] uppercase opacity-90 px-[1.6cqw] py-[0.7cqw] rounded-full border border-white/60">
                  HARDWARE
                </span>
              </div>

              <div className="absolute bottom-[4.5cqw] left-[4.4cqw]">
                <div className="font-newsreader text-[7.4cqw] leading-[0.98]">
                  Zero-smudge
                  <br />
                  <em className="italic">laser print.</em>
                </div>
              </div>

              <div className="absolute bottom-[4.5cqw] right-[4.4cqw] w-[30cqw] space-y-[1.2cqw] font-inter text-[1.6cqw]">
                <div className="border-t border-white/20 pt-1 flex justify-between">
                  <span className="opacity-70">Engine</span>
                  <span className="font-medium">1200 DPI Laser</span>
                </div>
                <div className="border-t border-white/20 pt-1 flex justify-between">
                  <span className="opacity-70">Paper</span>
                  <span className="font-medium">80–100 GSM Bond</span>
                </div>
                <div className="border-t border-white/20 pt-1 flex justify-between">
                  <span className="opacity-70">Binding</span>
                  <span className="font-medium">Spiral Coil ↗</span>
                </div>
              </div>
            </div>

            {/* Card 6: Journal / Field Notes */}
            <div
              className="card-item absolute top-[70px] left-0 rounded-[1.6vw] overflow-hidden text-[#121A2A] shadow-2xl bg-[#E9ECF1]"
              style={{
                width: 'var(--cw, 660px)',
                height: 'var(--ch, 420px)',
                containerType: 'inline-size'
              }}
            >
              <div className="absolute top-[4cqw] left-[4.4cqw] right-[4.4cqw] flex items-center justify-between">
                <span className="font-inter font-medium text-[4.6cqw]">Printo</span>
                <span className="font-inter font-medium text-[1.32cqw] tracking-[0.14em] uppercase opacity-70 px-[1.6cqw] py-[0.7cqw] rounded-full border border-[#121A2A]/40">
                  JOURNAL
                </span>
              </div>

              <div className="absolute top-[23%] left-[4.4cqw]">
                <h3 className="font-newsreader text-[5.6cqw] leading-none">Journal</h3>
                <p className="font-newsreader italic text-[2.6cqw] text-[#46618E] mt-1">field notes from campus hubs</p>
              </div>

              {/* Three Posts Columns */}
              <div className="absolute bottom-[4.5cqw] left-[4.4cqw] right-[4.4cqw] grid grid-cols-[1.25fr_1fr_1fr] gap-[2cqw]">
                <div className="space-y-1">
                  <div
                    className="w-full h-[10cqw] rounded-[1.2cqw] bg-cover bg-center"
                    style={{ backgroundImage: `url(${ASSETS.saltflat})` }}
                  />
                  <div className="font-plex text-[1.1cqw] text-[#6A7891] uppercase">DISPATCH</div>
                  <div className="font-inter text-[1.35cqw] font-semibold leading-tight">30-second token verification pass</div>
                </div>
                <div className="space-y-1">
                  <div
                    className="w-full h-[10cqw] rounded-[1.2cqw] bg-cover bg-center"
                    style={{ backgroundImage: `url(${ASSETS.mesa})` }}
                  />
                  <div className="font-plex text-[1.1cqw] text-[#6A7891] uppercase">PAPER</div>
                  <div className="font-inter text-[1.35cqw] font-semibold leading-tight">Why double-sided saves 40% cost</div>
                </div>
                <div className="space-y-1">
                  <div
                    className="w-full h-[10cqw] rounded-[1.2cqw] bg-cover bg-center"
                    style={{ backgroundImage: `url(${ASSETS.dunes})` }}
                  />
                  <div className="font-plex text-[1.1cqw] text-[#6A7891] uppercase">HUBS</div>
                  <div className="font-inter text-[1.35cqw] font-semibold leading-tight">Routing jobs to closest laser printer</div>
                </div>
              </div>
            </div>
          </div>

          {/* Layer 3: FX Canvas for Haze, Dithered Particles & Free Sparks */}
          <canvas
            ref={canvasRef}
            className="fx absolute inset-0 pointer-events-none z-10"
          />

          {/* Scanner Line System: Vertical Centre at left: 50% */}
          <div
            className="scan absolute pointer-events-none z-30"
            style={{
              left: '50%',
              top: '56px',
              height: 'calc(var(--ch, 420px) + 40px)',
              width: '0px'
            }}
          >
            {/* Core Vertical Glowing Line */}
            <i
              className="absolute top-0 bottom-0 block rounded-[4px]"
              style={{
                left: '-2px',
                width: '4px',
                background: 'linear-gradient(to bottom, #ff7a3c 0%, #FF5A1F 12%, #FF5A1F 88%, #ff7a3c 100%)',
                boxShadow: '0 0 10px 2px rgba(255,90,31,0.85), 0 0 34px 10px rgba(255,90,31,0.38)'
              }}
            />

            {/* Glowing Halo Spilling Onto the Card Side Only */}
            <b
              className="absolute block pointer-events-none"
              style={{
                left: '0px',
                top: '4%',
                height: '92%',
                width: '42px',
                background: 'linear-gradient(to right, rgba(255,110,50,0.55) 0%, transparent 100%)',
                filter: 'blur(6px)'
              }}
            />
          </div>

          {/* Counter Badge: Positioned centered on the line, riding ~20px above cards */}
          <div
            className="badge absolute pointer-events-none z-40 flex flex-col items-center gap-[9px]"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              top: '12px'
            }}
          >
            <span className="font-inter font-normal text-[11.5px] text-[#8B9098]">
              Queue time eliminated
            </span>
            <div
              className="h-[26px] rounded-full overflow-hidden flex items-center font-plex font-medium text-[12.5px]"
              style={{
                boxShadow: '0 0 18px rgba(255,90,31,0.35)'
              }}
            >
              {/* Left Number */}
              <div className="h-full bg-[#FF5A1F] text-white px-[12px] flex items-center justify-end font-mono tabular-nums tracking-tight">
                {counterNum}
              </div>
              {/* Right Percent */}
              <div className="h-full bg-[#FFE1D3] text-[#D9430F] text-[11px] px-[11px] flex items-center font-bold">
                {counterPct}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
