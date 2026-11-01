import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Camera, 
  BarChart3, 
  Package
} from 'lucide-react';

export const BottomNav = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'daily_journal', label: 'Journal', icon: CalendarDays },
    { id: 'ai_scan', label: 'EOD Scan', icon: Camera, isCenter: true },
    { id: 'monthly_analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'products', label: 'Catalog', icon: Package },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 max-w-md mx-auto px-4 z-40 pointer-events-none">
      <nav className="pointer-events-auto bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl border border-neutral-200/80 dark:border-zinc-800/80 rounded-full px-3 py-1.5 shadow-2xl shadow-rust-950/10 flex items-center justify-between transition-colors">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative -top-2 flex flex-col items-center group focus:outline-none"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-tr from-rust-700 via-rust-600 to-copper-600 text-white shadow-spray-rust scale-105 ring-2 ring-rust-500/30'
                    : 'bg-neutral-900 text-white dark:bg-zinc-800 dark:text-zinc-200 hover:bg-rust-900'
                }`}>
                  <Camera className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className={`text-[9.5px] font-display font-medium tracking-tight mt-0.5 ${
                  isActive ? 'text-rust-600 dark:text-rust-400 font-bold' : 'text-neutral-400 dark:text-zinc-500'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-200 ${
                isActive
                  ? 'text-rust-600 dark:text-rust-400 font-semibold'
                  : 'text-neutral-400 dark:text-zinc-500 hover:text-neutral-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 transition-transform ${
                isActive ? 'scale-110 stroke-[2.4] text-rust-600 dark:text-rust-400' : 'stroke-[1.8]'
              }`} />
              <span className={`text-[9.5px] font-display tracking-tight ${
                isActive ? 'font-bold text-rust-600 dark:text-rust-400' : 'font-medium'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
