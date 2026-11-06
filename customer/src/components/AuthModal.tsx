import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Check, Sparkles, Phone, Mail, User as UserIcon } from 'lucide-react';
import { SAMPLE_USERS, setCurrentUser } from '../services/storage';
import { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFastDemoLogin = (targetIndex: number) => {
    setCurrentUser(SAMPLE_USERS[targetIndex]);
    onSuccess();
    onClose();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser = {
      id: `user-${Date.now()}`,
      name: name || (role === 'customer' ? 'Campus Student' : 'Shop Owner'),
      email: email || (phone ? `${phone.replace(/\D/g, '')}@campus.edu` : 'student@campus.edu'),
      phone: phone || '+91 98765 43210',
      role,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      created_at: new Date().toISOString(),
    };
    setCurrentUser(newUser);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      
      {/* The Hero Tablet Card matching Reference Image */}
      <div 
        className="w-full max-w-5xl rounded-[32px] sm:rounded-[44px] border-[10px] sm:border-[12px] border-black bg-black text-white overflow-hidden shadow-2xl relative flex flex-col lg:flex-row my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all border border-white/20"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT COLUMN: Editorial Typography & Authentication Form */}
        <div className="w-full lg:w-[48%] p-6 sm:p-10 flex flex-col justify-between bg-black text-white relative z-10">
          
          {/* Top Brand & Micro Nav */}
          <div>
            <div className="flex items-center justify-between pb-6 sm:pb-8">
              <div className="flex items-baseline gap-1.5 cursor-pointer">
                <span className="font-serif font-black text-2xl tracking-tight text-white lowercase">
                  printo
                </span>
                <span className="text-[#FF5A1F] text-sm">✻</span>
              </div>

              {/* Sub-links like "Topics Authors Quote" in image */}
              <div className="hidden sm:flex items-center gap-4 font-mono text-[11px] text-white/60">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`hover:text-white transition-colors ${role === 'customer' ? 'text-white underline underline-offset-4' : ''}`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('shop_owner')}
                  className={`hover:text-white transition-colors ${role === 'shop_owner' ? 'text-white underline underline-offset-4' : ''}`}
                >
                  Shop Hub
                </button>
                <span className="text-white/30">•</span>
                <span className="text-white/50">Pass v2.0</span>
              </div>
            </div>

            {/* Main Editorial Headline matching reference image */}
            <div className="space-y-2 mb-4">
              <h1 className="font-serif font-black text-4xl sm:text-5xl md:text-[54px] text-white tracking-[-0.035em] leading-[0.96]">
                Disc<span className="text-[#C4B5FD] inline-block -rotate-6">✻</span>ver<br />
                <span className="font-normal italic text-white/95">Zero Waiting.</span>
              </h1>
              
              <p className="font-sans text-xs sm:text-[13px] text-white/70 leading-relaxed max-w-sm pt-2">
                Unlock 30-second grab-and-go academic printing across campus hubs. Calibrated for student speed ✿
              </p>
            </div>
          </div>

          {/* Form & Actions */}
          <div className="space-y-4 my-2">
            
            {/* Mode Selector Tabs (Sign In vs Register) */}
            <div className="flex items-center gap-1 p-1 bg-white/10 rounded-full w-fit border border-white/15">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`px-4 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`px-4 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                  mode === 'register'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleFormSubmit} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-sans text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                    required
                  />
                </div>
              )}

              <div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Mobile Number (+91 ...)"
                  className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                  required
                />
              </div>

              {mode === 'register' && (
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@campus.edu (Optional)"
                    className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-sans text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                  />
                </div>
              )}

              {/* Lavender Pill Submit Button from Image ("Get a quote" style) */}
              <button
                type="submit"
                className="h-11 px-6 rounded-full bg-[#C4B5FD] hover:bg-[#B39DFB] text-black font-sans font-bold text-xs shadow-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto mt-2"
              >
                <span>{mode === 'login' ? 'Continue with Pass' : 'Create Free Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick 1-Click Fast Demo Login */}
            <div className="pt-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#C4B5FD] font-bold block mb-1.5">
                ⚡ Quick Demo Pass:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFastDemoLogin(0)}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white hover:text-black border border-white/20 text-[11px] font-mono transition-all flex items-center gap-1.5"
                >
                  <span>Priya Sharma</span>
                  <span className="text-[9px] opacity-60">(Student)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFastDemoLogin(1)}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white hover:text-black border border-white/20 text-[11px] font-mono transition-all flex items-center gap-1.5"
                >
                  <span>Amit Patel</span>
                  <span className="text-[9px] opacity-60">(Shop)</span>
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Row: Stylized Down Arrow from Image */}
          <div className="pt-4 flex items-center justify-between text-white/50 border-t border-white/10 mt-4">
            <span className="font-mono text-[10px] tracking-wider uppercase">
              PRINTO ACADEMIC DISPATCH
            </span>
            <div className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center text-white/70">
              <span className="text-sm font-bold">↓</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Editorial Mint Green Card with Artwork matching reference image */}
        <div className="w-full lg:w-[52%] p-3 sm:p-5 flex items-center justify-center bg-black">
          
          <div className="w-full h-full min-h-[380px] lg:min-h-[500px] rounded-[28px] sm:rounded-[36px] border-2 border-black overflow-hidden bg-[#84C9A2] relative flex items-center justify-center select-none shadow-inner">
            
            {/* SVG Editorial Character Illustration */}
            <svg
              className="w-full h-full object-cover"
              viewBox="0 0 540 500"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                {/* Stipple Shading Filter */}
                <filter id="stipple" x="0%" y="0%" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" result="noise" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.12 0" />
                  <feBlend mode="multiply" in="SourceGraphic" in2="noise" />
                </filter>
                
                {/* Cloud Pattern for the sweater */}
                <pattern id="cloudPattern" width="60" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 15,25 Q 15,18 22,18 Q 26,12 34,14 Q 42,12 45,18 Q 50,18 50,25 Q 50,30 42,30 L 18,30 Q 15,30 15,25 Z"
                    fill="#FFFFFF"
                    opacity="0.88"
                  />
                </pattern>
              </defs>

              {/* Background Color */}
              <rect width="100%" height="100%" fill="#88CCA6" />

              {/* Ambient Yellow Cloud Blobs in Background */}
              <g fill="#F5DC6E" opacity="0.92">
                <path d="M -10,80 Q 20,60 50,75 Q 80,60 110,80 Q 140,70 160,95 Q 150,130 120,140 Q 80,150 40,140 Q -10,130 -10,80 Z" />
                <path d="M 10,180 Q 35,160 70,170 Q 100,160 120,185 Q 110,215 80,225 Q 40,230 10,210 Z" />
                <path d="M 440,260 Q 470,240 500,250 Q 530,240 550,265 Q 550,300 510,310 Q 470,310 440,290 Z" />
                <path d="M 270,10 Q 300,0 330,10 Q 360,0 380,20 Q 360,40 330,40 Q 300,40 270,30 Z" />
              </g>

              {/* Floating Quote Marks " " and ink squiggles */}
              <g fill="#000000">
                {/* Big Double Quotes */}
                <path d="M 190,195 C 190,175 198,165 208,165 C 205,178 200,185 190,195 Z" />
                <path d="M 205,195 C 205,175 213,165 223,165 C 220,178 215,185 205,195 Z" />
                {/* Decorative ink line squiggles */}
                <path d="M 190,218 Q 200,214 210,218 Q 220,222 230,218" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 195,228 Q 205,224 215,228 Q 225,232 235,228" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />

                {/* Right side spark quotes */}
                <path d="M 470,130 Q 476,140 480,150" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
                <path d="M 485,125 Q 490,135 492,142" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 450,140 Q 465,135 475,145" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Retro Purple Desk Lamp in Upper Right */}
              <g>
                {/* Lamp Beam / Cone Glow */}
                <polygon points="435,200 375,340 495,340 460,200" fill="#FEF08A" opacity="0.32" />
                
                {/* Lamp Arm */}
                <path d="M 475,275 L 465,200" fill="none" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 475,275 L 490,340" fill="none" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" />
                
                {/* Purple Lampshade */}
                <path d="M 432,185 C 432,175 450,170 465,180 L 472,210 C 455,215 440,210 432,185 Z" fill="#9333EA" stroke="#000000" strokeWidth="3" strokeLinejoin="round" />
                {/* Orange Lamp bulb inner accent */}
                <ellipse cx="445" cy="205" rx="7" ry="5" fill="#F97316" />

                {/* Lamp Base */}
                <rect x="470" y="335" width="35" height="12" rx="3" fill="#9333EA" stroke="#000000" strokeWidth="3" />
              </g>

              {/* Study Desk */}
              <polygon points="215,340 540,340 540,500 215,500" fill="#75BA92" stroke="#000000" strokeWidth="3.5" />
              <line x1="215" y1="390" x2="540" y2="390" stroke="#000000" strokeWidth="3" />
              <rect x="215" y="390" width="325" height="110" fill="#62A881" />

              {/* Open Textbook on the Desk */}
              <g>
                {/* Blue Book Cover Base */}
                <polygon points="175,350 310,385 315,392 178,357" fill="#2563EB" stroke="#000000" strokeWidth="3" />
                <polygon points="315,392 410,358 415,364 318,398" fill="#2563EB" stroke="#000000" strokeWidth="3" />

                {/* Left Page (Curved Open Paper) */}
                <path
                  d="M 180,346 C 215,320 250,322 265,348 L 260,384 C 245,358 210,356 175,376 Z"
                  fill="#FFFFFF"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                
                {/* Right Page */}
                <path
                  d="M 265,348 C 285,322 320,320 348,340 L 342,374 C 315,354 280,356 260,384 Z"
                  fill="#FFFFFF"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                {/* Center Book Spine Line */}
                <path d="M 265,348 L 260,384" stroke="#000000" strokeWidth="2.5" />

                {/* Text lines on pages (wavy ink marks) */}
                <path d="M 195,352 Q 210,348 225,352 M 198,360 Q 215,356 230,360" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
                <path d="M 285,346 Q 302,342 320,346 M 283,354 Q 305,350 325,354" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
                
                {/* Quotation mark in book */}
                <text x="286" y="338" font-family="serif" font-size="14" font-weight="bold" fill="#000">”</text>
              </g>

              {/* The Character (Student at Desk) */}
              <g>
                {/* Left Arm resting on desk */}
                <path
                  d="M 285,310 C 305,335 340,360 380,375 L 390,405 C 380,410 365,405 350,370 Z"
                  fill="#FFF4E6"
                  stroke="#000000"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                
                {/* Hand resting on desk with spread fingers */}
                <path
                  d="M 370,368 C 378,380 395,405 400,408 C 395,414 385,410 375,395 C 370,405 365,408 360,392 C 355,388 360,375 365,368 Z"
                  fill="#FFF4E6"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                {/* Torso & Magenta/Pink Sweater with Cloud Motif */}
                <g>
                  {/* Sweater Base Fill */}
                  <path
                    d="M 305,240 C 310,215 350,215 365,230 L 440,240 C 445,260 455,310 455,340 L 335,340 C 315,320 300,270 305,240 Z"
                    fill="#D946EF"
                    stroke="#000000"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                  />
                  
                  {/* Cloud Pattern on Sweater */}
                  <path
                    d="M 305,240 C 310,215 350,215 365,230 L 440,240 C 445,260 455,310 455,340 L 335,340 C 315,320 300,270 305,240 Z"
                    fill="url(#cloudPattern)"
                  />

                  {/* Right Arm in Sweater */}
                  <path
                    d="M 365,230 C 385,250 405,290 415,340 L 380,340 C 370,300 355,265 345,245 Z"
                    fill="#C026D3"
                    stroke="#000000"
                    strokeWidth="3"
                  />

                  {/* Left Shoulder & White Collar */}
                  <path
                    d="M 330,225 C 342,215 358,215 368,225 L 360,245 C 350,240 338,240 330,225 Z"
                    fill="#FFFFFF"
                    stroke="#000000"
                    strokeWidth="2.5"
                  />
                </g>

                {/* Neck & Hand holding Magnifying Glass */}
                <rect x="345" y="180" width="22" height="35" rx="5" fill="#FFF4E6" stroke="#000000" strokeWidth="2.5" />
                
                {/* Hand holding the magnifying handle near chin */}
                <path
                  d="M 360,195 C 368,188 375,190 376,198 C 376,208 368,215 360,212 Z"
                  fill="#FFF4E6"
                  stroke="#000000"
                  strokeWidth="2.5"
                />

                {/* Head & Face */}
                <path
                  d="M 335,135 C 335,110 365,105 385,120 C 395,130 395,160 385,178 C 375,190 355,190 342,175 C 335,165 335,150 335,135 Z"
                  fill="#FFF4E6"
                  stroke="#000000"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />

                {/* Face Features: Right Eye & Nose */}
                <path d="M 345,155 Q 352,150 356,155" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 352,162 Q 355,168 350,170" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
                <path d="M 353,178 Q 360,181 366,177" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />

                {/* Black Bob Haircut */}
                <g fill="#000000">
                  {/* Top & Back of Hair */}
                  <path
                    d="M 335,135 C 325,125 320,105 340,85 C 365,70 395,75 410,100 C 420,120 425,155 428,185 L 400,192 C 400,165 398,140 390,130 C 385,115 365,115 355,125 C 345,135 340,155 340,170 L 320,180 C 320,160 325,145 335,135 Z"
                  />
                  {/* Front Fringe / Bangs */}
                  <path
                    d="M 340,115 C 355,100 375,105 385,118 C 378,125 365,130 355,128 Z"
                  />
                </g>

                {/* Magnifying Glass held up to Left Eye */}
                <g>
                  {/* Handle extending from hand */}
                  <line x1="375" y1="180" x2="380" y2="245" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" />

                  {/* Circular Magnifier Glass Rim */}
                  <circle cx="375" cy="155" r="28" fill="#E0F2FE" fillOpacity="0.45" stroke="#000000" strokeWidth="4" />
                  
                  {/* Magnified Left Eye inside Lens */}
                  <ellipse cx="372" cy="154" rx="10" ry="12" fill="#000000" />
                  <circle cx="369" cy="150" r="3.5" fill="#FFFFFF" />
                  {/* Magnified Eyebrow */}
                  <path d="M 360,138 Q 375,132 388,140" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
                  
                  {/* Lens Light Reflection Arc */}
                  <path d="M 355,145 A 22 22 0 0 1 385,135" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.8" strokeLinecap="round" />
                </g>

              </g>

            </svg>

          </div>

        </div>

      </div>

    </div>
  );
};

export default AuthModal;
