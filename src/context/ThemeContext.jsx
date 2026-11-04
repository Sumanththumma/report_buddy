import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { 
  Store, 
  ShoppingBag, 
  Shirt, 
  Smartphone, 
  Apple, 
  Wrench, 
  Coffee, 
  Sparkles,
  Zap,
  Flame
} from 'lucide-react';

const ThemeContext = createContext();

export const THEME_PALETTES = {
  rust: {
    id: 'rust',
    name: 'Warm Rust & Terracotta',
    primary: '#c2410c',
    primaryDark: '#ea580c',
    accent: 'bg-rust-600 text-white dark:bg-rust-500 dark:text-zinc-950 shadow-spray-rust',
    accentText: 'text-rust-600 dark:text-rust-400',
    badge: 'bg-rust-500/10 text-rust-700 dark:text-rust-300 border-rust-500/25',
    border: 'border-rust-600/30 dark:border-rust-500/25',
    gradient: 'from-rust-950 via-zinc-900 to-black dark:from-rust-950/90 dark:via-zinc-900 dark:to-black',
    glow: 'shadow-spray-rust'
  },
  zinc: {
    id: 'zinc',
    name: 'Space Graphite',
    primary: '#18181b',
    primaryDark: '#fafafa',
    accent: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
    accentText: 'text-zinc-900 dark:text-zinc-100',
    badge: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
    border: 'border-zinc-200 dark:border-zinc-800',
    gradient: 'from-zinc-900 via-zinc-850 to-neutral-900 dark:from-zinc-900 dark:via-zinc-925 dark:to-black',
    glow: 'shadow-zinc-500/10'
  },
  emerald: {
    id: 'emerald',
    name: 'Alpine Emerald',
    primary: '#059669',
    primaryDark: '#34d399',
    accent: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    gradient: 'from-emerald-900 via-zinc-900 to-neutral-950 dark:from-emerald-950/80 dark:via-zinc-900 dark:to-black',
    glow: 'shadow-emerald-500/10'
  },
  blue: {
    id: 'blue',
    name: 'Cupertino Blue',
    primary: '#2563eb',
    primaryDark: '#60a5fa',
    accent: 'bg-blue-600 text-white dark:bg-blue-500 dark:text-blue-950',
    accentText: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
    border: 'border-blue-200 dark:border-blue-800/40',
    gradient: 'from-blue-950 via-zinc-900 to-neutral-950 dark:from-blue-950/80 dark:via-zinc-900 dark:to-black',
    glow: 'shadow-blue-500/10'
  },
  amber: {
    id: 'amber',
    name: 'Warm Copper',
    primary: '#d97706',
    primaryDark: '#fbbf24',
    accent: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-amber-950',
    accentText: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
    border: 'border-amber-200 dark:border-amber-800/40',
    gradient: 'from-amber-950 via-zinc-900 to-neutral-950 dark:from-amber-950/80 dark:via-zinc-900 dark:to-black',
    glow: 'shadow-amber-500/10'
  }
};

export const STORE_ICONS = {
  Store: { label: 'Store', icon: Store },
  ShoppingBag: { label: 'Boutique', icon: ShoppingBag },
  Shirt: { label: 'Apparel', icon: Shirt },
  Smartphone: { label: 'Electronics', icon: Smartphone },
  Apple: { label: 'Grocery', icon: Apple },
  Wrench: { label: 'Hardware', icon: Wrench },
  Coffee: { label: 'Cafe', icon: Coffee },
  Flame: { label: 'Studio', icon: Flame },
  Zap: { label: 'Retail', icon: Zap }
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();

  // Dark Mode State with local storage persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('retail_dark_mode');
    return saved !== null ? saved === 'true' : true; // Default to dark for MacBook aesthetic
  });

  useEffect(() => {
    localStorage.setItem('retail_dark_mode', isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const themeId = user?.theme_color && THEME_PALETTES[user.theme_color] ? user.theme_color : 'rust';
  const logoKey = user?.logo_icon || 'Store';

  const theme = useMemo(() => {
    return THEME_PALETTES[themeId] || THEME_PALETTES.rust;
  }, [themeId]);

  const IconComponent = useMemo(() => {
    const found = STORE_ICONS[logoKey];
    return found ? found.icon : Store;
  }, [logoKey]);

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      toggleDarkMode, 
      theme, 
      themeId, 
      logoKey, 
      IconComponent, 
      STORE_ICONS, 
      THEME_PALETTES 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
