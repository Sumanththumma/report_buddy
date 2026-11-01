import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTheme, THEME_PALETTES, STORE_ICONS } from '../context/ThemeContext';
import { 
  X, 
  Palette, 
  Store, 
  Check, 
  Tag, 
  Phone, 
  MapPin, 
  Receipt, 
  Sparkles,
  Loader2,
  Building
} from 'lucide-react';

export const PersonalizationModal = ({ isOpen, onClose }) => {
  const { user, updateUserProfile } = useAuth();
  const { showToast } = useApp();
  const { theme } = useTheme();

  const [formData, setFormData] = useState({
    shopName: user?.shop_name || '',
    ownerName: user?.owner_name || '',
    storeCategory: user?.store_category || 'General Retail',
    tagline: user?.tagline || 'Your neighborhood retail shop',
    logoIcon: user?.logo_icon || 'Store',
    themeColor: user?.theme_color || 'zinc',
    phone: user?.phone || '',
    address: user?.address || '',
    receiptFooter: user?.receipt_footer || 'Thank you for shopping with us! Please visit again.',
    currency: user?.currency || '₹',
    gstin: user?.gstin || ''
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile(formData);
      showToast('Store branding & appearance updated');
      onClose();
    } catch (err) {
      showToast('Failed to save branding: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    'General Retail',
    'Apparel & Fashion',
    'Electronics & Gadgets',
    'Grocery & Supermarket',
    'Hardware & Electrical',
    'Pharmacy & Health',
    'Cafe & Bakery'
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-neutral-200/80 dark:border-zinc-800/80 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-zinc-800 text-neutral-800 dark:text-zinc-200 flex items-center justify-center border border-neutral-200 dark:border-zinc-700/60 shadow-2xs">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Store Branding & Appearance
              </h3>
              <p className="text-[10px] text-neutral-600 dark:text-zinc-400">
                Custom icons, identity and typography accents
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Live Preview Card */}
          <div className="p-4 rounded-2xl bg-neutral-900 text-white dark:bg-zinc-800/90 border border-neutral-800 dark:border-zinc-700 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display font-bold bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-xs">
                {formData.storeCategory}
              </span>
              <span className="text-[10px] text-neutral-400 font-display">Live Preview</span>
            </div>
            <h4 className="font-display font-bold text-base tracking-tight">
              {formData.shopName || 'Your Store Name'}
            </h4>
            <p className="text-[11px] text-neutral-400 font-sans">
              "{formData.tagline || 'Store tagline'}"
            </p>
          </div>

          {/* Store Name & Category */}
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-zinc-100 font-display font-bold outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                Category / Industry
              </label>
              <select
                value={formData.storeCategory}
                onChange={(e) => setFormData({ ...formData, storeCategory: e.target.value })}
                className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-zinc-100 outline-none"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Brand Tagline */}
          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
              Store Tagline
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="e.g. Premium Daily Fashion & Living"
              className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-zinc-100 outline-none"
            />
          </div>

          {/* Store Logo Icon Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1.5">
              Store Avatar Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(STORE_ICONS).map(([key, item]) => {
                const IconComponent = item.icon;
                const isSelected = formData.logoIcon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, logoIcon: key })}
                    className={`p-2 rounded-xl border flex flex-col items-center transition-all ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-100 dark:border-zinc-300 dark:bg-zinc-800 text-neutral-900 dark:text-white font-bold'
                        : 'border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[8.5px] mt-0.5">{key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Color Palette */}
          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1.5">
              Brand Accent Tone
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Object.values(THEME_PALETTES).map(palette => (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, themeColor: palette.id })}
                  className={`flex flex-col items-center p-1 rounded-xl transition-all ${
                    formData.themeColor === palette.id
                      ? 'ring-2 ring-neutral-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900 scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div 
                    className="w-7 h-7 rounded-full shadow-2xs flex items-center justify-center text-white"
                    style={{ backgroundColor: palette.primary }}
                  >
                    {formData.themeColor === palette.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Receipt Custom Footer */}
          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
              Custom Receipt Footer Message
            </label>
            <textarea
              rows={2}
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl p-2.5 text-neutral-900 dark:text-zinc-100 outline-none text-xs"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2 flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 font-display font-semibold hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-spray-rust transition-all active:scale-[0.98]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  Save Branding
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
