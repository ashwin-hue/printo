import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bell,
  Store,
  ExternalLink,
  ShieldCheck,
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
  activeTab?: string;
  setActiveTab?: (tab: 'incoming' | 'active' | 'ready' | 'history' | 'pricing' | 'settings') => void;
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
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-800 via-indigo-700 to-slate-900 flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-2xl tracking-tight text-slate-900">
                    Printo
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-brand-900 text-brand-100 uppercase">
                    Partner
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 tracking-tight hidden sm:block">
                  Shop Owner Console & Live Dispatch
                </p>
              </div>
            </div>

            {/* Current Shop Name Pill */}
            {shop && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-700">
                <Printer className="w-3.5 h-3.5 text-brand-700" />
                <span className="truncate max-w-[220px]">{shop.shop_name}</span>
              </div>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 sm:gap-4">

            {/* Accepting Orders Quick Toggle */}
            <button
              onClick={handleToggleAccepting}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm border ${
                isAccepting
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
              title="Toggle accepting new customer orders"
            >
              <span className={`w-2 h-2 rounded-full ${isAccepting ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="hidden sm:inline">
                {isAccepting ? 'Accepting Orders' : 'Store Paused'}
              </span>
              <Power className="w-3.5 h-3.5 ml-0.5 opacity-70" />
            </button>

            {/* Direct Link to Customer Side */}
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 transition-colors"
              title="Open Customer Portal (runs on port 5173)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
              <span className="hidden sm:inline">Customer App</span>
            </a>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
                aria-label="Shop Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white shadow-2xl border border-slate-200/80 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-sm text-slate-900">Queue Alerts</h4>
                      <span className="bg-brand-50 text-brand-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                        {unreadCount} new
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllNotificationsRead(user.id)}
                        className="text-[11px] text-brand-700 hover:underline font-semibold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="mt-2 max-h-80 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No alerts at this moment.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                            notif.is_read
                              ? 'bg-slate-50/50 border-slate-100 opacity-75'
                              : 'bg-brand-50/50 border-brand-100 hover:bg-brand-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-xs text-slate-900">{notif.title}</p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
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
              className="flex items-center gap-2 p-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white shadow-sm transition-all text-left"
              title="Shop Owner Profile"
            >
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
              />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};

