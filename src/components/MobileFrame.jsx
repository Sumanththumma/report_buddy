import React, { useState } from 'react';
import { Smartphone, Monitor, Wifi, Battery, Signal } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const MobileFrame = ({ children }) => {
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);
  const { isDarkMode } = useTheme();

  // Current system time for phone top bar
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-zinc-950 flex flex-col items-center justify-center p-0 md:p-6 transition-colors duration-300 selection:bg-rust-700 selection:text-white relative overflow-hidden">
      {/* Subtle sprayed airbrush background ambient glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-rust-600/10 dark:bg-rust-600/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-copper-500/10 dark:bg-copper-600/12 blur-[110px] pointer-events-none" />

      {/* Top Device Switcher Toolbar (Visible on Desktop) */}
      <aside aria-label="View Switcher" className="hidden md:flex items-center space-x-2.5 mb-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-neutral-200/80 dark:border-zinc-800/80 text-xs shadow-md z-30">
        <span className="text-neutral-400 dark:text-zinc-500 font-medium text-[11px]">Display:</span>
        <button
          onClick={() => setIsPhoneFrame(true)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-display font-semibold text-[11px] transition-all ${
            isPhoneFrame 
              ? 'bg-neutral-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-2xs' 
              : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Smartphone className="w-3 h-3 text-rust-500" />
          Mobile Phone
        </button>
        <button
          onClick={() => setIsPhoneFrame(false)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-display font-semibold text-[11px] transition-all ${
            !isPhoneFrame 
              ? 'bg-neutral-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-2xs' 
              : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Monitor className="w-3 h-3 text-rust-500" />
          Full Canvas
        </button>
      </aside>

      {/* Main Container / Apple Titanium Bezel with Rust Airbrush Aura */}
      <div 
        className={`w-full transition-all duration-300 ease-out relative ${
          isPhoneFrame 
            ? 'max-w-[420px] md:rounded-[48px] md:border-[10px] md:border-neutral-900 dark:md:border-zinc-900 md:shadow-[0_25px_80px_-15px_rgba(0,0,0,0.6),0_0_50px_-10px_rgba(194,65,12,0.18)] md:ring-1 md:ring-white/10 overflow-hidden bg-white dark:bg-zinc-950 flex flex-col h-screen md:h-[880px]'
            : 'max-w-3xl bg-white dark:bg-zinc-950 min-h-screen md:min-h-[850px] md:rounded-3xl border border-neutral-200/60 dark:border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col'
        }`}
      >
        {/* Subtle sprayed airbrush grain backdrop layer */}
        <div className="absolute inset-0 spray-grain-overlay z-0 pointer-events-none" />

        {/* Dynamic Island / Status Bar in Phone Frame */}
        {isPhoneFrame && (
          <div className="hidden md:flex items-center justify-between px-7 pt-3.5 pb-2 bg-transparent text-neutral-800 dark:text-zinc-200 text-[11px] font-display font-semibold select-none z-50 relative">
            <span>{currentTime}</span>
            {/* Dynamic Island Pill with faint copper rim */}
            <div className="w-24 h-5 bg-black rounded-full mx-auto ring-1 ring-white/10 shadow-inner" />
            <div className="flex items-center space-x-1.5 text-neutral-600 dark:text-zinc-400">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5 text-rust-500" />
            </div>
          </div>
        )}

        {/* Scrollable Canvas Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col z-10">
          {children}
        </div>
      </div>
    </div>
  );
};
