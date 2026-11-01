import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Camera, 
  Upload, 
  FileText, 
  Sparkles, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  Key, 
  Plus, 
  CheckCircle2, 
  RefreshCw,
  Wand2
} from 'lucide-react';
import { 
  fileToBase64, 
  extractZReportWithGemini,
  parseReceiptWithSmartHeuristic
} from '../services/geminiService';

export const AIScanTab = ({ onOpenSettings }) => {
  const { 
    geminiApiKey, 
    addProduct, 
    products, 
    addOrUpdateZReport, 
    shopProfile, 
    showToast,
    setActiveTab,
    selectedJournalDate,
    setSelectedJournalDate
  } = useApp();

  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'text'
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [rawText, setRawText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [extractedZReport, setExtractedZReport] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSelectedFile(file);
      setScanError(null);
      setExtractedZReport(null);

      const base64Data = await fileToBase64(file);
      setImagePreview(base64Data.fullDataUrl);
    } catch (err) {
      setScanError('Failed to read image: ' + err.message);
    }
  };

  const handleRunScan = async (overrideBase64 = null, overrideMime = null, overrideText = null) => {
    setIsScanning(true);
    setScanError(null);

    try {
      if (!geminiApiKey && !overrideText && !rawText.trim()) {
        throw new Error('Please configure your free Google Gemini API key in Settings to scan receipts.');
      }

      const preferredModel = localStorage.getItem('gemini_preferred_model');
      const modelToUse = (preferredModel === 'auto' || preferredModel === 'gemini-1.5-flash') ? '' : preferredModel;

      let data;
      if (overrideBase64 || imagePreview) {
        const fullStr = overrideBase64 || imagePreview;
        const commaIdx = fullStr.indexOf(',');
        const mime = overrideMime || fullStr.substring(5, commaIdx).split(';')[0];
        const rawB64 = fullStr.substring(commaIdx + 1);

        data = await extractZReportWithGemini({
          apiKey: geminiApiKey,
          imageBase64: rawB64,
          mimeType: mime,
          preferredModel: modelToUse
        });
      } else if (overrideText || rawText.trim()) {
        const textToProcess = overrideText || rawText.trim();
        if (geminiApiKey) {
          try {
            data = await extractZReportWithGemini({
              apiKey: geminiApiKey,
              rawText: textToProcess,
              preferredModel: modelToUse
            });
          } catch (aiErr) {
            console.warn('AI scan failed, falling back to heuristic parser:', aiErr.message);
            data = parseReceiptWithSmartHeuristic(textToProcess);
          }
        } else {
          data = parseReceiptWithSmartHeuristic(textToProcess);
        }
      } else {
        throw new Error('Please select a receipt image or paste text to scan.');
      }

      if (!data.date) {
        data.date = selectedJournalDate;
      }

      setExtractedZReport(data);
      if (data.isFallback) {
        showToast('Extracted with built-in engine. Verify items and totals.');
      } else {
        showToast('Z-Report details extracted successfully');
      }
    } catch (err) {
      console.error(err);
      const isDeprecation = (err.message || '').includes('1.5-flash') || 
                            (err.message || '').includes('not found') || 
                            (err.message || '').includes('not supported');
      if (isDeprecation) {
        setScanError('Google Gemini: The older 1.5-flash model was retired by Google. We automatically use Gemini 2.0 Flash. Click below to parse with the built-in smart engine or test your key in Settings.');
      } else {
        setScanError(err.message || 'Failed to extract Z-Report data.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleSmartFallback = () => {
    // If user's key failed, parse sample or fallback
    const fallbackData = parseReceiptWithSmartHeuristic(rawText || 'Daily Sales Z-Report Total: 19800');
    setExtractedZReport(fallbackData);
    setScanError(null);
    showToast('Extracted with Smart Heuristic parser. Please verify items.');
  };

  const handleUpdateItem = (index, field, value) => {
    if (!extractedZReport) return;
    const updatedItems = [...extractedZReport.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'quantity' || field === 'unitPrice' || field === 'lineTotal' 
        ? parseFloat(value) || 0 
        : value
    };

    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? (parseFloat(value) || 0) : updatedItems[index].quantity;
      const p = field === 'unitPrice' ? (parseFloat(value) || 0) : updatedItems[index].unitPrice;
      updatedItems[index].lineTotal = Math.round(q * p);
    }

    const newGross = updatedItems.reduce((acc, i) => acc + (i.lineTotal || 0), 0);
    const newNet = Math.max(0, newGross - (extractedZReport.discount || 0));

    setExtractedZReport({
      ...extractedZReport,
      items: updatedItems,
      grossSales: newGross,
      netSales: newNet
    });
  };

  const handleRemoveItem = (index) => {
    if (!extractedZReport) return;
    const updatedItems = extractedZReport.items.filter((_, i) => i !== index);
    const newGross = updatedItems.reduce((acc, i) => acc + (i.lineTotal || 0), 0);
    const newNet = Math.max(0, newGross - (extractedZReport.discount || 0));

    setExtractedZReport({
      ...extractedZReport,
      items: updatedItems,
      grossSales: newGross,
      netSales: newNet
    });
  };

  const handleConfirmAndSave = () => {
    if (!extractedZReport || !extractedZReport.items || extractedZReport.items.length === 0) {
      showToast('No items to save.', 'error');
      return;
    }

    const saved = addOrUpdateZReport(extractedZReport);
    setSelectedJournalDate(saved.date);
    setActiveTab('daily_journal');

    setExtractedZReport(null);
    setImagePreview(null);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Mode Selector Pill Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-1 border border-neutral-200/80 dark:border-zinc-800/80 flex shadow-2xs">
        <button
          onClick={() => setScanMode('camera')}
          className={`flex-1 py-1.5 text-xs font-display font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            scanMode === 'camera'
              ? 'bg-gradient-to-r from-rust-700 to-copper-600 text-white shadow-spray-rust'
              : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Camera / Upload
        </button>
        <button
          onClick={() => setScanMode('text')}
          className={`flex-1 py-1.5 text-xs font-display font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            scanMode === 'text'
              ? 'bg-gradient-to-r from-rust-700 to-copper-600 text-white shadow-spray-rust'
              : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Paste Text
        </button>
      </div>

      {/* Free API Key Alert if missing */}
      {!geminiApiKey && (
        <div className="p-3 bg-neutral-100 dark:bg-zinc-850 border border-neutral-200/80 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-xs text-neutral-800 dark:text-zinc-200">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-neutral-500 dark:text-zinc-400 shrink-0" />
            <span className="text-[11px]">Configure free Gemini API key in Settings to scan receipts.</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-3 py-1 bg-neutral-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-full font-display font-bold text-[11px] shrink-0"
          >
            Settings
          </button>
        </div>
      )}

      {/* Camera / Upload Canvas */}
      {scanMode === 'camera' && !extractedZReport && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight">
              Scan End-of-Day Z-Report
            </h3>
            <p className="text-xs text-neutral-600 dark:text-zinc-400 font-sans">
              Extracts daily items, quantities, prices & GST HSN codes
            </p>
          </div>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*,.pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-zinc-800 bg-neutral-950 group">
              <img 
                src={imagePreview} 
                alt="Z-Report" 
                className="w-full max-h-72 object-contain mx-auto"
              />

              {isScanning && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white to-transparent absolute top-0 animate-[bounce_2s_infinite]" />
                  <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                  <span className="font-display font-bold text-xs tracking-tight">Extracting Sales Data...</span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">Reading products, HSN codes & totals</span>
                </div>
              )}

              {!isScanning && (
                <div className="absolute bottom-2 right-2">
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedFile(null);
                    }}
                    className="p-1.5 rounded-lg bg-black/70 text-white hover:bg-black text-xs flex items-center gap-1 backdrop-blur-xs"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 py-1">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-neutral-300 dark:border-zinc-700 hover:border-rust-500/60 dark:hover:border-rust-500/60 bg-neutral-50/50 dark:bg-zinc-850/40 hover:bg-rust-50/30 dark:hover:bg-rust-950/20 transition-all text-center group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rust-700 to-copper-600 text-white flex items-center justify-center mb-2 shadow-spray-rust group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 group-hover:text-rust-600 dark:group-hover:text-rust-400 transition-colors">Camera</span>
                <span className="text-[10px] text-neutral-600 dark:text-zinc-400 mt-0.5">Snap paper bill</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-neutral-300 dark:border-zinc-700 hover:border-neutral-500 dark:hover:border-zinc-500 bg-neutral-50/50 dark:bg-zinc-850/40 transition-all text-center group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-neutral-200 text-neutral-800 dark:bg-zinc-800 dark:text-zinc-200 flex items-center justify-center mb-2 shadow-2xs group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100">Upload File</span>
                <span className="text-[10px] text-neutral-600 dark:text-zinc-400 mt-0.5">Image or PDF</span>
              </button>
            </div>
          )}

          {scanError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-2 text-xs text-red-700 dark:text-red-300">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">{scanError}</div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-2.5 py-1 bg-neutral-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-full font-display font-semibold text-[10px]"
                >
                  Configure Key in Settings
                </button>
                <button
                  type="button"
                  onClick={handleSmartFallback}
                  className="px-2.5 py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded-full font-display font-semibold text-[10px] flex items-center gap-1"
                >
                  <Wand2 className="w-3 h-3" />
                  Parse with Smart Parser
                </button>
              </div>
            </div>
          )}

          {imagePreview && (
            <button
              onClick={() => handleRunScan()}
              disabled={isScanning}
              className="w-full py-3 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs shadow-spray-rust flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Z-Report with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Process Z-Report with AI
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Text Paste Mode */}
      {scanMode === 'text' && !extractedZReport && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
          <div className="text-center space-y-1">
            <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight">
              Paste Closing Report
            </h3>
            <p className="text-xs text-neutral-400 dark:text-zinc-500">
              Paste daily closing text from WhatsApp or billing machine register.
            </p>
          </div>

          <textarea
            rows={7}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="e.g. Daily Closing Date: 2026-11-01, Gross: 19800, Net: 19150, Items: 14x Cotton Shirt HSN 6109 rate 499..."
            className="w-full text-xs font-mono bg-neutral-50 dark:bg-zinc-850 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-3 outline-none focus:border-neutral-500 text-neutral-900 dark:text-zinc-100"
          />

          <button
            onClick={() => handleRunScan(null, null, rawText)}
            disabled={isScanning || !rawText.trim()}
            className="w-full py-3 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs shadow-spray-rust flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Extract Daily Data
          </button>
        </div>
      )}

      {/* Extracted Review Screen */}
      {extractedZReport && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-zinc-800">
            <div>
              <span className="text-[10px] font-display font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mb-1 border border-emerald-200 dark:border-emerald-800/50">
                <CheckCircle2 className="w-3 h-3" /> Extracted by AI
              </span>
              <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Verify Extracted Z-Report
              </h3>
            </div>

            <button
              onClick={() => {
                setExtractedZReport(null);
                setImagePreview(null);
              }}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 dark:bg-zinc-850/60 p-3 rounded-2xl border border-neutral-100 dark:border-zinc-800">
            <div>
              <span className="text-[10px] font-medium text-neutral-400 dark:text-zinc-500 uppercase">Sales Date</span>
              <input
                type="date"
                value={extractedZReport.date}
                onChange={(e) => setExtractedZReport({ ...extractedZReport, date: e.target.value })}
                className="w-full font-display font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs mt-0.5 outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] font-medium text-neutral-400 dark:text-zinc-500 uppercase">Z-Report #</span>
              <input
                type="text"
                value={extractedZReport.reportNumber || 'Z-Report'}
                onChange={(e) => setExtractedZReport({ ...extractedZReport, reportNumber: e.target.value })}
                className="w-full font-display font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs mt-0.5 outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] font-medium text-neutral-400 dark:text-zinc-500 uppercase">Gross Sales ({shopProfile.currency})</span>
              <input
                type="number"
                value={extractedZReport.grossSales}
                onChange={(e) => setExtractedZReport({ ...extractedZReport, grossSales: parseFloat(e.target.value) || 0 })}
                className="w-full font-display font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs mt-0.5 outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] font-medium text-neutral-400 dark:text-zinc-500 uppercase">Net Sales ({shopProfile.currency})</span>
              <input
                type="number"
                value={extractedZReport.netSales}
                onChange={(e) => setExtractedZReport({ ...extractedZReport, netSales: parseFloat(e.target.value) || 0 })}
                className="w-full font-display font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs mt-0.5 outline-none"
              />
            </div>
          </div>

          {/* Itemized List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100">
                Itemized Products ({extractedZReport.items?.length || 0})
              </span>
            </div>

            {extractedZReport.items?.map((item, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-2xl border border-neutral-200/80 dark:border-zinc-800/80 bg-neutral-50/50 dark:bg-zinc-850/40 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                    className="flex-1 font-semibold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="text-neutral-400 hover:text-red-500 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[9px] font-medium text-neutral-400 dark:text-zinc-500">HSN Code</span>
                    <input
                      type="text"
                      value={item.hsnCode || ''}
                      onChange={(e) => handleUpdateItem(idx, 'hsnCode', e.target.value)}
                      className="w-full font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-medium text-neutral-400 dark:text-zinc-500">Rate</span>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateItem(idx, 'unitPrice', e.target.value)}
                      className="w-full font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] font-medium text-neutral-400 dark:text-zinc-500">Qty</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                      className="w-full font-display font-bold text-xs text-center text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-neutral-500 dark:text-zinc-400 border-t border-neutral-100 dark:border-zinc-800">
                  <span>GST: {item.taxRate || 18}%</span>
                  <span className="font-display font-bold text-neutral-900 dark:text-neutral-100">
                    Total: {shopProfile.currency}{item.lineTotal?.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Confirm & Save */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleConfirmAndSave}
              className="w-full py-3 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs shadow-spray-rust flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Confirm & Store in Database
            </button>
            <button
              onClick={() => {
                setExtractedZReport(null);
                setImagePreview(null);
              }}
              className="w-full py-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200 text-xs text-center"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
