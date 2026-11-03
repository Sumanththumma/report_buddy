import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { productsApi, zReportsApi, backupApi } from '../services/api';

const AppContext = createContext();

// Authoritative holy grail catalog: Never pre-populate demo electronics into real user shops
const DEMO_PRODUCT_IDS = new Set(['prod-1', 'prod-2', 'prod-3', 'prod-4']);
const DEMO_PRODUCT_NAMES = new Set([
  'cotton polo t-shirt',
  'wireless bluetooth earbuds',
  'usb-c braided fast cable 65w',
  'wireless optical mouse'
]);

const sanitizeProducts = (list) => {
  if (!Array.isArray(list)) return [];
  return list.filter(p => {
    if (!p || !p.name) return false;
    if (DEMO_PRODUCT_IDS.has(p.id)) return false;
    if (DEMO_PRODUCT_NAMES.has(p.name.trim().toLowerCase())) return false;
    return true;
  });
};

const sanitizeZReports = (list) => {
  if (!Array.isArray(list)) return [];
  return list.filter(r => {
    if (!r || !r.date) return false;
    if (r.id === 'z-2026-11-01' && r.reportNumber === 'Z-0048') return false;
    return true;
  });
};

const FALLBACK_PRODUCTS = [];
const FALLBACK_Z_REPORTS = [];

export const AppProvider = ({ children }) => {
  const { user, isAuthenticated, updateUserProfile } = useAuth();

  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('retail_products');
      if (saved) {
        const clean = sanitizeProducts(JSON.parse(saved));
        localStorage.setItem('retail_products', JSON.stringify(clean));
        return clean;
      }
    } catch {}
    return FALLBACK_PRODUCTS;
  });

  const [zReports, setZReports] = useState(() => {
    try {
      const saved = localStorage.getItem('retail_z_reports');
      if (saved) {
        const clean = sanitizeZReports(JSON.parse(saved));
        localStorage.setItem('retail_z_reports', JSON.stringify(clean));
        return clean;
      }
    } catch {}
    return FALLBACK_Z_REPORTS;
  });

  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return user?.gemini_api_key || localStorage.getItem('gemini_free_api_key') || '';
  });

  // Server SQLite persistence status
  const [dbStatus, setDbStatus] = useState({
    isConnected: false,
    engine: 'SQLite WAL',
    persistent: true,
    totalProducts: 0,
    totalZReports: 0,
    lastSynced: null
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJournalDate, setSelectedJournalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedAnalyticsMonth, setSelectedAnalyticsMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [toastMessage, setToastMessage] = useState(null);

  // Shop profile derived from authenticated user or fallback
  const shopProfile = {
    name: user?.shop_name || 'Smart Retail Store',
    owner: user?.owner_name || 'Store Manager',
    gstin: user?.gstin || '29ABCDE1234F1Z5',
    currency: user?.currency || '₹',
    email: user?.email || 'owner@retailstore.com',
    role: user?.role || 'owner',
    storeCategory: user?.store_category || 'General Retail',
    tagline: user?.tagline || 'Your neighborhood retail shop'
  };

  // Synchronize with backend database when user changes or logs in
  useEffect(() => {
    const fetchRemoteData = async () => {
      if (!isAuthenticated) return;
      try {
        // Sync API key from persistent user profile
        if (user?.gemini_api_key) {
          setGeminiApiKey(user.gemini_api_key);
          localStorage.setItem('gemini_free_api_key', user.gemini_api_key);
        }

        // Fetch authoritative products from persistent database
        const prodRes = await productsApi.getAll();
        if (prodRes.products) {
          const cleanProds = sanitizeProducts(prodRes.products);
          setProducts(cleanProds);
          localStorage.setItem('retail_products', JSON.stringify(cleanProds));
        }

        // Fetch authoritative Z-reports from persistent database
        const zRes = await zReportsApi.getAll();
        if (zRes.zReports) {
          const cleanReports = sanitizeZReports(zRes.zReports);
          setZReports(cleanReports);
          localStorage.setItem('retail_z_reports', JSON.stringify(cleanReports));
        }

        // Check persistence health status
        const statusRes = await backupApi.getStatus().catch(() => ({}));
        setDbStatus({
          isConnected: true,
          engine: statusRes.engine || 'SQLite WAL',
          persistent: true,
          totalProducts: prodRes.products?.length || statusRes.totalProducts || 0,
          totalZReports: zRes.zReports?.length || statusRes.totalZReports || 0,
          lastSynced: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } catch (err) {
        console.warn('Backend sync failed, using cached store data:', err.message);
        setDbStatus(prev => ({ ...prev, isConnected: false }));
      }
    };

    fetchRemoteData();
  }, [isAuthenticated, user?.id, user?.gemini_api_key]);

  // Sync state to LocalStorage as offline backup cache
  useEffect(() => {
    localStorage.setItem('retail_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('retail_z_reports', JSON.stringify(zReports));
  }, [zReports]);

  useEffect(() => {
    localStorage.setItem('gemini_free_api_key', geminiApiKey);
  }, [geminiApiKey]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Product Actions with DB Persistence
  const addProduct = async (newProd) => {
    const localProduct = {
      ...newProd,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      price: parseFloat(newProd.price) || 0,
      costPrice: parseFloat(newProd.costPrice) || 0,
      taxRate: parseFloat(newProd.taxRate) || 0,
      stock: parseInt(newProd.stock) || 0,
      updatedAt: new Date().toISOString()
    };

    setProducts(prev => [localProduct, ...prev]);

    if (isAuthenticated) {
      try {
        const res = await productsApi.add(newProd);
        if (res.product) {
          setProducts(prev => prev.map(p => p.id === localProduct.id ? res.product : p));
        }
      } catch (err) {
        console.warn('Saved locally, remote DB sync deferred:', err.message);
      }
    }

    showToast(`Added product "${localProduct.name}"`);
    return localProduct;
  };

  const updateProduct = async (id, updatedFields) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...updatedFields,
          price: parseFloat(updatedFields.price ?? p.price) || 0,
          costPrice: parseFloat(updatedFields.costPrice ?? p.costPrice) || 0,
          taxRate: parseFloat(updatedFields.taxRate ?? p.taxRate) || 0,
          stock: parseInt(updatedFields.stock ?? p.stock) || 0,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    }));

    if (isAuthenticated) {
      try {
        await productsApi.update(id, updatedFields);
      } catch (err) {
        console.warn('Product updated locally, remote DB deferred:', err.message);
      }
    }

    showToast('Product updated');
  };

  const deleteProduct = async (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    if (isAuthenticated) {
      try {
        await productsApi.delete(id);
      } catch (err) {
        console.warn('Product deleted locally, remote DB deferred:', err.message);
      }
    }
    showToast('Product removed');
  };

  // Z-Report Actions with DB Persistence & Manual/Reviewed New Product Cataloging
  const addOrUpdateZReport = async (reportData, configuredNewProducts = []) => {
    const reportDate = reportData.date || new Date().toISOString().split('T')[0];
    const reportId = reportData.id || `z-${reportDate}-${Date.now().toString().slice(-4)}`;

    const newReport = {
      ...reportData,
      id: reportId,
      date: reportDate,
      grossSales: parseFloat(reportData.grossSales) || 0,
      netSales: parseFloat(reportData.netSales) || 0,
      discount: parseFloat(reportData.discount) || 0,
      taxTotal: parseFloat(reportData.taxTotal) || 0,
      totalItemsSold: parseInt(reportData.totalItemsSold) || (reportData.items?.reduce((acc, i) => acc + (parseInt(i.quantity) || 1), 0) || 0),
      uploadedAt: new Date().toISOString()
    };

    // Update local Z-reports state immediately for instant responsiveness
    setZReports(prev => {
      const filtered = prev.filter(r => r.date !== reportDate);
      return [newReport, ...filtered];
    });

    // Auto-update analytics active month to this report's month
    const repMonth = reportDate.substring(0, 7);
    setSelectedAnalyticsMonth(repMonth);
    setSelectedJournalDate(reportDate);

    // If user reviewed and configured new products, add brand-new items into product catalogue
    // Holy Grail Principle: Existing catalog products must never be overwritten or downgraded by receipt scans!
    let addedCount = 0;
    if (configuredNewProducts && configuredNewProducts.length > 0) {
      setProducts(prevProducts => {
        const prodMap = new Map();
        prevProducts.forEach(p => prodMap.set((p.name || '').toLowerCase().trim(), { ...p }));

        configuredNewProducts.forEach(item => {
          if (item.addToCatalog === false || item.action === 'merge') return;
          const name = (item.name || item.productName || '').trim();
          if (!name) return;
          const key = name.toLowerCase();

          // Holy Grail: If it already exists in the catalog, DO NOT alter its details
          if (!prodMap.has(key)) {
            const uPrice = parseFloat(item.price || item.unitPrice) || 0;
            const cPrice = parseFloat(item.costPrice) || Math.round(uPrice * 0.7);
            const hsn = item.hsnCode || item.hsn || '999999';
            const tax = parseFloat(item.taxRate) || 18;
            const unit = item.unit || 'pcs';
            const category = (item.category || 'General').trim();
            const stock = parseInt(item.stock) || 50;

            prodMap.set(key, {
              id: item.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name,
              hsnCode: hsn,
              price: uPrice,
              costPrice: cPrice,
              taxRate: tax,
              unit,
              category,
              stock,
              updatedAt: new Date().toISOString()
            });
            addedCount++;
          }
        });

        const newProductList = sanitizeProducts(Array.from(prodMap.values()));
        localStorage.setItem('retail_products', JSON.stringify(newProductList));
        return newProductList;
      });
    }

    // Save to real database & synchronize updated catalogue
    if (isAuthenticated) {
      try {
        const res = await zReportsApi.save({
          ...reportData,
          newProducts: configuredNewProducts
        });
        if (res.report) {
          setZReports(prev => prev.map(r => r.date === reportDate ? res.report : r));
        }
        if (res.products && Array.isArray(res.products)) {
          const cleanProds = sanitizeProducts(res.products);
          setProducts(cleanProds);
          localStorage.setItem('retail_products', JSON.stringify(cleanProds));
        }
      } catch (err) {
        console.warn('Stored locally in cache, database sync deferred:', err.message);
      }
    }

    if (addedCount > 0) {
      showToast(`Z-Report saved! ${addedCount} new product${addedCount > 1 ? 's' : ''} added to catalog.`);
    } else {
      showToast('Z-Report logged successfully!');
    }
    return newReport;
  };

  const deleteZReport = async (reportIdOrDate) => {
    const reportToDelete = zReports.find(r => r.id === reportIdOrDate || r.date === reportIdOrDate);
    const targetDate = reportToDelete?.date || (typeof reportIdOrDate === 'string' && reportIdOrDate.length === 10 ? reportIdOrDate : null);

    setZReports(prev => prev.filter(r => r.id !== reportIdOrDate && r.date !== reportIdOrDate));
    
    // Update local cache
    try {
      const stored = JSON.parse(localStorage.getItem('retail_z_reports') || '[]');
      const filtered = stored.filter(r => r.id !== reportIdOrDate && r.date !== reportIdOrDate);
      localStorage.setItem('retail_z_reports', JSON.stringify(filtered));
    } catch {}

    if (isAuthenticated) {
      try {
        if (targetDate) {
          await zReportsApi.deleteByDate(targetDate);
        } else {
          await zReportsApi.delete(reportIdOrDate);
        }
      } catch (err) {
        console.warn('Deleted locally, remote DB sync deferred:', err.message);
      }
    }
    showToast(`Z-Report for ${targetDate || 'selected day'} permanently deleted.`);
  };

  const updateGeminiApiKey = async (newKey, preferredModel) => {
    const cleanKey = (newKey || '').trim();
    setGeminiApiKey(cleanKey);
    localStorage.setItem('gemini_free_api_key', cleanKey);
    if (preferredModel) {
      localStorage.setItem('gemini_preferred_model', preferredModel);
    }

    if (isAuthenticated) {
      try {
        await updateUserProfile({
          geminiApiKey: cleanKey,
          geminiPreferredModel: preferredModel || localStorage.getItem('gemini_preferred_model') || 'gemini-2.0-flash'
        });
      } catch (err) {
        console.warn('API key stored locally, remote sync deferred:', err.message);
      }
    }
  };

  const setShopProfile = async (newProfile) => {
    if (isAuthenticated) {
      try {
        await updateUserProfile({
          shopName: newProfile.name,
          ownerName: newProfile.owner,
          gstin: newProfile.gstin,
          currency: newProfile.currency,
          address: newProfile.address,
          phone: newProfile.phone,
          geminiApiKey: geminiApiKey || undefined
        });
      } catch (err) {
        console.warn('Profile update locally stored:', err.message);
      }
    }
  };

  // Export full persistent backup JSON
  const exportBackupData = async () => {
    try {
      let exportObj;
      if (isAuthenticated) {
        exportObj = await backupApi.exportData();
      } else {
        // Build export from local state if offline
        exportObj = {
          app: 'RetailKhata',
          version: '2.0.0',
          exportedAt: new Date().toISOString(),
          user: { ...shopProfile, geminiApiKey },
          products,
          zReports
        };
      }

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportObj, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `retailkhata_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Exported complete shop backup JSON');
    } catch (err) {
      console.error('Backup export failed:', err);
      showToast('Failed to export backup: ' + err.message, 'error');
    }
  };

  // Import and restore from backup JSON
  const importBackupData = async (jsonData) => {
    try {
      if (!jsonData || (!jsonData.products && !jsonData.zReports)) {
        throw new Error('Invalid RetailKhata backup format');
      }

      if (isAuthenticated) {
        const res = await backupApi.importData(jsonData);
        // Refresh products and z-reports from SQLite
        const prodRes = await productsApi.getAll();
        if (prodRes.products) setProducts(prodRes.products);
        const zRes = await zReportsApi.getAll();
        if (zRes.zReports) setZReports(zRes.zReports);
        showToast(res.message || 'Restored successfully from backup');
      } else {
        // Restore locally
        if (Array.isArray(jsonData.products)) setProducts(jsonData.products);
        if (Array.isArray(jsonData.zReports)) setZReports(jsonData.zReports);
        if (jsonData.user?.geminiApiKey) setGeminiApiKey(jsonData.user.geminiApiKey);
        showToast('Restored backup into local session');
      }
    } catch (err) {
      console.error('Import failed:', err);
      showToast('Failed to restore backup: ' + err.message, 'error');
      throw err;
    }
  };

  // Export Monthly Report CSV
  const exportMonthlyReportCSV = (targetMonth) => {
    const monthReports = zReports.filter(r => r.date.startsWith(targetMonth));
    if (monthReports.length === 0) {
      showToast(`No sales data for ${targetMonth} to export`, 'error');
      return;
    }

    let csvContent = `MONTHLY SALES REPORT - ${targetMonth}\n`;
    csvContent += `Store: ${shopProfile.name}, GSTIN: ${shopProfile.gstin}\n\n`;

    csvContent += `DAILY SALES BREAKDOWN\n`;
    csvContent += `Date,Report No,Units Sold,Gross Sales (${shopProfile.currency}),Discounts,Net Sales,Tax (GST),Cash,UPI,Card\n`;
    monthReports.forEach(r => {
      const p = r.paymentBreakdown || {};
      csvContent += `"${r.date}","${r.reportNumber || 'Z-Report'}",${r.totalItemsSold || 0},${r.grossSales || 0},${r.discount || 0},${r.netSales || 0},${r.taxTotal || 0},${p.cash || 0},${p.upi || 0},${p.card || 0}\n`;
    });

    csvContent += `\nITEMIZED SALES BREAKDOWN BY PRODUCT & HSN\n`;
    csvContent += `Date,Product Name,HSN Code,Quantity Sold,Unit Price,Total Revenue,Tax Rate (%)\n`;
    monthReports.forEach(r => {
      if (r.items && Array.isArray(r.items)) {
        r.items.forEach(i => {
          csvContent += `"${r.date}","${(i.productName || '').replace(/"/g, '""')}","${i.hsnCode || ''}",${i.quantity || 1},${i.unitPrice || 0},${i.lineTotal || 0},${i.taxRate || 0}\n`;
        });
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `monthly_sales_report_${targetMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported monthly sales report for ${targetMonth}`);
  };

  const resetToDemoData = () => {
    setProducts(FALLBACK_PRODUCTS);
    setZReports(FALLBACK_Z_REPORTS);
    showToast('Restored demo data');
  };

  return (
    <AppContext.Provider
      value={{
        products,
        zReports,
        shopProfile,
        setShopProfile,
        geminiApiKey,
        setGeminiApiKey,
        updateGeminiApiKey,
        dbStatus,
        exportBackupData,
        importBackupData,
        activeTab,
        setActiveTab,
        selectedJournalDate,
        setSelectedJournalDate,
        selectedAnalyticsMonth,
        setSelectedAnalyticsMonth,
        toastMessage,
        showToast,
        addProduct,
        updateProduct,
        deleteProduct,
        addOrUpdateZReport,
        deleteZReport,
        exportMonthlyReportCSV,
        resetToDemoData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
