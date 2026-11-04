import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { productsApi, zReportsApi, backupApi } from '../services/api';

const AppContext = createContext();

// Authoritative holy grail catalog: Never pre-populate demo electronics into real user shops
const DEMO_PRODUCT_IDS = new Set([
  'prod-1', 'prod-2', 'prod-3', 'prod-4',
  'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8'
]);

const DEMO_PRODUCT_NAMES = new Set([
  'cotton polo t-shirt',
  'wireless bluetooth earbuds',
  'usb-c braided fast cable 65w',
  'wireless optical mouse',
  'organic wildflower honey 500g',
  'ceramic designer coffee mug',
  'premium basmati rice 5kg',
  'fast charging power bank 20000mah',
  'cotton crew t-shirt',
  'slim fit denim jeans',
  'casual cotton shirt',
  'fleece zipper hoodie',
  'ankle cotton socks 3-pack',
  'ergonomic optical mouse',
  'hdmi 2.1 ultra high speed cable',
  'cold pressed sunflower oil 1l',
  'organic raw honey 500g',
  'roasted cashew nuts 500g',
  'whole wheat atta 10kg',
  'smart led bulb 12w b22',
  '4-socket spike extension board',
  'pvc insulation electrical tape',
  'precision screwdriver set 8-in-1',
  'designer silk scarf',
  'handcrafted leather belt'
]);

const getUserCacheKey = (prefix, user) => {
  if (user?.id) return `${prefix}_${user.id}`;
  if (user?.email) return `${prefix}_${user.email.replace(/[@.]/g, '_')}`;
  return `${prefix}_guest`;
};

const sanitizeProducts = (list, userEmail = null) => {
  if (!Array.isArray(list)) return [];
  const isDemoStore = userEmail === 'demo@retailstore.com';
  return list.filter(p => {
    if (!p || !p.name) return false;
    if (!isDemoStore && (p.id?.startsWith('demo-') || p.id?.startsWith('p-') || DEMO_PRODUCT_IDS.has(p.id))) {
      return false;
    }
    return true;
  });
};

const sanitizeZReports = (list, currentUserId = null) => {
  if (!Array.isArray(list)) return [];
  return list.filter(r => {
    if (!r || !r.date) return false;
    // Any report that belongs to this active user is ALWAYS kept
    if (currentUserId && (r.userId === currentUserId || r.user_id === currentUserId)) return true;
    // Suppress demo mock reports for non-demo users
    if (currentUserId !== 'demo-shop-owner-001' && (r.userId === 'demo-shop-owner-001' || r.user_id === 'demo-shop-owner-001' || (r.storeName === 'Smart Retail Store' && r.reportNumber === 'Z-0048'))) {
      return false;
    }
    return true;
  });
};

const FALLBACK_PRODUCTS = [];
const FALLBACK_Z_REPORTS = [];

export const AppProvider = ({ children }) => {
  const { user, isAuthenticated, updateUserProfile } = useAuth();

  const [products, setProducts] = useState(() => {
    try {
      const key = getUserCacheKey('retail_products', user);
      const saved = localStorage.getItem(key) || (!user ? localStorage.getItem('retail_products') : null);
      if (saved) {
        return sanitizeProducts(JSON.parse(saved), user?.email);
      }
    } catch {}
    return FALLBACK_PRODUCTS;
  });

  const [zReports, setZReports] = useState(() => {
    try {
      const key = getUserCacheKey('retail_z_reports', user);
      const saved = localStorage.getItem(key) || (!user ? localStorage.getItem('retail_z_reports') : null);
      if (saved) {
        return sanitizeZReports(JSON.parse(saved), user?.id);
      }
    } catch {}
    return FALLBACK_Z_REPORTS;
  });

  const [trashReports, setTrashReports] = useState(() => {
    try {
      const key = getUserCacheKey('retail_z_trash', user);
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
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

  // Switch or clear caches when authenticated user changes
  useEffect(() => {
    if (!isAuthenticated) {
      setProducts([]);
      setZReports([]);
      setTrashReports([]);
      return;
    }
    try {
      const pKey = getUserCacheKey('retail_products', user);
      const savedP = localStorage.getItem(pKey);
      if (savedP) setProducts(sanitizeProducts(JSON.parse(savedP), user?.email));

      const rKey = getUserCacheKey('retail_z_reports', user);
      const savedR = localStorage.getItem(rKey);
      if (savedR) setZReports(sanitizeZReports(JSON.parse(savedR), user?.id));

      const tKey = getUserCacheKey('retail_z_trash', user);
      const savedT = localStorage.getItem(tKey);
      if (savedT) setTrashReports(JSON.parse(savedT));
    } catch {}
  }, [user?.id, isAuthenticated]);

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
          const cleanProds = sanitizeProducts(prodRes.products, user?.email);
          setProducts(cleanProds);
          localStorage.setItem(getUserCacheKey('retail_products', user), JSON.stringify(cleanProds));
        }

        // Fetch authoritative Z-reports from persistent database
        const zRes = await zReportsApi.getAll();
        if (zRes.zReports) {
          const cleanReports = sanitizeZReports(zRes.zReports, user?.id);
          setZReports(cleanReports);
          localStorage.setItem(getUserCacheKey('retail_z_reports', user), JSON.stringify(cleanReports));
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

  // Sync state to LocalStorage as user-scoped offline backup cache
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getUserCacheKey('retail_products', user), JSON.stringify(products));
    } else {
      localStorage.setItem('retail_products', JSON.stringify(products));
    }
  }, [products, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getUserCacheKey('retail_z_reports', user), JSON.stringify(zReports));
    } else {
      localStorage.setItem('retail_z_reports', JSON.stringify(zReports));
    }
  }, [zReports, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getUserCacheKey('retail_z_trash', user), JSON.stringify(trashReports));
    }
  }, [trashReports, user?.id]);

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
      stock: parseInt(newProd.stock, 10) || 0,
      updatedAt: new Date().toISOString()
    };

    setProducts(prev => {
      const updated = [localProduct, ...prev];
      try {
        localStorage.setItem('retail_products', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (isAuthenticated) {
      try {
        const res = await productsApi.add(newProd);
        if (res.product) {
          setProducts(prev => {
            const updated = prev.map(p => p.id === localProduct.id ? res.product : p);
            try {
              localStorage.setItem('retail_products', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      } catch (err) {
        console.warn('Saved locally, remote DB sync deferred:', err.message);
      }
    }

    showToast(`Added product "${localProduct.name}"`);
    return localProduct;
  };

  const updateProduct = async (id, updatedFields) => {
    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            ...updatedFields,
            price: parseFloat(updatedFields.price ?? p.price) || 0,
            costPrice: parseFloat(updatedFields.costPrice ?? p.costPrice) || 0,
            taxRate: parseFloat(updatedFields.taxRate ?? p.taxRate) || 0,
            stock: parseInt(updatedFields.stock ?? p.stock, 10) || 0,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      try {
        localStorage.setItem('retail_products', JSON.stringify(updated));
      } catch {}
      return updated;
    });

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
    setProducts(prev => {
      const filtered = prev.filter(p => p.id !== id);
      try {
        localStorage.setItem('retail_products', JSON.stringify(filtered));
      } catch {}
      return filtered;
    });
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

    const paymentBreakdown = {
      cash: parseFloat(reportData.paymentBreakdown?.cash ?? reportData.paymentCash) || 0,
      upi: parseFloat(reportData.paymentBreakdown?.upi ?? reportData.paymentUpi) || 0,
      card: parseFloat(reportData.paymentBreakdown?.card ?? reportData.paymentCard) || 0
    };

    const newReport = {
      ...reportData,
      id: reportId,
      date: reportDate,
      grossSales: parseFloat(reportData.grossSales) || 0,
      netSales: parseFloat(reportData.netSales) || 0,
      discount: parseFloat(reportData.discount) || 0,
      taxTotal: parseFloat(reportData.taxTotal) || 0,
      totalItemsSold: parseInt(reportData.totalItemsSold, 10) || (reportData.items?.reduce((acc, i) => acc + (parseInt(i.quantity || i.qty, 10) || 1), 0) || 0),
      paymentBreakdown,
      uploadedAt: new Date().toISOString()
    };

    // Update local Z-reports state immediately for instant responsiveness
    setZReports(prev => {
      const filtered = prev.filter(r => r.date !== reportDate && r.id !== reportId);
      const updated = [newReport, ...filtered];
      try {
        localStorage.setItem('retail_z_reports', JSON.stringify(updated));
      } catch {}
      return updated;
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
            const stock = parseInt(item.stock, 10) || 50;

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
          id: reportId,
          date: reportDate,
          paymentBreakdown,
          paymentCash: paymentBreakdown.cash,
          paymentUpi: paymentBreakdown.upi,
          paymentCard: paymentBreakdown.card,
          newProducts: configuredNewProducts
        });
        if (res.report) {
          setZReports(prev => {
            const filtered = prev.filter(r => r.date !== reportDate && r.id !== reportId && r.id !== res.report.id);
            const updated = [res.report, ...filtered];
            try {
              localStorage.setItem('retail_z_reports', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
        if (res.products && Array.isArray(res.products)) {
          const cleanProds = sanitizeProducts(res.products);
          setProducts(cleanProds);
          localStorage.setItem('retail_products', JSON.stringify(cleanProds));
        }
      } catch (err) {
        console.error('Database sync failed:', err.message);
        showToast('Local save complete. Cloud sync warning: ' + err.message, 'warning');
      }
    }

    // Clean up any trash entry for this date
    setTrashReports(prev => {
      const updated = prev.filter(t => t.date !== reportDate && t.id !== reportId);
      try {
        localStorage.setItem(getUserCacheKey('retail_z_trash', user), JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (addedCount > 0) {
      showToast(`Z-Report saved! ${addedCount} new product${addedCount > 1 ? 's' : ''} added to catalog.`);
    } else {
      showToast('Z-Report logged successfully!');
    }
    return newReport;
  };

  const deleteZReport = async (reportIdOrDate, targetDateOverride = null) => {
    const reportToDelete = zReports.find(r => r.id === reportIdOrDate || r.date === reportIdOrDate);
    const targetDate = targetDateOverride || reportToDelete?.date || (typeof reportIdOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(reportIdOrDate) ? reportIdOrDate : null);

    // 1. Move to Safety Recycle Bin / Trash first so data is NEVER lost
    if (reportToDelete) {
      setTrashReports(prevTrash => {
        const itemToArchive = {
          ...reportToDelete,
          deletedAt: new Date().toISOString()
        };
        const updated = [itemToArchive, ...prevTrash.filter(t => t.date !== itemToArchive.date && t.id !== itemToArchive.id)].slice(0, 50);
        try {
          localStorage.setItem(getUserCacheKey('retail_z_trash', user), JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

    setZReports(prev => {
      const filtered = prev.filter(r => r.id !== reportIdOrDate && r.date !== reportIdOrDate && (!targetDate || r.date !== targetDate));
      try {
        localStorage.setItem(getUserCacheKey('retail_z_reports', user), JSON.stringify(filtered));
      } catch {}
      return filtered;
    });

    if (isAuthenticated) {
      try {
        let res;
        if (targetDate) {
          res = await zReportsApi.deleteByDate(targetDate);
        } else {
          res = await zReportsApi.delete(reportIdOrDate);
        }
        if (res?.archived && !reportToDelete) {
          setTrashReports(prev => [res.archived, ...prev.filter(t => t.date !== res.archived.date)].slice(0, 50));
        }
      } catch (err) {
        console.error('Remote DB deletion failed:', err.message);
        showToast('Local delete completed. Cloud sync warning: ' + err.message, 'warning');
        return;
      }
    }
    showToast(`Z-Report for ${targetDate || 'selected day'} moved to Recycle Bin.`);
  };

  const restoreZReport = async (targetDate) => {
    if (!targetDate) return null;

    let restoredReport = null;
    if (isAuthenticated) {
      try {
        const res = await zReportsApi.restoreByDate(targetDate);
        if (res && res.report) {
          restoredReport = res.report;
        }
      } catch (err) {
        console.warn('Server restore warning, falling back to local trash:', err.message);
      }
    }

    if (!restoredReport) {
      const fromTrash = trashReports.find(t => t.date === targetDate);
      if (fromTrash) {
        restoredReport = await addOrUpdateZReport(fromTrash);
      }
    } else {
      setZReports(prev => {
        const filtered = prev.filter(r => r.date !== targetDate && r.id !== restoredReport.id);
        const updated = [restoredReport, ...filtered];
        try {
          localStorage.setItem(getUserCacheKey('retail_z_reports', user), JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }

    if (restoredReport) {
      setTrashReports(prev => {
        const updated = prev.filter(t => t.date !== targetDate && t.id !== restoredReport.id);
        try {
          localStorage.setItem(getUserCacheKey('retail_z_trash', user), JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setSelectedJournalDate(targetDate);
      showToast(`Z-Report for ${targetDate} restored successfully!`);
      return restoredReport;
    } else {
      showToast(`No backup found to restore for ${targetDate}`, 'error');
      return null;
    }
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
        trashReports,
        restoreZReport,
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
