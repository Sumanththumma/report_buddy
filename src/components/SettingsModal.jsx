import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Key, 
  Store, 
  ExternalLink, 
  Check, 
  Sparkles, 
  ShieldCheck,
  Building,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Cpu
} from 'lucide-react';
import { fetchAvailableModels, CANDIDATE_MODELS } from '../services/geminiService';

export const SettingsModal = ({ isOpen, onClose }) => {
  const { 
    geminiApiKey, 
    setGeminiApiKey, 
    shopProfile, 
    setShopProfile, 
    showToast 
  } = useApp();

  const [tempApiKey, setTempApiKey] = useState(geminiApiKey);
  const [profileForm, setProfileForm] = useState({ ...shopProfile });
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('gemini_preferred_model');
    return (saved && saved !== 'gemini-1.5-flash') ? saved : 'auto';
  });

  // Key testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!tempApiKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key to test.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetchAvailableModels(tempApiKey.trim());
      if (res.success && res.models && res.models.length > 0) {
        setTestResult({
          success: true,
          message: `Connected! Available models: ${res.models.slice(0, 3).join(', ')}${res.models.length > 3 ? '...' : ''}`,
          models: res.models
        });
      } else {
        // Fallback test
        const pingRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${tempApiKey.trim()}`);
        if (pingRes.ok) {
          setTestResult({
            success: true,
            message: 'Connected to Google AI Studio successfully!'
          });
        } else {
          const errData = await pingRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${pingRes.status}: Invalid key or permission denied`);
        }
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect. Please verify API key.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setGeminiApiKey(tempApiKey.trim());
    setShopProfile(profileForm);
    localStorage.setItem('gemini_preferred_model', selectedModel);
    showToast('Settings updated successfully');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-neutral-200/80 dark:border-zinc-800/80 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-zinc-800 text-neutral-800 dark:text-zinc-200 flex items-center justify-center border border-neutral-200/80 dark:border-zinc-700/60 shadow-2xs">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Store & AI Settings
              </h3>
              <p className="text-[10px] text-neutral-600 dark:text-zinc-400">
                Configure store profile & Google Gemini LLM
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-zinc-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free LLM API Key Section */}
        <div className="bg-neutral-50 dark:bg-zinc-850/60 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-display font-bold text-neutral-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neutral-700 dark:text-zinc-300" />
              Google Gemini Free API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-display font-semibold text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200 flex items-center gap-0.5"
            >
              Get Free Key <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <div className="relative">
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => {
                setTempApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="Paste Google AI Studio API key..."
              className="w-full text-xs font-mono bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 pl-8 outline-none focus:border-neutral-500 text-neutral-900 dark:text-zinc-100"
            />
            <Key className="w-3.5 h-3.5 text-neutral-500 dark:text-zinc-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Test Key Connection Button & Model Selector */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !tempApiKey.trim()}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-rust-700 to-copper-600 text-white hover:opacity-95 disabled:opacity-50 font-display font-bold text-[11px] flex items-center gap-1.5 shadow-spray-rust transition-all active:scale-[0.98]"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Test Connection
                </>
              )}
            </button>

            {/* Model Selector */}
            <div className="flex items-center space-x-1 shrink-0">
              <Cpu className="w-3 h-3 text-neutral-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-[10px] font-display font-bold bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-neutral-800 dark:text-zinc-200 outline-none"
              >
                <option value="auto">Auto-Detect Model (Recommended)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Free)</option>
                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite (Ultra Fast)</option>
                <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Latest)</option>
                <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div className={`p-2.5 rounded-xl text-[11px] flex items-start gap-1.5 leading-snug ${
              testResult.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-medium' 
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{testResult.message}</span>
            </div>
          )}

          <div className="text-[10px] text-neutral-500 dark:text-zinc-400 leading-relaxed bg-white/70 dark:bg-zinc-800/60 p-2 rounded-xl border border-neutral-100 dark:border-zinc-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>100% Free Tier from Google AI Studio. Seamless model failover.</span>
          </div>
        </div>

        {/* Shop Details */}
        <div className="space-y-2.5 text-xs">
          <span className="block text-[10px] font-display font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">
            Retail Shop Information
          </span>

          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 mb-1">
              Shop Name
            </label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-zinc-100 font-semibold outline-none focus:border-neutral-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={profileForm.gstin || ''}
                onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value })}
                placeholder="29ABCDE1234F1Z5"
                className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-zinc-100 font-mono outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 mb-1">
                Currency Symbol
              </label>
              <select
                value={profileForm.currency}
                onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-zinc-100 font-bold outline-none font-display"
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
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 mb-1">
              Store Address
            </label>
            <input
              type="text"
              value={profileForm.address || ''}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              placeholder="Store address..."
              className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-zinc-100 outline-none"
            />
          </div>
        </div>

        {/* Save and Close */}
        <div className="pt-2 flex space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 font-display font-semibold text-xs hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-spray-rust transition-all active:scale-[0.98]"
          >
            <Check className="w-4 h-4 stroke-[2]" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
