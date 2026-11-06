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

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#EEF0F2]/90 backdrop-blur-md border-b border-[#C4C9CF]/60 transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[8.9vw]">
          <div className="flex items-center justify-between h-14 sm:h-16">

            {/* Logo & Brand Identity */}
            <div className="flex items-center gap-8 sm:gap-12">
              <button
                onClick={() => setActiveTab('landing')}
                className="flex items-center gap-2 group text-left focus:outline-none"
              >
                <div className="w-7 h-7 rounded-lg bg-[#FF5A1F] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                  <span className="font-mono text-xs font-bold leading-none">⚡</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-sans font-semibold text-[22px] tracking-[-0.035em] text-[#0F1115]">
                    Printo
                  </span>
                  <span className="font-mono font-medium text-[10px] tracking-wider text-[#FF5A1F] uppercase">
                    student
                  </span>
                </div>
              </button>

              {/* Main Desktop Navigation Links */}
              <nav className="hidden md:flex items-center gap-6 sm:gap-8">
                <button
                  onClick={() => setActiveTab('landing')}
                  className={`font-sans font-medium text-[13px] transition-colors py-1 ${
                    activeTab === 'landing'
                      ? 'text-[#0F1115] border-b-2 border-[#FF5A1F]'
                      : 'text-[#2A2E35] hover:text-[#0F1115]'
                  }`}
                >
                  Overview
                </button>

                <button
                  onClick={() => setActiveTab('shops')}
                  className={`font-sans font-medium text-[13px] transition-colors py-1 flex items-center gap-1 ${
                    activeTab === 'shops'
                      ? 'text-[#0F1115] border-b-2 border-[#FF5A1F]'
                      : 'text-[#2A2E35] hover:text-[#0F1115]'
                  }`}
                >
                  <span>Find Shops</span>
                </button>

                <button
                  onClick={() => setActiveTab('order_wizard')}
                  className={`font-sans font-medium text-[13px] transition-colors py-1 flex items-center gap-1 ${
                    activeTab === 'order_wizard'
                      ? 'text-[#0F1115] border-b-2 border-[#FF5A1F]'
                      : 'text-[#2A2E35] hover:text-[#0F1115]'
                  }`}
                >
                  <span>Upload & Print</span>
                </button>

                <button
                  onClick={() => setActiveTab('order_tracker')}
                  className={`font-sans font-medium text-[13px] transition-colors py-1 flex items-center gap-1 ${
                    activeTab === 'order_tracker' || activeTab === 'order_history'
                      ? 'text-[#0F1115] border-b-2 border-[#FF5A1F]'
                      : 'text-[#2A2E35] hover:text-[#0F1115]'
                  }`}
                >
                  <span>Track Orders</span>
                </button>
              </nav>
            </div>

            {/* Right Controls: Shop Portal Pill + Notifications + Profile */}
            <div className="flex items-center gap-3 sm:gap-4 font-sans text-[12.5px] font-medium">

              {/* Direct Link to Shop Owner Side */}
              <a
                href="http://localhost:5174"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-[#C4C9CF] bg-white/40 hover:bg-white text-[#2A2E35] transition-colors"
                title="Open Shop Owner Portal (runs on port 5174)"
              >
                <Store className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span>Shop Portal</span>
                <ExternalLink className="w-3 h-3 text-[#8B9098]" />
              </a>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="relative p-2 rounded-full text-[#2A2E35] hover:text-[#0F1115] hover:bg-black/5 transition-colors focus:outline-none"
                  aria-label="Notifications"
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
                        <h4 className="font-serif font-normal text-base text-[#0F1115]">Notifications</h4>
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

              {/* User Avatar / Sign In */}
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 h-8 px-2.5 rounded-full border border-[#C4C9CF] bg-white/40 hover:bg-white text-[#0F1115] transition-all"
                title="Account"
              >
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={user.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="hidden sm:inline font-sans text-xs">{user.name.split(' ')[0]}</span>
              </button>

              {/* Quick Action Pill Button */}
              <button
                onClick={() => setActiveTab('order_wizard')}
                className="h-8 px-4 rounded-full bg-[#FF5A1F] hover:bg-[#E84E16] text-white font-sans font-medium text-xs shadow-sm hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

            </div>

          </div>
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
