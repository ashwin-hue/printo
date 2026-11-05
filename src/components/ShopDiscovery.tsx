import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  Layers, 
  CheckCircle2, 
  SlidersHorizontal, 
  ArrowRight,
  Store,
  Printer,
  ChevronRight,
  Sparkles,
  Map as MapIcon,
  Grid,
  Compass,
  Zap,
  Navigation
} from 'lucide-react';
import { getShops, getShopPricing } from '../services/storage';
import { Shop, ShopPricing } from '../types';

interface ShopDiscoveryProps {
  onSelectShop: (shopId: string) => void;
}

export const ShopDiscovery: React.FC<ShopDiscoveryProps> = ({ onSelectShop }) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  useEffect(() => {
    setShops(getShops());
    const handleUpdate = () => setShops(getShops());
    window.addEventListener('printo_storage_update', handleUpdate);
    return () => window.removeEventListener('printo_storage_update', handleUpdate);
  }, []);

  const filteredShops = shops.filter(shop => {
    const matchesSearch = 
      shop.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shop.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesService = 
      filterService === 'all' || 
      shop.services.some(s => s.toLowerCase().includes(filterService.toLowerCase()));

    const matchesOpen = !filterOpenOnly || (shop.is_active && shop.accepting_orders);

    return matchesSearch && matchesService && matchesOpen;
  });

  return (
    <div className="py-12 bg-dot-subtle min-h-[calc(100vh-80px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <MapPin className="w-3.5 h-3.5" />
              Verified Campus Vendors
            </div>
            <h1 className="font-display font-black text-3xl sm:text-5xl text-slate-900 tracking-[-0.03em]">
              Discover Nearby Printing Shops
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Select an authorized printing facility near your department or residence for rapid document collection.
            </p>
          </div>

          {/* Map vs Grid Toggle */}
          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-sm self-start md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Grid Directory
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Interactive Radar Map
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-premium space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by shop name, address, or service (e.g. Spiral Binding, A3 CAD)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-xs sm:text-sm text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="all">All Services</option>
                <option value="Spiral">Spiral Binding</option>
                <option value="Color">Color Printing</option>
                <option value="A3">A3 / CAD Plots</option>
                <option value="Hardcover">Hardcover Thesis</option>
              </select>

              <label className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer bg-white hover:bg-slate-50 transition-colors shrink-0">
                <input
                  type="checkbox"
                  checked={filterOpenOnly}
                  onChange={(e) => setFilterOpenOnly(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>Open Now</span>
              </label>
            </div>
          </div>
        </div>

        {/* High-Tech Architectural Radar Map View */}
        {viewMode === 'map' && (
          <div className="bg-slate-950 rounded-[32px] p-6 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                <h3 className="font-display font-black text-xl">Campus Quadrangle Print Radar</h3>
                <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                  RADIUS: 1.5 KM
                </span>
              </div>
              <span className="text-xs font-mono text-brand-400">GEO: 12.9716° N • 77.5946° E</span>
            </div>

            {/* Radar viewport with concentric rings & grid */}
            <div className="relative w-full h-[450px] bg-slate-900/90 rounded-2xl border border-slate-800/80 p-6 overflow-hidden">
              
              {/* Radar concentric circular grid */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[180px] h-[180px] rounded-full border border-brand-500/15" />
                <div className="w-[340px] h-[340px] rounded-full border border-brand-500/10" />
                <div className="w-[480px] h-[480px] rounded-full border border-brand-500/5" />
              </div>

              {/* Crosshair axis lines */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800/80 pointer-events-none" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800/80 pointer-events-none" />

              {/* Campus Roads and Landmark Labels */}
              <div className="absolute top-1/2 left-0 right-0 h-10 bg-slate-950/60 -translate-y-1/2 border-y border-slate-800/60 flex items-center justify-around text-[10px] font-mono text-slate-500 pointer-events-none">
                <span>GATE 1 • ADMIN BLOCK</span>
                <span>CENTRAL QUADRANGLE</span>
                <span>ENGINEERING GATE 3</span>
              </div>

              {/* User location beacon */}
              <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-blue-500 ring-8 ring-blue-500/20 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-white absolute" />
                </div>
                <span className="mt-1.5 px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[9px] font-bold shadow-md">
                  YOU (STUDENT HOSTEL 4)
                </span>
              </div>

              {/* Shop Pins as clickable HUD Beacons */}
              {shops.map((shop, i) => {
                const positions = [
                  { top: '35%', left: '72%' },
                  { top: '25%', left: '46%' },
                  { top: '70%', left: '32%' },
                  { top: '75%', left: '82%' },
                ];
                const pos = positions[i % positions.length];

                return (
                  <button
                    key={shop.id}
                    onClick={() => onSelectShop(shop.id)}
                    style={{ top: pos.top, left: pos.left }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group text-left focus:outline-none"
                  >
                    <div className="p-3 rounded-2xl bg-white text-slate-900 shadow-2xl border-2 border-brand-500 group-hover:scale-105 group-hover:ring-4 group-hover:ring-brand-400/30 transition-all flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold text-xs">
                        {shop.rating}★
                      </div>
                      <div>
                        <p className="font-display font-extrabold text-xs text-slate-900 leading-tight">
                          {shop.shop_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-brand-700 font-bold">
                          <span>{shop.distance}</span>
                          <span>•</span>
                          <span>~{shop.avg_turnaround_mins}m queue</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-slate-400 mt-3 text-center font-mono">
              ⚡ Click any active beacon on the quadrangle radar to load their instant laser print rate card.
            </p>
          </div>
        )}

        {/* Shop Directory Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredShops.map((shop) => {
            const pricing = getShopPricing(shop.id);

            return (
              <div
                key={shop.id}
                className="bg-white rounded-[32px] border border-slate-200/80 hover:border-brand-300 shadow-premium hover:shadow-premium-hover transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar with Status and Distance */}
                  <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200/60">
                          {shop.distance}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{shop.rating}</span>
                          <span className="text-slate-400 font-normal">({shop.review_count} reviews)</span>
                        </div>
                      </div>

                      <h2 className="font-display font-black text-xl text-slate-900 group-hover:text-brand-700 transition-colors">
                        {shop.shop_name}
                      </h2>
                      <p className="text-xs text-slate-500">{shop.tagline}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                        shop.is_active && shop.accepting_orders
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${shop.is_active && shop.accepting_orders ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {shop.is_active && shop.accepting_orders ? 'OPEN' : 'BUSY / CLOSED'}
                      </span>
                    </div>
                  </div>

                  {/* Body Info & Services */}
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span className="truncate">{shop.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span>{shop.opening_hours}</span>
                      </div>
                    </div>

                    {/* Pricing Quick Breakdown */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">B&W Laser</span>
                        <strong className="font-mono text-xs font-bold text-slate-900">
                          ₹{pricing.black_white_price.toFixed(2)}/pg
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Color Print</span>
                        <strong className="font-mono text-xs font-bold text-indigo-700">
                          ₹{pricing.color_price.toFixed(2)}/pg
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Spiral Bound</span>
                        <strong className="font-mono text-xs font-bold text-slate-900">
                          ₹{pricing.binding_price.toFixed(0)}
                        </strong>
                      </div>
                    </div>

                    {/* Services Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {shop.services.map((svc, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-[10px] font-medium text-slate-600"
                        >
                          {svc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => onSelectShop(shop.id)}
                    disabled={!shop.accepting_orders}
                    className={`w-full py-4 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      shop.accepting_orders
                        ? 'bg-brand-700 hover:bg-brand-800 text-white shadow-md shadow-brand-700/20 group-hover:shadow-lg'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{shop.accepting_orders ? 'Select This Shop & Upload Document' : 'Shop Temporarily Full'}</span>
                    {shop.accepting_orders && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredShops.length === 0 && (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
            <p className="text-slate-400 text-sm">No printing shops found matching your criteria.</p>
            <button
              onClick={() => { setSearchQuery(''); setFilterService('all'); setFilterOpenOnly(false); }}
              className="mt-3 text-brand-700 font-bold text-xs hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
