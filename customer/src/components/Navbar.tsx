import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bell,
  MapPin,
  FileText,
  Clock,
  Store,
  ExternalLink,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import {
  getCurrentUser,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/storage';
import { User, NotificationItem } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onSelectShopForOrder?: (shopId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAuth
}) => {
  const [user, setUser] = useState<User>(getCurrentUser());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const loadData = () => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setNotifications(getNotifications(currentUser.id));
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('printo_storage_update', handleUpdate);
    return () => window.removeEventListener('printo_storage_update', handleUpdate);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { id: 'landing', label: 'Overview' },
    { id: 'shops', label: 'Find Shops' },
    { id: 'order_wizard', label: 'Upload & Print' },
    { id: 'order_tracker', label: 'Track Orders' },
  ];

  return (
    <>
      <header className="relative w-full z-40 select-none">
        <div className="flex items-start justify-between px-4 sm:px-8 pt-0">

          {/* Left: Brand Identity matching reference image */}
          <div className="flex items-center gap-3 pt-3">
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white shadow-sm cursor-pointer" onClick={() => setActiveTab('landing')}>
              <span className="font-mono text-sm font-bold leading-none text-[#FF5A1F]">⚡</span>
            </div>
            <div className="flex items-baseline gap-1.5 cursor-pointer" onClick={() => setActiveTab('landing')}>
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
            <nav className="h-[46px] bg-black flex items-center px-6 gap-6 text-white text-xs font-sans">
              {navItems.map((item) => {
                const isActive = activeTab === item.id || (item.id === 'order_tracker' && activeTab === 'order_history');
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative py-1 flex items-center gap-1.5 transition-colors ${
                      isActive
                        ? 'text-white font-bold'
                        : 'text-white/70 hover:text-white font-medium'
                    }`}
                  >
                    <span>{item.label}</span>
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

          {/* Right Controls: Bell + Profile + Quick Action */}
          <div className="flex items-center gap-3 pt-3">
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="p-1.5 rounded-full text-black hover:bg-black/5 transition-colors focus:outline-none"
                aria-label="Notifications"
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
                      <h4 className="font-serif font-normal text-base text-black">Notifications</h4>
                      <span className="bg-[#FFE1D3] text-[#D9430F] text-[11px] font-mono px-2 py-0.5 rounded-full font-bold">
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
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            if (notif.order_id) {
                              setActiveTab('order_tracker');
                              setShowNotifDropdown(false);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            notif.is_read
                              ? 'bg-slate-50 border-slate-100 opacity-70'
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

            {/* User Avatar / Sign In */}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 h-8 px-2.5 rounded-full border border-black/30 hover:border-black bg-white transition-all"
              title="Account"
            >
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="hidden sm:inline font-sans text-xs font-medium text-black">{user.name.split(' ')[0]}</span>
            </button>

            {/* Quick Action Pill Button */}
            <button
              onClick={() => setActiveTab('order_wizard')}
              className="h-8 px-4 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-mono font-bold text-xs shadow-sm hover:-translate-y-0.5 transition-all flex items-center gap-1.5 border border-black"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

          </div>

        </div>

        {/* Mobile Secondary Tab Bar (when scooped notch hidden on small phones) */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 mt-2 border-b border-black/10 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id || (item.id === 'order_tracker' && activeTab === 'order_history');
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`h-7 px-3 rounded-full text-xs font-mono whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-black text-white'
                    : 'bg-white border border-black/30 text-black'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Sleek Mobile Bottom App Navigation Dock */}
      <nav className="md:hidden fixed bottom-3 inset-x-4 z-40 bg-[#0D1017]/95 backdrop-blur-xl border border-white/10 rounded-full p-1.5 shadow-2xl flex items-center justify-around text-white">
        <button
          onClick={() => setActiveTab('landing')}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-full transition-colors ${
            activeTab === 'landing' ? 'text-[#FF5A1F]' : 'text-[#8B9098] hover:text-white'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span className="text-[9px] font-mono">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('shops')}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-full transition-colors ${
            activeTab === 'shops' ? 'text-[#FF5A1F]' : 'text-[#8B9098] hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span className="text-[9px] font-mono">Shops</span>
        </button>

        <button
          onClick={() => setActiveTab('order_wizard')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/40"
        >
          <FileText className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('order_tracker')}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-full transition-colors ${
            activeTab === 'order_tracker' ? 'text-[#FF5A1F]' : 'text-[#8B9098] hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-[9px] font-mono">Orders</span>
        </button>

        <a
          href="http://localhost:5174"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-0.5 p-2 rounded-full text-[#8B9098] hover:text-white transition-colors"
        >
          <Store className="w-4 h-4" />
          <span className="text-[9px] font-mono">Portal</span>
        </a>
      </nav>
    </>
  );
};
