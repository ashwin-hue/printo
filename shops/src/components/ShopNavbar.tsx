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
  markAllNotificationsRead
} from '../services/storage';
import { Shop, User, NotificationItem } from '../types';

interface ShopNavbarProps {
  onOpenAuth: () => void;
}

export const ShopNavbar: React.FC<ShopNavbarProps> = ({
  onOpenAuth
}) => {
  const [user, setUser] = useState<User>(getCurrentUser());
  const [shops, setShops] = useState<Shop[]>(getShops());
  const shop = shops.find(s => s.owner_id === user.id) || shops[0];
  const [isAccepting, setIsAccepting] = useState<boolean>(shop?.accepting_orders ?? true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

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

  return (
    <header className="sticky top-0 z-50 bg-[#EEF0F2]/90 backdrop-blur-md border-b border-[#C4C9CF]/60 transition-all duration-300">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw]">
        <div className="flex items-center justify-between h-14 sm:h-16">

          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-6 sm:gap-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0F1115] flex items-center justify-center text-white shadow-sm">
                <span className="font-mono text-xs font-bold leading-none text-[#FF5A1F]">⚡</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-sans font-semibold text-[22px] tracking-[-0.035em] text-[#0F1115]">
                  Printo
                </span>
                <span className="font-mono font-medium text-[10px] tracking-wider text-[#FF5A1F] uppercase bg-[#FFE1D3] px-2 py-0.5 rounded-full">
                  Partner
                </span>
              </div>
            </div>

            {/* Current Shop Name Pill */}
            {shop && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#C4C9CF] text-xs font-mono text-[#2A2E35]">
                <Printer className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span className="truncate max-w-[200px] font-medium">{shop.shop_name}</span>
              </div>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 font-sans text-[12.5px] font-medium">

            {/* Accepting Orders Quick Toggle Pill */}
            <button
              onClick={handleToggleAccepting}
              className={`flex items-center gap-2 h-8 px-3.5 rounded-full font-mono text-xs transition-all border ${
                isAccepting
                  ? 'bg-[#FFE1D3] text-[#D9430F] border-[#FFC2A8] hover:bg-[#FFC2A8]'
                  : 'bg-white text-slate-500 border-[#C4C9CF] hover:bg-slate-100'
              }`}
              title="Toggle accepting new student print jobs"
            >
              <span className={`w-2 h-2 rounded-full ${isAccepting ? 'bg-[#FF5A1F] animate-pulse' : 'bg-slate-400'}`} />
              <span className="hidden sm:inline font-bold">
                {isAccepting ? 'LASER LIVE' : 'STATION PAUSED'}
              </span>
              <Power className="w-3 h-3 ml-0.5 opacity-70" />
            </button>

            {/* Direct Link to Customer Side */}
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-[#C4C9CF] bg-white/40 hover:bg-white text-[#2A2E35] transition-colors"
              title="Open Student Customer App (runs on port 5173)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span className="hidden sm:inline">Student App</span>
            </a>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 rounded-full text-[#2A2E35] hover:text-[#0F1115] hover:bg-black/5 transition-colors focus:outline-none"
                aria-label="Shop Queue Alerts"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FF5A1F] text-[9px] font-bold text-white shadow-sm ring-1 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-[#C4C9CF] p-4 z-50 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EEF0F2]">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif font-normal text-base text-[#0F1115]">Queue Alerts</h4>
                      <span className="bg-[#FFE1D3] text-[#D9430F] text-[11px] font-mono px-2 py-0.5 rounded-full font-medium">
                        {unreadCount} new
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllNotificationsRead(user.id)}
                        className="text-[11px] font-sans text-[#FF5A1F] hover:underline font-medium"
                      >
                        Mark all as read
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
                              ? 'bg-slate-50 border-slate-100 opacity-70'
                              : 'bg-[#FFF2EB] border-[#FFC2A8] hover:bg-[#FFE1D3]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-sans font-medium text-xs text-[#0F1115]">{notif.title}</p>
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

            {/* Shop Owner Avatar */}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 h-8 px-2.5 rounded-full border border-[#C4C9CF] bg-white/40 hover:bg-white text-[#0F1115] transition-all"
              title="Shop Operator Profile"
            >
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="hidden sm:inline font-sans text-xs">{user.name.split(' ')[0]}</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
