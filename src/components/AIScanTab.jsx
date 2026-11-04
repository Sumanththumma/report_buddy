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
  Wand2,
  Tag,
  PackagePlus,
  Layers,
  Info,
  Calendar,
  GitMerge
} from 'lucide-react';
import { 
  fileToBase64, 
  extractZReportWithGemini,
  parseReceiptWithSmartHeuristic
} from '../services/geminiService';

const COMMON_CATEGORIES = [
  'Sarees & Fabrics',
  'Blouse Materials',
  'Apparel',
  'Ethnic Wear',
  'Groceries',
  'Electronics',
  'Home & Kitchen',
  'Accessories',
  'Tailoring',
  'General Retail'
];

// Receipt non-product noise filter (headers, footers, tax summaries, payment tenders, etc.)
const RECEIPT_NOISE_TERMS = new Set([
  'subtotal', 'sub total', 'total', 'grand total', 'net total', 'gross total',
  'gross sales', 'net sales', 'net amount', 'total sales', 'total amount',
  'cash', 'upi', 'card', 'change', 'discount', 'gst', 'tax', 'cgst', 'sgst', 'igst',
  'vat', 'round off', 'round', 'balance', 'items', 'item count', 'tender',
  'taxable', 'bill no', 'invoice', 'thank you', 'date', 'time', 'plu',
  'dept', 'department', 'void', 'refund', 'no sale', 'pos', 'register',
  'summary', 'report', 'operator', 'cashier', 'terminal', 'customer', 'item', 'credit', 'debit'
]);

export const isReceiptNoise = (name) => {
  if (!name || typeof name !== 'string') return true;
  const clean = name.trim().toLowerCase();
  if (clean.length < 2) return true;
  if (RECEIPT_NOISE_TERMS.has(clean)) return true;
  return Array.from(RECEIPT_NOISE_TERMS).some(term => {
    const regex = new RegExp(`^${term}$|^${term}\\s+|\\s+${term}$`, 'i');
    return regex.test(clean);
  });
};

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
  const [newProductsConfig, setNewProductsConfig] = useState([]);
  const [highlightEmptyCategories, setHighlightEmptyCategories] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const detectNewProducts = (itemsList) => {
    if (!itemsList || !Array.isArray(itemsList)) return [];
    const existingMap = new Map();
    (products || []).forEach(p => existingMap.set((p.name || '').toLowerCase().trim(), p));
    const discovered = [];
    const seen = new Set();

    itemsList.forEach(item => {
      const name = (item.productName || item.name || '').trim();
      if (!name) return;
      if (isReceiptNoise(name)) return;
      const lower = name.toLowerCase();

      if (!existingMap.has(lower) && !seen.has(lower)) {
        seen.add(lower);
        discovered.push({
          id: `new-prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          originalName: name,
          name: name,
          action: 'new', // 'new' | 'merge'
          mergedIntoProductId: '',
          category: '', // User must enter if action === 'new' and addToCatalog === true
          price: parseFloat(item.unitPrice || item.price) || 0,
          costPrice: Math.round((parseFloat(item.unitPrice || item.price) || 0) * 0.7),
          taxRate: parseFloat(item.taxRate) || 5,
          hsnCode: item.hsnCode || item.hsn || '999999',
          unit: item.unit || 'pcs',
          stock: 50,
          addToCatalog: false // Protection: Unchecked by default so user catalogue is never polluted
        });
      }
    });

    return discovered;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSelectedFile(file);
      setScanError(null);
      setExtractedZReport(null);
      setNewProductsConfig([]);
      setHighlightEmptyCategories(false);

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
          preferredModel: modelToUse,
          catalogProducts: products,
          targetDate: selectedJournalDate
        });
      } else if (overrideText || rawText.trim()) {
        const textToProcess = overrideText || rawText.trim();
        if (geminiApiKey) {
          try {
            data = await extractZReportWithGemini({
              apiKey: geminiApiKey,
              rawText: textToProcess,
              preferredModel: modelToUse,
              catalogProducts: products,
              targetDate: selectedJournalDate
            });
          } catch (aiErr) {
            console.warn('AI scan failed, falling back to heuristic parser:', aiErr.message);
            data = parseReceiptWithSmartHeuristic(textToProcess, products, selectedJournalDate);
          }
        } else {
          data = parseReceiptWithSmartHeuristic(textToProcess, products, selectedJournalDate);
        }
      } else {
        throw new Error('Please select a receipt image or paste text to scan.');
      }

      if (!data.date || selectedJournalDate) {
        data.date = selectedJournalDate || data.date;
      }

      // Holy Grail Principle: For any scanned line items that match existing store products,
      // inherit the authoritative HSN code, GST rate, and unit from the catalog!
      const existingMap = new Map();
      (products || []).forEach(p => existingMap.set((p.name || '').toLowerCase().trim(), p));

      if (Array.isArray(data.items)) {
        data.items = data.items
          .filter(item => {
            const rawName = (item.productName || item.name || '').trim();
            if (!rawName) return false;
            if (isReceiptNoise(rawName)) return false;
            return true;
          })
          .map(item => {
            const key = (item.productName || item.name || '').trim().toLowerCase();
            const match = existingMap.get(key);
            if (match) {
              return {
                ...item,
                productName: match.name,
                hsnCode: match.hsnCode || match.hsn_code || item.hsnCode || '999999',
                taxRate: match.taxRate ?? item.taxRate ?? 5,
                unit: match.unit || item.unit || 'pcs',
                isNewProduct: false
              };
            }
            return { ...item, isNewProduct: true };
          });
      }

      setExtractedZReport(data);
      const discovered = detectNewProducts(data.items);
      setNewProductsConfig(discovered);
      setHighlightEmptyCategories(false);

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
    const fallbackData = parseReceiptWithSmartHeuristic(rawText || 'Daily Sales Z-Report Total: 19800', products, selectedJournalDate);
    
    // Holy Grail Principle: Inherit curated catalog attributes
    const existingMap = new Map();
    (products || []).forEach(p => existingMap.set((p.name || '').toLowerCase().trim(), p));

    if (Array.isArray(fallbackData.items)) {
      fallbackData.items = fallbackData.items
        .filter(item => {
          const rawName = (item.productName || item.name || '').trim();
          if (!rawName) return false;
          if (isReceiptNoise(rawName)) return false;
          return true;
        })
        .map(item => {
          const key = (item.productName || item.name || '').trim().toLowerCase();
          const match = existingMap.get(key);
          if (match) {
            return {
              ...item,
              productName: match.name,
              hsnCode: match.hsnCode || match.hsn_code || item.hsnCode || '999999',
              taxRate: match.taxRate ?? item.taxRate ?? 5,
              unit: match.unit || item.unit || 'pcs',
              isNewProduct: false
            };
          }
          return { ...item, isNewProduct: true };
        });
    }

    setExtractedZReport(fallbackData);
    const discovered = detectNewProducts(fallbackData.items);
    setNewProductsConfig(discovered);
    setScanError(null);
    setHighlightEmptyCategories(false);
    showToast('Extracted with Smart Heuristic parser. Please verify items.');
  };

  const handleAddNewItem = () => {
    if (!extractedZReport) return;
    const newItem = {
      productName: '',
      hsnCode: '999999',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      lineTotal: 0,
      taxRate: 5,
      isNewProduct: true
    };
    const updatedItems = [...(extractedZReport.items || []), newItem];
    setExtractedZReport({
      ...extractedZReport,
      items: updatedItems
    });
    const discovered = detectNewProducts(updatedItems);
    setNewProductsConfig(discovered);
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

    // Update discovered new products if product name changed
    if (field === 'productName') {
      const discovered = detectNewProducts(updatedItems);
      setNewProductsConfig(discovered);
    }
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

    const discovered = detectNewProducts(updatedItems);
    setNewProductsConfig(discovered);
  };

  const handleUpdateNewProductConfig = (index, field, value) => {
    setNewProductsConfig(prev => {
      const next = [...prev];
      const current = next[index];
      const updated = {
        ...current,
        [field]: (field === 'price' || field === 'costPrice' || field === 'stock' || field === 'taxRate')
          ? (parseFloat(value) || 0)
          : value
      };

      // Auto-assign first existing product when switching to merge mode if none selected
      if (field === 'action' && value === 'merge' && !updated.mergedIntoProductId && products.length > 0) {
        updated.mergedIntoProductId = products[0].id;
      }

      // Synchronize the line item in extractedZReport if merged
      const targetId = field === 'mergedIntoProductId' ? value : (updated.action === 'merge' ? updated.mergedIntoProductId : null);
      if (targetId && extractedZReport) {
        const targetProd = products.find(p => p.id === targetId);
        if (targetProd) {
          setExtractedZReport(rep => {
            if (!rep || !rep.items) return rep;
            const syncedItems = rep.items.map(it => {
              const itName = (it.productName || it.name || '').trim().toLowerCase();
              if (itName === current.originalName.toLowerCase()) {
                return {
                  ...it,
                  hsnCode: targetProd.hsnCode || '999999',
                  taxRate: targetProd.taxRate ?? 18,
                  unit: targetProd.unit || it.unit || 'pcs'
                };
              }
              return it;
            });
            return { ...rep, items: syncedItems };
          });
        }
      }

      next[index] = updated;
      return next;
    });
  };

  const handleConfirmAndSave = async () => {
    if (!extractedZReport || !extractedZReport.items || extractedZReport.items.length === 0) {
      showToast('No items to save.', 'error');
      return;
    }

    // Validate that every product marked as 'new' to add to catalog has a non-empty category
    const unCategorized = newProductsConfig.filter(
      p => p.action !== 'merge' && p.addToCatalog && !p.category?.trim()
    );
    if (unCategorized.length > 0) {
      setHighlightEmptyCategories(true);
      showToast(`Please enter a category for "${unCategorized[0].name}"`, 'error');
      return;
    }

    // Validate that every product marked as 'merge' has selected a target catalog product
    const unMerged = newProductsConfig.filter(
      p => p.action === 'merge' && !p.mergedIntoProductId
    );
    if (unMerged.length > 0) {
      showToast(`Please select which catalog product to merge "${unMerged[0].name}" into.`, 'error');
      return;
    }

    // Map merged items to target product's holy grail attributes
    const mergedMap = new Map();
    newProductsConfig.forEach(p => {
      if (p.action === 'merge' && p.mergedIntoProductId) {
        const target = products.find(tp => tp.id === p.mergedIntoProductId);
        if (target) {
          mergedMap.set(p.originalName.toLowerCase().trim(), target);
        }
      }
    });

    const finalItems = extractedZReport.items.map(item => {
      const key = (item.productName || item.name || '').toLowerCase().trim();
      if (mergedMap.has(key)) {
        const target = mergedMap.get(key);
        return {
          ...item,
          productName: target.name,
          hsnCode: target.hsnCode || '999999',
          taxRate: target.taxRate ?? 18,
          unit: target.unit || item.unit || 'pcs'
        };
      }
      return item;
    });

    const targetReportDate = extractedZReport.date || selectedJournalDate || new Date().toISOString().split('T')[0];
    const reportToSave = {
      ...extractedZReport,
      date: targetReportDate,
      items: finalItems
    };

    // Holy Grail: Only genuine new products (action !== 'merge' and addToCatalog === true) are sent to catalog
    const productsToCatalog = newProductsConfig.filter(p => p.action !== 'merge' && p.addToCatalog);
    const saved = await addOrUpdateZReport(reportToSave, productsToCatalog);
    setSelectedJournalDate(saved.date || targetReportDate);
    setActiveTab('daily_journal');

    setExtractedZReport(null);
    setImagePreview(null);
    setSelectedFile(null);
    setNewProductsConfig([]);
    setHighlightEmptyCategories(false);
  };

  // Check how many new products are missing category or merge target
  const unCategorizedCount = newProductsConfig.filter(
    p => p.action !== 'merge' && p.addToCatalog && !p.category?.trim()
  ).length;

  const unMergedCount = newProductsConfig.filter(
    p => p.action === 'merge' && !p.mergedIntoProductId
  ).length;

  const existingCatalogNames = new Set((products || []).map(p => (p.name || '').toLowerCase().trim()));

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Target Sales Date Selector Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-neutral-200/80 dark:border-zinc-800/80 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-rust-50 dark:bg-rust-950/60 border border-rust-200 dark:border-rust-800/60 flex items-center justify-center text-rust-600 dark:text-rust-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-zinc-500 tracking-wider block">
              Z-Report Sales Date
            </span>
            <span className="text-xs font-display font-bold text-neutral-900 dark:text-neutral-100">
              {selectedJournalDate}
            </span>
          </div>
        </div>

        <input
          type="date"
          value={selectedJournalDate}
          onChange={(e) => {
            setSelectedJournalDate(e.target.value);
            if (extractedZReport) {
              setExtractedZReport(prev => ({ ...prev, date: e.target.value }));
            }
          }}
          className="font-display text-xs font-bold bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 px-2.5 py-1.5 rounded-xl outline-none cursor-pointer focus:border-rust-500"
        />
      </div>

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

          {/* 🔔 NEW PRODUCTS DISCOVERED NOTIFICATION & MANUAL CATEGORIZATION */}
          {newProductsConfig.length > 0 && (
            <div className="space-y-3">
              {/* Eye-catching Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rust-50 via-copper-50/60 to-amber-50 dark:from-rust-950/40 dark:via-copper-950/30 dark:to-zinc-900 border border-rust-300/80 dark:border-rust-800/80 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-rust-600 animate-ping" />
                    <span className="font-display font-bold text-xs text-rust-900 dark:text-rust-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
                      {newProductsConfig.length} Unmatched Item{newProductsConfig.length > 1 ? 's' : ''} on Receipt
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    newProductsConfig.filter(p => p.action !== 'merge' && p.addToCatalog).length > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      : 'bg-neutral-100 text-neutral-800 dark:bg-zinc-800 dark:text-zinc-300 border-neutral-300 dark:border-zinc-700'
                  }`}>
                    {newProductsConfig.filter(p => p.action !== 'merge' && p.addToCatalog).length} Selected for Catalog
                  </span>
                </div>
                <p className="text-[11px] text-neutral-700 dark:text-zinc-300 font-sans leading-relaxed">
                  These items are recorded in today's sales report. To protect your catalogue from clutter, receipt items are <strong>not added to your catalogue</strong> by default. Tick <em>"Save to Store Catalog"</em> only for genuine products you want to keep permanently, or merge varieties into your existing products.
                </p>
              </div>

              {/* Cards for each new product */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <PackagePlus className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
                    Review Discovered Products ({newProductsConfig.length})
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-zinc-400">
                    Existing catalog items are never overwritten
                  </span>
                </div>

                {newProductsConfig.map((prod, pIdx) => {
                  const isMerge = prod.action === 'merge';
                  const isMissingCat = highlightEmptyCategories && !isMerge && prod.addToCatalog && !prod.category?.trim();
                  const isMissingMerge = isMerge && !prod.mergedIntoProductId;
                  const selectedTarget = isMerge && prod.mergedIntoProductId ? products.find(p => p.id === prod.mergedIntoProductId) : null;

                  return (
                    <div 
                      key={prod.id || pIdx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isMissingCat || isMissingMerge
                          ? 'border-red-400 dark:border-red-600/80 bg-red-50/40 dark:bg-red-950/20 shadow-xs ring-1 ring-red-400'
                          : 'border-neutral-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-850/70 shadow-2xs'
                      } space-y-3`}
                    >
                      {/* Header: Discovered Name on Receipt */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rust-100 text-rust-800 dark:bg-rust-950/80 dark:text-rust-300 border border-rust-200 dark:border-rust-800">
                              NEW #{pIdx + 1}
                            </span>
                            <span className="text-[10px] font-medium text-neutral-600 dark:text-zinc-400">
                              Receipt Name:
                            </span>
                          </div>
                          <input
                            type="text"
                            value={prod.name}
                            onChange={(e) => handleUpdateNewProductConfig(pIdx, 'name', e.target.value)}
                            className="w-full font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-rust-500"
                          />
                        </div>
                      </div>

                      {/* Action Mode Toggle: Add as New Product vs Merge into Existing */}
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 dark:bg-zinc-800/90 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleUpdateNewProductConfig(pIdx, 'action', 'new')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-all ${
                            !isMerge
                              ? 'bg-white dark:bg-zinc-700 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                              : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
                          Add as New Product
                        </button>

                        <button
                          type="button"
                          disabled={products.length === 0}
                          onClick={() => {
                            if (products.length > 0) {
                              handleUpdateNewProductConfig(pIdx, 'action', 'merge');
                            }
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-all ${
                            isMerge
                              ? 'bg-white dark:bg-zinc-700 text-rust-700 dark:text-rust-300 shadow-2xs'
                              : 'text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200'
                          } ${products.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <GitMerge className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
                          Merge with Existing {products.length > 0 ? `(${products.length})` : ''}
                        </button>
                      </div>

                      {/* MODE 1: MERGE INTO EXISTING CATALOG PRODUCT */}
                      {isMerge && (
                        <div className="p-3 rounded-xl bg-rust-50/60 dark:bg-rust-950/30 border border-rust-200/80 dark:border-rust-800/60 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-rust-900 dark:text-rust-200 flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-rust-600" />
                              Select Existing Product to Merge Into:
                            </label>
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                              ✓ No Duplicate in Catalog
                            </span>
                          </div>

                          <select
                            value={prod.mergedIntoProductId}
                            onChange={(e) => handleUpdateNewProductConfig(pIdx, 'mergedIntoProductId', e.target.value)}
                            className="w-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-rust-300 dark:border-rust-700 rounded-lg px-2.5 py-2 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-rust-500"
                          >
                            <option value="">-- Choose Existing Product from Catalog --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} (HSN: {p.hsnCode || 'N/A'}, GST: {p.taxRate}%, {p.category})
                              </option>
                            ))}
                          </select>

                          {selectedTarget ? (
                            <div className="text-[11px] text-neutral-700 dark:text-zinc-300 bg-white/90 dark:bg-zinc-900/90 p-2.5 rounded-lg border border-rust-200/60 dark:border-rust-800/60 space-y-1">
                              <div className="flex items-center gap-1 font-bold text-rust-800 dark:text-rust-300 text-xs">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Variety Linked to Master:
                              </div>
                              <p className="leading-snug">
                                Receipts for <strong>"{prod.name}"</strong> will be recorded under catalog master <strong>"{selectedTarget.name}"</strong> with verified HSN <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{selectedTarget.hsnCode || 'N/A'}</span> and <span className="font-bold text-neutral-900 dark:text-neutral-100">{selectedTarget.taxRate}% GST</span>.
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-rust-600 dark:text-rust-400 italic">
                              * Select which existing product represents this variety (e.g., color, size, or brand variation).
                            </p>
                          )}
                        </div>
                      )}

                      {/* MODE 2: ADD AS NEW PRODUCT */}
                      {!isMerge && (
                        <>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-neutral-600 dark:text-zinc-400">
                              Define category and inventory for this new catalog item:
                            </span>
                            <label className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-700 dark:text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={prod.addToCatalog}
                                onChange={(e) => handleUpdateNewProductConfig(pIdx, 'addToCatalog', e.target.checked)}
                                className="rounded border-neutral-300 text-rust-600 focus:ring-rust-500"
                              />
                              <span>Save to Store Catalog</span>
                            </label>
                          </div>

                          {prod.addToCatalog && (
                            <div className="space-y-2.5 pt-1 border-t border-neutral-100 dark:border-zinc-800/80">
                              {/* Mandatory Category Input */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-bold text-neutral-800 dark:text-zinc-200 flex items-center gap-1">
                                    <Tag className="w-3 h-3 text-rust-600 dark:text-rust-400" />
                                    Category <span className="text-red-500">*</span>
                                  </span>
                                  {isMissingCat && (
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400">
                                      Category required!
                                    </span>
                                  )}
                                </div>

                                <input
                                  type="text"
                                  value={prod.category}
                                  placeholder="Type category (e.g. Sarees, Fabrics, Groceries, Apparel...)"
                                  onChange={(e) => handleUpdateNewProductConfig(pIdx, 'category', e.target.value)}
                                  className={`w-full font-semibold text-xs rounded-lg px-2.5 py-1.5 outline-none transition-colors ${
                                    isMissingCat
                                      ? 'bg-red-50 dark:bg-red-950/40 border border-red-400 dark:border-red-500 text-neutral-900 dark:text-neutral-100 placeholder-red-400'
                                      : 'bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-neutral-100 focus:border-rust-500'
                                  }`}
                                />

                                {/* Quick Suggestion Chips */}
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  <span className="text-[9px] text-neutral-600 dark:text-zinc-400 self-center mr-1">Quick choose:</span>
                                  {COMMON_CATEGORIES.map(cat => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => handleUpdateNewProductConfig(pIdx, 'category', cat)}
                                      className={`text-[10px] px-2 py-0.5 rounded-full transition-all border ${
                                        prod.category === cat
                                          ? 'bg-rust-700 text-white border-rust-700 shadow-2xs font-semibold'
                                          : 'bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 border-neutral-200 dark:border-zinc-700'
                                      }`}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Inventory & Pricing Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                                <div>
                                  <span className="block text-[9px] font-medium text-neutral-600 dark:text-zinc-400">
                                    Selling Rate ({shopProfile.currency})
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={prod.price}
                                    onChange={(e) => handleUpdateNewProductConfig(pIdx, 'price', e.target.value)}
                                    className="w-full font-display font-bold text-xs bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none focus:border-rust-500"
                                  />
                                </div>

                                <div>
                                  <span className="block text-[9px] font-medium text-neutral-600 dark:text-zinc-400">
                                    Cost Price ({shopProfile.currency})
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={prod.costPrice}
                                    onChange={(e) => handleUpdateNewProductConfig(pIdx, 'costPrice', e.target.value)}
                                    className="w-full font-display font-bold text-xs bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none focus:border-rust-500"
                                  />
                                </div>

                                <div>
                                  <span className="block text-[9px] font-medium text-neutral-600 dark:text-zinc-400">
                                    Unit
                                  </span>
                                  <select
                                    value={prod.unit}
                                    onChange={(e) => handleUpdateNewProductConfig(pIdx, 'unit', e.target.value)}
                                    className="w-full font-display font-medium text-xs bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none focus:border-rust-500 text-neutral-900 dark:text-neutral-100"
                                  >
                                    <option value="pcs">pcs</option>
                                    <option value="mtr">mtr</option>
                                    <option value="kg">kg</option>
                                    <option value="gm">gm</option>
                                    <option value="pkt">pkt</option>
                                    <option value="box">box</option>
                                    <option value="pair">pair</option>
                                    <option value="set">set</option>
                                  </select>
                                </div>

                                <div>
                                  <span className="block text-[9px] font-medium text-neutral-600 dark:text-zinc-400">
                                    Opening Stock
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={prod.stock}
                                    onChange={(e) => handleUpdateNewProductConfig(pIdx, 'stock', e.target.value)}
                                    className="w-full font-display font-bold text-xs bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none focus:border-rust-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Itemized List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 block">
                  Itemized Sales on Report ({extractedZReport.items?.length || 0})
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-zinc-400">
                  Products and HSN codes from cash register bill
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-neutral-800 dark:text-zinc-200 font-display font-semibold text-[11px] flex items-center gap-1 border border-neutral-200/80 dark:border-zinc-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
                Add Item
              </button>
            </div>

            {(!extractedZReport.items || extractedZReport.items.length === 0) ? (
              <div className="p-5 rounded-2xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20 text-center space-y-2.5">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    No itemized products detected on this receipt
                  </p>
                  <p className="text-[11px] text-neutral-600 dark:text-zinc-400 mt-0.5">
                    Click the button below to add the products and HSN codes from this bill.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rust-700 to-copper-600 text-white font-display font-bold text-xs shadow-spray-rust inline-flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Product from Bill
                </button>
              </div>
            ) : (
              extractedZReport.items.map((item, idx) => {
              const itemName = (item.productName || item.name || '').trim().toLowerCase();
              const isExisting = existingCatalogNames.has(itemName);
              const newProdConfig = newProductsConfig.find(p => p.originalName?.toLowerCase() === itemName);

              return (
                <div 
                  key={idx}
                  className="p-3 rounded-2xl border border-neutral-200/80 dark:border-zinc-800/80 bg-neutral-50/50 dark:bg-zinc-850/40 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                        className="w-full font-semibold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs"
                      />
                      <div className="flex items-center gap-1.5">
                        {isExisting ? (
                          <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                            ✓ In Store Catalog
                          </span>
                        ) : newProdConfig?.action === 'merge' ? (
                          <span className="text-[9px] font-bold text-rust-700 dark:text-rust-300 bg-rust-50 dark:bg-rust-950/50 px-2 py-0.5 rounded-md border border-rust-200 dark:border-rust-800/40 flex items-center gap-1">
                            <GitMerge className="w-2.5 h-2.5" />
                            Merged Variety → {products.find(p => p.id === newProdConfig.mergedIntoProductId)?.name || 'Select Product Above'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-rust-700 dark:text-rust-300 bg-rust-50 dark:bg-rust-950/50 px-2 py-0.5 rounded-md border border-rust-200 dark:border-rust-800/40 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            New: {newProdConfig?.category || 'Category Needed'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="text-neutral-400 hover:text-red-500 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[9px] font-medium text-neutral-600 dark:text-zinc-400">HSN Code</span>
                      <input
                        type="text"
                        value={item.hsnCode || ''}
                        onChange={(e) => handleUpdateItem(idx, 'hsnCode', e.target.value)}
                        className="w-full font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] font-medium text-neutral-600 dark:text-zinc-400">Rate</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(idx, 'unitPrice', e.target.value)}
                        className="w-full font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-2 py-1"
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] font-medium text-neutral-600 dark:text-zinc-400">Qty</span>
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
                    <span>GST: {item.taxRate || 5}% ({(item.taxRate || 5) / 2}% + {(item.taxRate || 5) / 2}%)</span>
                    <span className="font-display font-bold text-neutral-900 dark:text-neutral-100">
                      Total: {shopProfile.currency}{item.lineTotal?.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            }))}
          </div>

          {/* Confirm & Save */}
          <div className="space-y-2 pt-2">
            {(unCategorizedCount > 0 || unMergedCount > 0) && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[11px] font-medium">
                  {unCategorizedCount > 0 && (
                    <span>Please enter a <strong>Category</strong> for {unCategorizedCount} new product{unCategorizedCount > 1 ? 's' : ''}. </span>
                  )}
                  {unMergedCount > 0 && (
                    <span>Please choose which existing product to merge {unMergedCount} item{unMergedCount > 1 ? 's' : ''} into.</span>
                  )}
                </span>
              </div>
            )}

            <button
              onClick={handleConfirmAndSave}
              className={`w-full py-3 rounded-full font-display font-bold text-xs shadow-spray-rust flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                (unCategorizedCount > 0 || unMergedCount > 0)
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white'
              }`}
            >
              {(unCategorizedCount > 0 || unMergedCount > 0) ? (
                <>
                  <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                  Complete Product Details to Confirm
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Confirm, Log Z-Report & Add {newProductsConfig.filter(p => p.action !== 'merge' && p.addToCatalog).length} New Products
                </>
              )}
            </button>
            <button
              onClick={() => {
                setExtractedZReport(null);
                setImagePreview(null);
                setNewProductsConfig([]);
                setHighlightEmptyCategories(false);
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
