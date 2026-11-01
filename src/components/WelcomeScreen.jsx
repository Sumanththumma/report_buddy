import React from 'react';
import { motion } from 'motion/react';
import { 
  Store, 
  Sparkles, 
  Camera, 
  ShieldCheck, 
  BarChart3, 
  ArrowRight, 
  LogIn, 
  Layers,
  Receipt,
  Sun,
  Moon,
  Flame
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const WelcomeScreen = ({ onOpenLogin, onOpenRegister }) => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Animation variants using motion.dev
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.12,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 24,
        stiffness: 260
      }
    }
  };

  const badgeGlowVariants = {
    animate: {
      scale: [1, 1.04, 1],
      boxShadow: [
        '0 0 0 0 rgba(194, 65, 12, 0)',
        '0 0 35px 4px rgba(194, 65, 12, 0.28)',
        '0 0 0 0 rgba(194, 65, 12, 0)'
      ],
      transition: {
        duration: 3.8,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden bg-white dark:bg-zinc-950 transition-colors duration-300">
      {/* Sprayed airbrush ambient glow spots */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.18, 0.32, 0.18],
          x: [0, 8, 0],
          y: [0, -10, 0]
        }}
        transition={{ 
          duration: 7, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
        className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-rust-600/25 dark:bg-rust-600/30 blur-3xl pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1.15, 1, 1.15],
          opacity: [0.12, 0.24, 0.12],
          x: [0, -10, 0],
          y: [0, 8, 0]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
        className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-copper-500/20 dark:bg-copper-600/25 blur-3xl pointer-events-none" 
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-600/5 blur-[90px] pointer-events-none" />

      {/* Top Bar: Quiet Dark Mode & Security Tag */}
      <div className="flex items-center justify-between z-10 pt-1">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rust-50 dark:bg-rust-950/40 border border-rust-200/80 dark:border-rust-800/60 text-[10px] font-display font-semibold text-rust-800 dark:text-rust-300 shadow-2xs"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rust-500 animate-pulse-subtle" />
          <ShieldCheck className="w-3 h-3 text-rust-600 dark:text-rust-400" />
          <span>Private SQL Database</span>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          onClick={toggleDarkMode}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100 hover:border-rust-400/40 transition-colors"
          title="Toggle Appearance"
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5 text-rust-300" /> : <Moon className="w-3.5 h-3.5 text-rust-700" />}
        </motion.button>
      </div>

      {/* Main Content Area */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="my-auto py-6 space-y-6 z-10"
      >
        {/* Animated App Icon & Badge with Sprayed Rust Aura */}
        <motion.div variants={itemVariants} className="text-center space-y-3">
          <motion.div 
            variants={badgeGlowVariants}
            animate="animate"
            className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white dark:from-zinc-900 dark:to-zinc-950 flex items-center justify-center shadow-2xl border border-rust-500/30 relative"
          >
            {/* Subtle rust corner spray highlight */}
            <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-rust-500/40 blur-xs pointer-events-none" />
            <Store className="w-8 h-8 stroke-[1.8] text-rust-400" />
          </motion.div>

          <div className="space-y-1.5">
            <motion.span 
              variants={itemVariants}
              className="inline-block px-3 py-0.5 rounded-full bg-rust-500/10 dark:bg-rust-950/50 border border-rust-500/25 text-[11px] font-display font-semibold tracking-wide uppercase text-rust-700 dark:text-rust-300"
            >
              Retail Intelligence & POS Ledger
            </motion.span>
            
            <motion.h1 
              variants={itemVariants}
              className="font-display font-black text-3xl tracking-tight text-neutral-900 dark:text-white"
            >
              RetailKhata
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="font-sans text-xs text-neutral-500 dark:text-zinc-400 max-w-[280px] mx-auto leading-relaxed"
            >
              Mobile-first daily sales logging, End-of-Day Z-Report scanning with free Gemini AI, and automated GST tax summaries.
            </motion.p>
          </div>
        </motion.div>

        {/* Feature Cards Grid with Sprayed Highlights */}
        <motion.div variants={itemVariants} className="space-y-2.5 pt-1">
          <motion.div 
            whileHover={{ scale: 1.015 }}
            className="p-3 rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-neutral-200/80 dark:border-zinc-800/80 hover:border-rust-500/30 dark:hover:border-rust-500/30 flex items-center space-x-3 transition-all shadow-2xs"
          >
            <div className="w-8 h-8 rounded-xl bg-rust-500/10 dark:bg-rust-950/60 text-rust-600 dark:text-rust-400 border border-rust-500/20 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100">
                AI Z-Report Scanner
              </h2>
              <p className="text-[10px] text-neutral-600 dark:text-zinc-400 truncate">
                Snap paper closing slip to extract products & totals
              </p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.015 }}
            className="p-3 rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-neutral-200/80 dark:border-zinc-800/80 hover:border-copper-500/30 dark:hover:border-copper-500/30 flex items-center space-x-3 transition-all shadow-2xs"
          >
            <div className="w-8 h-8 rounded-xl bg-copper-500/10 dark:bg-copper-950/60 text-copper-600 dark:text-copper-400 border border-copper-500/20 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100">
                HSN & GST Classification
              </h2>
              <p className="text-[10px] text-neutral-600 dark:text-zinc-400 truncate">
                Auto-assigned 4 to 8 digit codes for GSTR-1 filings
              </p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.015 }}
            className="p-3 rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-neutral-200/80 dark:border-zinc-800/80 hover:border-rust-500/30 dark:hover:border-rust-500/30 flex items-center space-x-3 transition-all shadow-2xs"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100">
                Monthly Analytics & CSV
              </h2>
              <p className="text-[10px] text-neutral-600 dark:text-zinc-400 truncate">
                Daily sales charts, top sellers, and tax export
              </p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Bottom CTA Action Buttons with Warm Sprayed Rust CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="space-y-2.5 z-10 pt-2"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenRegister}
          className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs shadow-spray-rust flex items-center justify-center gap-2 group transition-all"
        >
          <span>Create New Store</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenLogin}
          className="w-full py-3 px-5 rounded-full bg-neutral-100 dark:bg-zinc-900 hover:bg-neutral-200/70 dark:hover:bg-zinc-850 text-neutral-800 dark:text-zinc-200 font-display font-semibold text-xs border border-neutral-200/80 dark:border-zinc-800 hover:border-rust-500/30 flex items-center justify-center gap-1.5 transition-all"
        >
          <LogIn className="w-3.5 h-3.5 text-rust-500" />
          <span>Sign In to Existing Store</span>
        </motion.button>

        <p className="text-[10px] text-center text-neutral-600 dark:text-zinc-400 font-sans pt-1">
          Each store gets an isolated database with encrypted auth.
        </p>
      </motion.div>
    </div>
  );
};
