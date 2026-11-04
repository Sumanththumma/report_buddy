import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import { MobileFrame } from './components/MobileFrame';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { WelcomeScreen } from './components/WelcomeScreen';
import { DashboardTab } from './components/DashboardTab';
import { DailyJournalTab } from './components/DailyJournalTab';
import { AIScanTab } from './components/AIScanTab';
import { MonthlyAnalyticsTab } from './components/MonthlyAnalyticsTab';
import { ProductsTab } from './components/ProductsTab';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { PersonalizationModal } from './components/PersonalizationModal';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MainContent = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { activeTab, toastMessage } = useApp();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab onOpenPersonalization={() => setIsPersonalizationOpen(true)} />;
      case 'daily_journal':
        return <DailyJournalTab />;
      case 'ai_scan':
        return <AIScanTab onOpenSettings={() => setIsSettingsOpen(true)} />;
      case 'monthly_analytics':
        return <MonthlyAnalyticsTab />;
      case 'products':
        return <ProductsTab />;
      default:
        return <DashboardTab onOpenPersonalization={() => setIsPersonalizationOpen(true)} />;
    }
  };

  // Toast Component
  const renderToast = () => (
    toastMessage && (
      <aside 
        aria-label="Notification"
        className="fixed top-14 left-1/2 -translate-x-1/2 max-w-[340px] w-full px-4 z-50 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-200"
      >
        <div className={`p-3 rounded-2xl shadow-xl flex items-center space-x-2.5 text-xs font-semibold ${
          toastMessage.type === 'error'
            ? 'bg-red-600 text-white shadow-red-200'
            : 'bg-neutral-900/95 dark:bg-zinc-800/95 backdrop-blur-md text-white shadow-neutral-950/40'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-200 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toastMessage.text}</span>
        </div>
      </aside>
    )
  );

  // Initial authentication loading state
  if (isAuthLoading) {
    return (
      <MobileFrame>
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 min-h-[60vh]">
          <motion.div 
            animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-12 h-12 rounded-2xl bg-neutral-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-xl"
          >
            <Loader2 className="w-6 h-6 animate-spin" />
          </motion.div>
          <span className="font-display font-medium text-xs text-neutral-400 dark:text-zinc-500">
            Initializing RetailKhata...
          </span>
        </div>
      </MobileFrame>
    );
  }

  // Root of application: When NOT logged in, show Welcome Screen (NOT app demo)
  if (!isAuthenticated) {
    return (
      <MobileFrame>
        <div className="flex-1 flex flex-col justify-center items-center w-full max-w-lg mx-auto px-4 py-8">
          <WelcomeScreen
            onOpenLogin={() => {
              setAuthMode('login');
              setIsAuthOpen(true);
            }}
            onOpenRegister={() => {
              setAuthMode('register');
              setIsAuthOpen(true);
            }}
          />
        </div>

        {/* Authentication Modal with Spring Motion */}
        <AuthModal 
          isOpen={isAuthOpen} 
          initialMode={authMode}
          onClose={() => setIsAuthOpen(false)} 
        />

        {renderToast()}
      </MobileFrame>
    );
  }

  // When Authenticated: Active Private Store App
  return (
    <MobileFrame>
      {/* Top Mobile Header */}
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenPersonalization={() => setIsPersonalizationOpen(true)}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-3 sm:py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Mobile Navigation Bar */}
      <BottomNav />

      {/* Store Personalization & Branding Modal */}
      <PersonalizationModal
        isOpen={isPersonalizationOpen}
        onClose={() => setIsPersonalizationOpen(false)}
      />

      {/* Global Settings & Free AI Key Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* Authentication Modal for account switching */}
      <AuthModal 
        isOpen={isAuthOpen} 
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)} 
      />

      {renderToast()}
    </MobileFrame>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppProvider>
          <MainContent />
        </AppProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
