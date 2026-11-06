import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, AlertCircle, Sparkles, Lock, Mail, User, LogOut, Database, Store } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { SAMPLE_USERS, setCurrentUser, getCurrentUser, initStorage } from './services/storage';

export function App() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    initStorage();

    // Check active Supabase session
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setSessionUser(session.user);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSessionUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    } else {
      // Fallback check local demo user
      const local = getCurrentUser();
      if (local && local.role === 'shop_owner') {
        setSessionUser({ email: local.email, user_metadata: { full_name: local.name, shop_name: 'Campus Laser Print' } });
      }
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        if (mode === 'login') {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          setSuccessMsg(`Welcome back, Operator ${data.user.email}!`);
          setSessionUser(data.user);
        } else {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: ownerName || 'Shop Operator',
                shop_name: shopName || 'Express Print Station',
                role: 'shop_owner',
              },
            },
          });
          if (error) throw error;
          setSuccessMsg('Shop registered! Check email to confirm or sign in directly.');
          setSessionUser(data.user);
        }
      } else {
        // Local demo fallback if Supabase keys aren't set in .env yet
        setTimeout(() => {
          const newOperator = {
            id: `usr-${Date.now()}`,
            name: ownerName || 'Amit Patel',
            email: email || 'operator@printo.in',
            phone: '+91 98123 45678',
            role: 'shop_owner' as const,
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            created_at: new Date().toISOString(),
          };
          setCurrentUser(newOperator);
          setSessionUser({ email: newOperator.email, user_metadata: { full_name: newOperator.name, shop_name: shopName || 'Express Print Station' } });
          setSuccessMsg(`Signed in as ${newOperator.name} (Shop Owner Demo)`);
          setLoading(false);
        }, 500);
        return;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFastDemoLogin = (targetIndex: number) => {
    const demo = SAMPLE_USERS[targetIndex];
    setCurrentUser(demo);
    setSessionUser({ email: demo.email, user_metadata: { full_name: demo.name, shop_name: 'Metro Fast Print' } });
    setEmail(demo.email);
    setPassword('••••••••');
    setSuccessMsg(`Signed in as ${demo.name} (${demo.role})`);
    setErrorMsg(null);
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSessionUser(null);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#18191C] p-3 sm:p-6 md:p-10 flex items-center justify-center font-sans antialiased selection:bg-[#FF5A1F] selection:text-white">
      
      {/* The Hero Tablet Card matching Reference Image */}
      <div className="w-full max-w-5xl rounded-[32px] sm:rounded-[44px] border-[10px] sm:border-[12px] border-black bg-black text-white overflow-hidden shadow-2xl relative flex flex-col lg:flex-row my-auto">
        
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
                <span className="text-white">Shop Hub</span>
                <span className="text-white/30">•</span>
                <a
                  href="http://localhost:5173"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Student Portal
                </a>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-[10px] text-white/50">{isSupabaseConfigured ? 'Supabase Live' : 'Supabase Ready'}</span>
                </div>
              </div>
            </div>

            {/* Main Editorial Headline matching reference image */}
            <div className="space-y-2 mb-4">
              <h1 className="font-serif font-black text-4xl sm:text-5xl md:text-[54px] text-white tracking-[-0.035em] leading-[0.96]">
                Disc<span className="text-[#C4B5FD] inline-block -rotate-6">✻</span>ver<br />
                <span className="font-normal italic text-white/95">Laser Queue.</span>
              </h1>
              
              <p className="font-sans text-xs sm:text-[13px] text-white/70 leading-relaxed max-w-sm pt-2">
                Commercial dispatch console for campus print hubs. Powered by Supabase Auth ✿
              </p>
            </div>
          </div>

          {/* Form & Actions */}
          <div className="space-y-4 my-2">
            
            {/* If Already Logged In */}
            {sessionUser ? (
              <div className="p-4 rounded-2xl bg-white/10 border border-white/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-xs text-emerald-300 font-bold">Active Operator Session</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-mono transition-all"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                </div>
                <div className="font-sans text-sm text-white font-medium">
                  Operator: <span className="font-bold text-[#C4B5FD]">{sessionUser.user_metadata?.full_name || sessionUser.email}</span>
                </div>
                {sessionUser.user_metadata?.shop_name && (
                  <div className="font-mono text-xs text-white/80">
                    Station: {sessionUser.user_metadata.shop_name}
                  </div>
                )}
                <div className="font-mono text-[11px] text-white/60">
                  Email: {sessionUser.email}
                </div>
              </div>
            ) : (
              <>
                {/* Mode Selector Tabs (Sign In vs Register) */}
                <div className="flex items-center gap-1 p-1 bg-white/10 rounded-full w-fit border border-white/15">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMsg(null); }}
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
                    onClick={() => { setMode('register'); setErrorMsg(null); }}
                    className={`px-4 py-1 rounded-full text-xs font-mono font-medium transition-all ${
                      mode === 'register'
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Register Shop
                  </button>
                </div>

                {/* Status Alerts */}
                {errorMsg && (
                  <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs font-sans flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-sans flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Authentication Form */}
                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {mode === 'register' && (
                    <>
                      <div className="relative">
                        <input
                          type="text"
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          placeholder="Shop / Center Name (e.g. Metro Laser Hub)"
                          className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-sans text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                          required
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="Operator Full Name"
                          className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-sans text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@printo.in"
                      className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                      required
                    />
                  </div>

                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min 6 characters)"
                      className="w-full h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-mono text-white placeholder:text-white/40 focus:outline-none focus:border-[#C4B5FD] focus:ring-1 focus:ring-[#C4B5FD] transition-all"
                      required
                      minLength={6}
                    />
                  </div>

                  {/* Lavender Pill Submit Button from Image ("Get a quote" style) */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-11 px-6 rounded-full bg-[#C4B5FD] hover:bg-[#B39DFB] disabled:opacity-50 text-black font-sans font-bold text-xs shadow-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto mt-2"
                  >
                    <span>{loading ? 'Connecting Supabase...' : mode === 'login' ? 'Open Operator Console' : 'Register Laser Station'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Quick 1-Click Fast Demo Login */}
                <div className="pt-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#C4B5FD] font-bold block mb-1.5">
                    ⚡ Quick Operator Demo:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFastDemoLogin(1)}
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white hover:text-black border border-white/20 text-[11px] font-mono transition-all flex items-center gap-1.5"
                    >
                      <span>Amit Patel</span>
                      <span className="text-[9px] opacity-60">(Shop Owner)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFastDemoLogin(0)}
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white hover:text-black border border-white/20 text-[11px] font-mono transition-all flex items-center gap-1.5"
                    >
                      <span>Priya Sharma</span>
                      <span className="text-[9px] opacity-60">(Student)</span>
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Bottom Row: Stylized Down Arrow from Image */}
          <div className="pt-4 flex items-center justify-between text-white/50 border-t border-white/10 mt-4">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase">
              <Database className="w-3 h-3 text-[#C4B5FD]" />
              <span>SUPABASE AUTH V2 // OPERATOR FLEET</span>
            </div>
            <div className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center text-white/70">
              <span className="text-sm font-bold">↓</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Editorial Mint Green Card with Artwork matching reference image */}
        <div className="w-full lg:w-[52%] p-3 sm:p-5 flex items-center justify-center bg-black">
          
          <div className="w-full h-full min-h-[380px] lg:min-h-[520px] rounded-[28px] sm:rounded-[36px] border-2 border-black overflow-hidden bg-[#84C9A2] relative flex items-center justify-center select-none shadow-inner">
            
            {/* SVG Editorial Character Illustration */}
            <svg
              className="w-full h-full object-cover"
              viewBox="0 0 540 500"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                {/* Cloud Pattern for the sweater */}
                <pattern id="cloudPatternShopsApp" width="60" height="40" patternUnits="userSpaceOnUse">
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
                    fill="url(#cloudPatternShopsApp)"
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
}

export default App;
