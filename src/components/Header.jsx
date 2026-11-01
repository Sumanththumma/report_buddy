import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Sun, 
  Moon, 
  Settings, 
  LogOut, 
  LogIn, 
  SlidersHorizontal, 
  Palette, 
  Key, 
  Store,
  ChevronRight,
  Shield
} from 'lucide-react';

export const Header = ({ onOpenSettings, onOpenAuth, onOpenPersonalization }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDarkMode, toggleDarkMode, theme, IconComponent } = useTheme();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <header className="px-5 py-3.5 sticky top-0 z-40 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-neutral-200/50 dark:border-zinc-800/60 transition-colors">
      <div className="flex items-center justify-between max-w-md mx-auto w-full">
        {/* Left: Minimal Apple-style Brand Identity */}
        <div 
          onClick={onOpenPersonalization}
          className="flex items-center space-x-2.5 cursor-pointer group"
          title="Customize Store Identity"
        >
          <div className="w-8 h-8 rounded-xl bg-rust-500/10 dark:bg-rust-950/50 border border-rust-500/30 dark:border-rust-500/40 flex items-center justify-center text-rust-700 dark:text-rust-300 shadow-2xs group-hover:scale-105 group-hover:shadow-spray-rust transition-all">
            <IconComponent className="w-4 h-4" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-100 group-hover:opacity-80 transition-opacity">
                {user?.shop_name || 'RetailKhata'}
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 dark:text-zinc-400 font-medium tracking-tight">
              {user?.store_category || 'Store Intelligence'}
            </span>
          </div>
        </div>

        {/* Right: Solitary Clean Settings Dropdown Trigger */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-700 dark:text-zinc-300 hover:text-neutral-950 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-850 transition-all border border-neutral-300/80 dark:border-zinc-800"
            aria-label="Settings Menu"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Apple / shadcn Refined Floating Popover Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl p-1.5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
              {/* User Identity Header */}
              {isAuthenticated && (
                <div className="px-3 py-2 border-b border-neutral-100 dark:border-zinc-800/60 mb-1">
                  <p className="font-semibold text-neutral-900 dark:text-zinc-100 truncate">
                    {user.owner_name || 'Store Manager'}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-zinc-400 truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
              )}

              {/* Dark Mode Toggle Item */}
              <button
                type="button"
                onClick={() => {
                  toggleDarkMode();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-neutral-800 dark:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isDarkMode ? (
                    <Moon className="w-3.5 h-3.5 text-rust-300" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span className="font-medium">Dark Appearance</span>
                </div>
                <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                  isDarkMode ? 'bg-rust-600' : 'bg-neutral-300'
                }`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform ${
                    isDarkMode ? 'translate-x-3.5' : 'translate-x-0'
                  }`} />
                </div>
              </button>

              {/* Store Personalization */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenPersonalization();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-800 dark:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Palette className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
                <span className="font-medium">Branding & Appearance</span>
              </button>

              {/* AI Key & System Settings */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-800 dark:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-500 dark:text-zinc-400" />
                <span className="font-medium">Store & AI Settings</span>
              </button>

              {/* Divider */}
              <div className="h-px bg-neutral-100 dark:bg-zinc-800/60 my-1" />

              {/* Auth Item: Sign In or Log Out */}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-900 dark:text-zinc-100 font-semibold hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
                  <span>Sign In / Create Store</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
