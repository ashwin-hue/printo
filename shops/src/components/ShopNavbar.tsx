import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bell,
  Store,
  ExternalLink,
  Power
} from 'lucide-react';
import {
  getCurrentUser,
  getShops,
  updateShop,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getOrders
} from '../services/storage';
import { Shop, User, NotificationItem } from '../types';

interface ShopNavbarProps {
  onOpenAuth: () => void;
  activeTab?: 'incoming' | 'active' | 'ready' | 'history' | 'pricing' | 'settings';
  setActiveTab?: (tab: 'incoming' | 'active' | 'ready' | 'history' | 'pricing' | 'settings') => void;
}

export const ShopNavbar: React.FC<ShopNavbarProps> = ({
  onOpenAuth,
  activeTab = 'incoming',
  setActiveTab
}) => {
  const [user, setUser] = useState<User>(getCurrentUser());
  const [shops, setShops] = useState<Shop[]>(getShops());
  const shop = shops.find(s => s.owner_id === user.id) || shops[0];
  const [isAccepting, setIsAccepting] = useState<boolean>(shop?.accepting_orders ?? true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [counts, setCounts] = useState({ incoming: 0, active: 0, ready: 0 });

  const loadData = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    const allShops = getShops();
    setShops(allShops);
    const targetShop = allShops.find(s => s.owner_id === currentUser.id) || allShops[0];
    if (targetShop) {
      setIsAccepting(targetShop.accepting_orders);
    }
    setNotifications(getNotifications(currentUser.id));

    // Calculate queue counts for badges
    const allOrders = getOrders();
    const shopOrders = allOrders.filter(o => o.shop_id === targetShop.id);
    setCounts({
      incoming: shopOrders.filter(o => o.status === 'pending').length,
      active: shopOrders.filter(o => o.status === 'accepted' || o.status === 'printing').length,
      ready: shopOrders.filter(o => o.status === 'ready').length,
    });
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('printo_storage_update', handleUpdate);
    return () => window.removeEventListener('printo_storage_update', handleUpdate);
  }, []);

  const handleToggleAccepting = () => {
    if (!shop) return;
    const updated = { ...shop, accepting_orders: !isAccepting };
    updateShop(updated);
    setIsAccepting(!isAccepting);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems: { id: 'incoming' | 'active' | 'ready' | 'history' | 'pricing' | 'settings'; label: string; count?: number }[] = [
    { id: 'incoming', label: 'Incoming', count: counts.incoming },
    { id: 'active', label: 'Laser Queue', count: counts.active },
    { id: 'ready', label: 'Pickup Desk', count: counts.ready },
    { id: 'history', label: 'History' },
    { id: 'pricing', label: 'Rate Card' },
    { id: 'settings', label: 'Profile' }
  ];

  return (
    <header className="relative w-full z-40 select-none">
      <div className="flex items-start justify-between px-4 sm:px-8 pt-0">

        {/* Left: Brand Identity on Cream Background */}
        <div className="flex items-center gap-3 pt-3">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white shadow-sm">
            <span className="font-mono text-sm font-bold leading-none text-[#FF5A1F]">⚡</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-sans font-bold text-2xl tracking-[-0.035em] text-black">
              printo
            </span>
            <span className="text-[#FF5A1F] text-xs font-bold leading-none">♥</span>
          </div>
        </div>

        {/* Center: Signature Black Scooped Notch Hanging Down from Top Border */}
        <div className="hidden md:flex items-start">
          {/* Left Concave Fillet */}
          <svg className="w-7 h-[46px] text-black fill-current shrink-0 -mr-px block" viewBox="0 0 28 46" preserveAspectRatio="none">
            <path d="M 0,0 C 14,0 14,46 28,46 L 28,0 Z" />
          </svg>

          {/* Central Black Tab Housing Nav Items */}
          <nav className="h-[46px] bg-black flex items-center px-5 gap-6 text-white text-xs font-sans">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab?.(item.id)}
                  className={`relative py-1 flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-white/70 hover:text-white font-medium'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="bg-[#FF5A1F] text-white text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                      {item.count}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF5A1F]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Concave Fillet */}
          <svg className="w-7 h-[46px] text-black fill-current shrink-0 -ml-px block" viewBox="0 0 28 46" preserveAspectRatio="none">
            <path d="M 0,46 C 14,46 14,0 28,0 L 0,0 Z" />
          </svg>
        </div>

        {/* Right Controls: Outlined Pill Button + Bell + Station Toggle */}
        <div className="flex items-center gap-3 pt-3">
          
          {/* Accepting Orders Status Pill */}
          <button
            onClick={handleToggleAccepting}
            className={`hidden sm:flex items-center gap-2 h-8 px-3.5 rounded-full font-mono text-[11px] font-bold transition-all border ${
              isAccepting
                ? 'bg-emerald-50 text-emerald-900 border-black hover:bg-emerald-100'
                : 'bg-white text-slate-500 border-black/40 hover:bg-slate-100'
            }`}
            title="Toggle accepting student jobs"
          >
            <span className={`w-2 h-2 rounded-full ${isAccepting ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isAccepting ? 'LASER LIVE' : 'PAUSED'}</span>
          </button>

          {/* Outlined "Student App" Pill Button (matches "Join Us" from reference image) */}
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-5 rounded-full border border-black text-black font-sans font-medium text-xs bg-white/70 hover:bg-black hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>Student App</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-1.5 rounded-full text-black hover:bg-black/5 transition-colors focus:outline-none"
              aria-label="Queue Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FF5A1F] text-[9px] font-bold text-white shadow-sm ring-1 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-black p-4 z-50 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-[#EEF0F2]">
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-normal text-base text-black">Queue Alerts</h4>
                    <span className="bg-[#FFE1D3] text-[#D9430F] text-[11px] font-mono px-2 py-0.5 rounded-full font-bold">
                      {unreadCount} new
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsRead(user.id)}
                      className="text-[11px] font-sans text-[#FF5A1F] hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="mt-2 max-h-80 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-[#8B9098] text-xs font-mono">
                      No active queue alerts.
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markNotificationRead(notif.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          notif.is_read
                            ? 'bg-slate-50 border-slate-200 opacity-70'
                            : 'bg-[#FFF2EB] border-[#FFC2A8] hover:bg-[#FFE1D3]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-sans font-medium text-xs text-black">{notif.title}</p>
                          <span className="text-[10px] font-mono text-[#8B9098]">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-[#2A2E35] mt-1 leading-relaxed font-sans">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Shop Owner Profile Pill */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 p-1 rounded-full border border-black/30 hover:border-black bg-white transition-all"
            title="Operator Account"
          >
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
              alt={user.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          </button>

        </div>

      </div>

      {/* Mobile Secondary Tab Bar (when scooped notch hidden on small phones) */}
      <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 mt-2 border-b border-black/10 scrollbar-none">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab?.(item.id)}
              className={`h-7 px-3 rounded-full text-xs font-mono whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-black text-white'
                  : 'bg-white border border-black/30 text-black'
              }`}
            >
              {item.label} {item.count ? `(${item.count})` : ''}
            </button>
          );
        })}
      </div>
    </header>
  );
};
