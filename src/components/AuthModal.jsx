import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { THEME_PALETTES, STORE_ICONS } from '../context/ThemeContext';
import { 
  Store, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Check, 
  ShieldCheck,
  Building,
  PackagePlus,
  ChevronLeft,
  X
} from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, register, isLoading, authError } = useAuth();

  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [regStep, setRegStep] = useState(1); // 1: credentials, 2: individuality & branding
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRegStep(1);
      setFormError(null);
    }
  }, [isOpen, initialMode]);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regData, setRegData] = useState({
    shopName: '',
    ownerName: '',
    storeCategory: 'Electronics & Gadgets',
    tagline: 'Your trusted neighborhood store',
    logoIcon: 'Store',
    themeColor: 'zinc',
    email: '',
    password: '',
    gstin: '',
    currency: '₹',
    seedStarterProducts: true
  });

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await login(loginEmail, loginPassword);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!regData.shopName || !regData.email || !regData.password) {
      setFormError('Please enter Store Name, Email, and Password.');
      return;
    }
    if (regData.password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    setFormError(null);
    setRegStep(2);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      await register(regData);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Registration failed.');
    }
  };

  const categories = [
    { label: 'Electronics & Gadgets', icon: '⚡' },
    { label: 'Apparel & Fashion', icon: '👗' },
    { label: 'Grocery & Supermarket', icon: '🍎' },
    { label: 'Hardware & Electrical', icon: '🔧' },
    { label: 'General Retail', icon: '🛍️' }
  ];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-neutral-200/80 dark:border-zinc-800/80 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rust-700 to-copper-600 text-white flex items-center justify-center shadow-spray-rust">
                <Store className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  {mode === 'login' 
                    ? 'Sign In to Store' 
                    : regStep === 1 
                      ? 'Create Store (1/2)' 
                      : 'Branding & Themes (2/2)'}
                </h2>
                <p className="text-[10px] text-neutral-400 dark:text-zinc-500 font-sans">
                  {mode === 'login' ? 'Private multi-tenant sales database' : 'Set up your retail business profile'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-neutral-100 dark:bg-zinc-850 rounded-2xl text-xs font-display font-semibold">
            <button
              type="button"
              onClick={() => { setMode('login'); setFormError(null); setRegStep(1); }}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                mode === 'login' 
                  ? 'bg-gradient-to-r from-rust-700 to-copper-600 text-white shadow-spray-rust' 
                  : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setFormError(null); }}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                mode === 'register' 
                  ? 'bg-gradient-to-r from-rust-700 to-copper-600 text-white shadow-spray-rust' 
                  : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200'
              }`}
            >
              Create Store
            </button>
          </div>

          {/* Error message */}
          {(formError || authError) && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start space-x-2 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="flex-1">{formError || authError}</span>
            </motion.div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                  Store Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="owner@yourstore.com"
                    className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 pl-8 text-neutral-900 dark:text-zinc-100 outline-none focus:border-neutral-500 font-semibold"
                  />
                  <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 pl-8 text-neutral-900 dark:text-zinc-100 outline-none focus:border-neutral-500 font-semibold"
                  />
                  <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs shadow-spray-rust flex items-center justify-center gap-1.5 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    Sign In to Store
                  </>
                )}
              </motion.button>
            </form>
          )}

          {/* Register Multi-Step Form */}
          {mode === 'register' && (
            regStep === 1 ? (
              /* Step 1: Store Credentials */
              <form onSubmit={handleNextStep} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-0.5">
                    Retail Store Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regData.shopName}
                      onChange={(e) => setRegData({ ...regData, shopName: e.target.value })}
                      placeholder="e.g. Metro Fashion & Lifestyle"
                      className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 pl-8 text-neutral-900 dark:text-zinc-100 outline-none focus:border-neutral-500 font-semibold text-xs"
                    />
                    <Building className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-0.5">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      value={regData.ownerName}
                      onChange={(e) => setRegData({ ...regData, ownerName: e.target.value })}
                      placeholder="e.g. Srivani"
                      className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-neutral-900 dark:text-zinc-100 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-0.5">
                      Currency
                    </label>
                    <select
                      value={regData.currency}
                      onChange={(e) => setRegData({ ...regData, currency: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2 py-1.5 text-neutral-900 dark:text-zinc-100 font-bold outline-none text-xs font-display"
                    >
                      <option value="₹">₹ (INR)</option>
                      <option value="$">$ (USD)</option>
                      <option value="€">€ (EUR)</option>
                      <option value="£">£ (GBP)</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-0.5">
                    Store Email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      placeholder="owner@yourstore.com"
                      className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 pl-8 text-neutral-900 dark:text-zinc-100 outline-none focus:border-neutral-500 font-semibold text-xs"
                    />
                    <Mail className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-0.5">
                    Password (min. 6 characters) *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 pl-8 text-neutral-900 dark:text-zinc-100 outline-none focus:border-neutral-500 font-semibold text-xs"
                    />
                    <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-2.5 mt-2 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs shadow-spray-rust flex items-center justify-center gap-1.5 transition-all"
                >
                  Next: Customize Branding
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </form>
            ) : (
              /* Step 2: Store Individuality & Personalization */
              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                {/* Category selector */}
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    Store Category *
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setRegData({ ...regData, storeCategory: cat.label })}
                        className={`p-2 rounded-xl text-left flex items-center justify-between border transition-all ${
                          regData.storeCategory === cat.label
                            ? 'border-neutral-900 bg-neutral-100 dark:border-zinc-300 dark:bg-zinc-800 font-bold text-neutral-950 dark:text-white'
                            : 'border-neutral-200 dark:border-zinc-800 text-neutral-700 dark:text-zinc-300 hover:bg-neutral-50 dark:hover:bg-zinc-850'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                        {regData.storeCategory === cat.label && (
                          <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white stroke-[2.5]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Color Picker */}
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    Brand Theme
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.values(THEME_PALETTES).map(palette => (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() => setRegData({ ...regData, themeColor: palette.id })}
                        className={`flex flex-col items-center p-1 rounded-xl transition-all ${
                          regData.themeColor === palette.id
                            ? 'ring-2 ring-neutral-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900 scale-105'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div 
                          className="w-7 h-7 rounded-full shadow-xs flex items-center justify-center text-white"
                          style={{ backgroundColor: palette.primary }}
                        >
                          {regData.themeColor === palette.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Store Logo Icon */}
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    Store Icon
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(STORE_ICONS).map(([key, item]) => {
                      const IconComp = item.icon;
                      const isSelected = regData.logoIcon === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setRegData({ ...regData, logoIcon: key })}
                          className={`p-2 rounded-xl border flex flex-col items-center transition-all ${
                            isSelected
                              ? 'border-neutral-900 bg-neutral-100 dark:border-zinc-300 dark:bg-zinc-800 font-bold text-neutral-900 dark:text-white'
                              : 'border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          <span className="text-[8.5px] mt-0.5">{key}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Auto seed starter catalog checkbox */}
                <label className="flex items-center space-x-2.5 p-2.5 rounded-2xl bg-neutral-50 dark:bg-zinc-850 border border-neutral-200 dark:border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regData.seedStarterProducts}
                    onChange={(e) => setRegData({ ...regData, seedStarterProducts: e.target.checked })}
                    className="w-4 h-4 text-neutral-900 rounded accent-neutral-900 dark:accent-zinc-100"
                  />
                  <div className="text-[11px]">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                      <PackagePlus className="w-3.5 h-3.5 text-neutral-600 dark:text-zinc-400" />
                      Pre-load starter products with HSN codes
                    </span>
                    <span className="text-neutral-400 dark:text-zinc-500 block text-[10px]">
                      Seeds 5 industry items tailored to {regData.storeCategory}.
                    </span>
                  </div>
                </label>

                {/* Buttons */}
                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="py-2.5 px-3.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 font-display font-semibold flex items-center gap-1 hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs shadow-spray-rust flex items-center justify-center gap-1.5 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Creating Store...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        Launch My Store
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            )
          )}

          {/* Security badge */}
          <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-400 dark:text-zinc-500 pt-1 border-t border-neutral-100 dark:border-zinc-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Bcrypt auth & isolated multi-tenant SQL database</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
