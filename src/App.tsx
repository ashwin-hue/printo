import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProblemSolutionSection } from './components/ProblemSolutionSection';
import { InteractiveCostCalculator } from './components/InteractiveCostCalculator';
import { HowItWorksSection, FeaturesSection, BenefitsSection, FAQSection } from './components/LandingPageComponents';
import { ShopDiscovery } from './components/ShopDiscovery';
import { OrderWizard } from './components/OrderWizard';
import { OrderTracker } from './components/OrderTracker';
import { ShopOwnerDashboard } from './components/ShopOwnerDashboard';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { getCurrentUser, initStorage, switchRole } from './services/storage';

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
    switchRole('shop_owner');
    setActiveTab('shop_dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] selection:bg-brand-600 selection:text-white">
      {/* Top Global Navigation Bar */}
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

        {activeTab === 'shop_dashboard' && (
          <ShopOwnerDashboard />
        )}
      </main>

      {/* Global Footer */}
      <Footer onNavigate={(tab) => setActiveTab(tab)} />

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

