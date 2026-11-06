import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bell,
  MapPin,
  FileText,
  Clock,
  Store,
  ExternalLink
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
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Logo & Brand Identity */}
            <div className="flex items-center gap-8">
              <button
                onClick={() => setActiveTab('landing')}
                className="flex items-center gap-3 group text-left focus:outline-none"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-700/25 group-hover:scale-105 transition-transform duration-300">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-black text-2xl tracking-tight text-slate-900">
                      Printo
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-brand-50 text-brand-700 border border-brand-200/60 uppercase">
                      Customer
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 tracking-tight hidden sm:block">
                    Print Without Waiting
                  </p>
                </div>
              </button>

              {/* Main Desktop Navigation Links */}
              <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70">
                <button
                  onClick={() => setActiveTab('landing')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'landing'
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  Overview
                </button>

                <button
                  onClick={() => setActiveTab('shops')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'shops'
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  Find Shops
                </button>

                <button
                  onClick={() => setActiveTab('order_wizard')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'order_wizard'
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Upload & Print
                </button>

                <button
                  onClick={() => setActiveTab('order_tracker')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    activeTab === 'order_tracker' || activeTab === 'order_history'
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Track Orders
                </button>
              </nav>
            </div>

            {/* Right Controls: Direct Shop Portal Link + Notifications + Profile */}
            <div className="flex items-center gap-2.5 sm:gap-3">

              {/* Direct Link to Shop Owner Side */}
              <a
                href="http://localhost:5174"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                title="Open Shop Owner Portal (runs on port 5174)"
              >
                <Store className="w-3.5 h-3.5 text-brand-600" />
                <span>Shop Portal</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="relative p-2.5 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
                  aria-label="Notifications"
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
                        <h4 className="font-display font-bold text-sm text-slate-900">Notifications</h4>
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

              {/* User Avatar */}
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 p-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white shadow-sm transition-all text-left"
                title="Customer Account"
              >
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                />
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* Sleek Mobile Bottom App Navigation Dock */}
      <nav className="md:hidden fixed bottom-3 inset-x-4 z-40 bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-2 shadow-2xl flex items-center justify-around text-white">
        <button
          onClick={() => setActiveTab('landing')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors ${
            activeTab === 'landing' ? 'text-brand-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Printer className="w-5 h-5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button
          onClick={() => setActiveTab('shops')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors ${
            activeTab === 'shops' ? 'text-brand-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] font-bold">Shops</span>
        </button>

        <button
          onClick={() => setActiveTab('order_wizard')}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/40 -mt-5"
        >
          <FileText className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('order_tracker')}
          className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-colors ${
            activeTab === 'order_tracker' ? 'text-brand-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-bold">Orders</span>
        </button>

        <a
          href="http://localhost:5174"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 p-2 rounded-2xl text-slate-400 hover:text-white transition-colors"
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] font-bold">Shop App</span>
        </a>
      </nav>
    </>
  );
};

