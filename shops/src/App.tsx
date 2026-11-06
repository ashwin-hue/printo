import React, { useState, useEffect } from 'react';
import { ShopNavbar } from './components/ShopNavbar';
import { ShopOwnerDashboard } from './components/ShopOwnerDashboard';
import { AuthModal } from './components/AuthModal';
import { ShopFooter } from './components/ShopFooter';
import { initStorage, getCurrentUser, switchRole } from './services/storage';

export function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'incoming' | 'active' | 'ready' | 'history' | 'pricing' | 'settings'>('incoming');

  useEffect(() => {
    initStorage();
    // Default to shop_owner role for the shop owner portal
    const user = getCurrentUser();
    if (user.role !== 'shop_owner') {
      switchRole('shop_owner');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#B8B5AA] p-2 sm:p-4 md:p-6 lg:p-8 flex flex-col items-center justify-start selection:bg-[#FF5A1F] selection:text-white font-sans antialiased">
      {/* Framed Website Container with Thick Black Border from Reference Image */}
      <div className="w-full max-w-[1560px] border-[10px] sm:border-[12px] md:border-[14px] border-black rounded-[32px] sm:rounded-[44px] md:rounded-[48px] bg-[#EAE6DF] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] flex flex-col min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-3rem)] relative">
        
        {/* Scooped Notch Navbar flush at the very top */}
        <ShopNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        {/* Main Shop Dashboard */}
        <main className="flex-1 bg-[#EAE6DF]">
          <ShopOwnerDashboard
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </main>

        {/* Shop Partner Footer inside the framed window */}
        <ShopFooter />
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}

export default App;

