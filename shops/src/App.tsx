import React, { useState, useEffect } from 'react';
import { ShopNavbar } from './components/ShopNavbar';
import { ShopOwnerDashboard } from './components/ShopOwnerDashboard';
import { AuthModal } from './components/AuthModal';
import { ShopFooter } from './components/ShopFooter';
import { initStorage, getCurrentUser, switchRole } from './services/storage';

export function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    initStorage();
    // Default to shop_owner role for the shop owner portal
    const user = getCurrentUser();
    if (user.role !== 'shop_owner') {
      switchRole('shop_owner');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] selection:bg-brand-600 selection:text-white">
      {/* Shop Owner Global Header */}
      <ShopNavbar
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Shop Dashboard */}
      <main className="flex-1">
        <ShopOwnerDashboard />
      </main>

      {/* Shop Partner Footer */}
      <ShopFooter />

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

