import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProblemSolutionSection } from './components/ProblemSolutionSection';
import { InteractiveCostCalculator } from './components/InteractiveCostCalculator';
import { HowItWorksSection, FeaturesSection, BenefitsSection, FAQSection } from './components/LandingPageComponents';
import { ShopDiscovery } from './components/ShopDiscovery';
import { OrderWizard } from './components/OrderWizard';
import { OrderTracker } from './components/OrderTracker';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { initStorage } from './services/storage';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('landing');
  const [selectedShopForOrder, setSelectedShopForOrder] = useState<string>('shop-1');
  const [highlightOrderId, setHighlightOrderId] = useState<string | undefined>(undefined);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    initStorage();
  }, []);

  const handleSelectShop = (shopId: string) => {
    setSelectedShopForOrder(shopId);
    setActiveTab('order_wizard');
  };

  const handleOrderSubmitted = (orderId: string) => {
    setHighlightOrderId(orderId);
    setActiveTab('order_tracker');
  };

  const handleRegisterShop = () => {
    // Open Shop Portal in new tab or navigate to shops app
    window.open('http://localhost:5174', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#B8B5AA] p-2 sm:p-4 md:p-6 lg:p-8 flex flex-col items-center justify-start selection:bg-[#FF5A1F] selection:text-white font-sans antialiased">
      {/* Framed Website Container with Thick Black Border from Reference Image */}
      <div className="w-full max-w-[1560px] border-[10px] sm:border-[12px] md:border-[14px] border-black rounded-[32px] sm:rounded-[44px] md:rounded-[48px] bg-[#EEF0F2] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] flex flex-col min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-3rem)] relative">
        
        {/* Scooped Notch Navbar flush at the very top */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAuth={() => setIsAuthOpen(true)}
          onSelectShopForOrder={handleSelectShop}
        />

        {/* Main View Router */}
        <main className="flex-1">
          {activeTab === 'landing' && (
            <div className="space-y-0">
              <HeroSection
                onFindShop={() => setActiveTab('shops')}
                onRegisterShop={handleRegisterShop}
                onQuickUpload={() => setActiveTab('order_wizard')}
              />
              <ProblemSolutionSection />
              <InteractiveCostCalculator
                onStartOrder={() => setActiveTab('order_wizard')}
              />
              <HowItWorksSection
                onStartOrder={() => setActiveTab('order_wizard')}
              />
              <FeaturesSection />
              <BenefitsSection />
              <FAQSection />
            </div>
          )}

          {activeTab === 'shops' && (
            <ShopDiscovery
              onSelectShop={handleSelectShop}
            />
          )}

          {activeTab === 'order_wizard' && (
            <OrderWizard
              initialShopId={selectedShopForOrder}
              onOrderCompleted={handleOrderSubmitted}
              onCancel={() => setActiveTab('landing')}
            />
          )}

          {activeTab === 'order_tracker' && (
            <OrderTracker
              highlightOrderId={highlightOrderId}
              onNewOrder={() => setActiveTab('order_wizard')}
              onViewShop={handleSelectShop}
            />
          )}
        </main>

        {/* Global Footer inside the framed window */}
        <Footer onNavigate={(tab) => setActiveTab(tab)} />
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

