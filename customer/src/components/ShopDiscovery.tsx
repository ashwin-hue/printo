import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  ArrowRight,
  Store,
  Printer,
  Compass,
  Check
} from 'lucide-react';
import { getShops } from '../services/storage';
import { Shop } from '../types';

interface ShopDiscoveryProps {
  onSelectShop: (shopId: string) => void;
}

export const ShopDiscovery: React.FC<ShopDiscoveryProps> = ({ onSelectShop }) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterOpenOnly, setFilterOpenOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'radar'>('grid');

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
    <div className="py-12 bg-[#EEF0F2] text-[#0F1115] min-h-[calc(100vh-64px)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw] space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#C4C9CF]/60">
          <div>
            <div className="font-mono font-medium text-[11.5px] tracking-[0.06em] uppercase text-[#2A2E35] flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
              CAMPUS GEO-DISCOVERY
            </div>
            <h1 className="font-serif font-normal text-3xl sm:text-5xl tracking-[-0.025em] text-[#0F1115]">
              Campus Printing Hubs.<br />
              <em className="italic text-[#0F1115]/90">Mapped by distance and laser capacity.</em>
            </h1>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-full border border-[#C4C9CF]">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#0F1115] text-white shadow-sm'
                  : 'text-[#2A2E35] hover:text-[#0F1115]'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('radar')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'radar'
                  ? 'bg-[#0F1115] text-white shadow-sm'
                  : 'text-[#2A2E35] hover:text-[#0F1115]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Campus Radar HUD</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#8B9098]" />
            <input
              type="text"
              placeholder="Search by shop name, landmark, or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-11 pr-4 rounded-full bg-white border border-[#C4C9CF] text-xs font-sans text-[#0F1115] placeholder-[#8B9098] focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['all', 'Spiral Binding', 'Color', 'Laser', 'Lamination'].map((svc) => (
              <button
                key={svc}
                onClick={() => setFilterService(svc)}
                className={`h-8 px-3.5 rounded-full font-mono text-[11px] transition-all ${
                  filterService === svc
                    ? 'bg-[#FF5A1F] text-white'
                    : 'bg-white border border-[#C4C9CF] text-[#2A2E35] hover:border-[#8B9098]'
                }`}
              >
                {svc === 'all' ? 'All Services' : svc}
              </button>
            ))}

            <button
              onClick={() => setFilterOpenOnly(!filterOpenOnly)}
              className={`h-8 px-3.5 rounded-full font-mono text-[11px] border transition-all ${
                filterOpenOnly
                  ? 'border-[#FF5A1F] bg-[#FFE1D3] text-[#D9430F] font-bold'
                  : 'border-[#C4C9CF] bg-white text-[#2A2E35]'
              }`}
            >
              Open Only
            </button>
          </div>
        </div>

        {/* Radar View or Grid View */}
        {viewMode === 'radar' ? (
          <div className="rounded-[24px] bg-[#0D1017] p-8 sm:p-12 border border-white/10 shadow-2xl relative overflow-hidden min-h-[460px] flex items-center justify-center">
            {/* Concentric Radar Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[180px] h-[180px] rounded-full border border-white/10" />
              <div className="w-[320px] h-[320px] rounded-full border border-white/10 absolute" />
              <div className="w-[460px] h-[460px] rounded-full border border-white/5 absolute" />
              <div className="w-[600px] h-[600px] rounded-full border border-white/5 absolute" />
              {/* Radar Crosshairs */}
              <div className="w-full h-px bg-white/5 absolute" />
              <div className="h-full w-px bg-white/5 absolute" />
            </div>

            {/* Radar Center: Your Campus Location */}
            <div className="z-10 flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-[#FF5A1F] ring-4 ring-[#FF5A1F]/30 animate-pulse" />
              <span className="font-mono text-[10px] text-white uppercase tracking-wider mt-2 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                You (Engineering Quadrangle)
              </span>
            </div>

            {/* Hub Beacon Cards scattered on radar */}
            <div className="absolute top-16 left-12 sm:left-24 z-20">
              <button
                onClick={() => onSelectShop('shop-1')}
                className="p-3 rounded-xl bg-slate-900/90 border border-[#FF5A1F]/50 text-left hover:scale-105 transition-transform shadow-xl group"
              >
                <div className="font-mono text-[9px] text-[#FF5A1F] uppercase font-bold">0.2 KM · 2 IN QUEUE</div>
                <div className="font-sans font-semibold text-xs text-white">Metro Digital Prints</div>
                <div className="font-mono text-[10px] text-slate-400">12 min turnaround</div>
              </button>
            </div>

            <div className="absolute bottom-16 right-12 sm:right-24 z-20">
              <button
                onClick={() => onSelectShop('shop-2')}
                className="p-3 rounded-xl bg-slate-900/90 border border-white/20 text-left hover:scale-105 transition-transform shadow-xl group"
              >
                <div className="font-mono text-[9px] text-emerald-400 uppercase font-bold">0.5 KM · 4 IN QUEUE</div>
                <div className="font-sans font-semibold text-xs text-white">Apex QuickPrint</div>
                <div className="font-mono text-[10px] text-slate-400">15 min turnaround</div>
              </button>
            </div>

            <div className="absolute top-20 right-20 z-20">
              <button
                onClick={() => onSelectShop('shop-3')}
                className="p-3 rounded-xl bg-slate-900/90 border border-white/20 text-left hover:scale-105 transition-transform shadow-xl group"
              >
                <div className="font-mono text-[9px] text-emerald-400 uppercase font-bold">0.8 KM · 1 IN QUEUE</div>
                <div className="font-sans font-semibold text-xs text-white">Campus Scholar Xerox</div>
                <div className="font-mono text-[10px] text-slate-400">18 min turnaround</div>
              </button>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredShops.map((shop) => (
              <div
                key={shop.id}
                className="rounded-2xl p-6 sm:p-7 bg-white border border-[#C4C9CF] shadow-sm flex flex-col justify-between hover:-translate-y-1 hover:shadow-md transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Shop Status & Distance Pill */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#2A2E35] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FF5A1F]" />
                      <span className="font-bold">{shop.distance}</span>
                    </span>

                    <span className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      shop.accepting_orders
                        ? 'bg-[#FFE1D3] text-[#D9430F]'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {shop.accepting_orders ? 'Online & Ready' : 'Busy'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif font-normal text-2xl text-[#0F1115] leading-tight">
                      {shop.shop_name}
                    </h3>
                    <p className="font-sans text-xs text-[#7A7F88] mt-1 leading-relaxed">
                      {shop.tagline}
                    </p>
                  </div>

                  {/* Telemetry Row */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#EEF0F2] font-mono text-xs">
                    <div>
                      <span className="text-[#8B9098] block text-[10px] uppercase">Turnaround</span>
                      <span className="font-semibold text-[#0F1115]">~{shop.avg_turnaround_mins} mins avg</span>
                    </div>
                    <div>
                      <span className="text-[#8B9098] block text-[10px] uppercase">Current Queue</span>
                      <span className="font-semibold text-[#FF5A1F]">{shop.current_queue_orders} jobs ahead</span>
                    </div>
                  </div>

                  {/* Service Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {shop.services.slice(0, 4).map((svc) => (
                      <span
                        key={svc}
                        className="font-mono text-[10px] text-[#2A2E35] bg-[#EEF0F2] px-2 py-0.5 rounded-full"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#EEF0F2] flex items-center justify-between">
                  <div className="font-mono text-xs text-[#7A7F88]">
                    {shop.opening_hours}
                  </div>
                  <button
                    onClick={() => onSelectShop(shop.id)}
                    className="h-9 px-4 rounded-full bg-[#0F1115] hover:bg-[#FF5A1F] text-white font-sans font-medium text-xs shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <span>Configure Print</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
