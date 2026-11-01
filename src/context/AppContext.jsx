import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { productsApi, zReportsApi } from '../services/api';

const AppContext = createContext();

const FALLBACK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Cotton Polo T-Shirt',
    hsnCode: '61091000',
    price: 499,
    costPrice: 280,
    unit: 'pcs',
    category: 'Apparel',
    taxRate: 5,
    stock: 85,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-2',
    name: 'Wireless Bluetooth Earbuds',
    hsnCode: '85183000',
    price: 1299,
    costPrice: 750,
    unit: 'pcs',
    category: 'Electronics',
    taxRate: 18,
    stock: 34,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-3',
    name: 'USB-C Braided Fast Cable 65W',
    hsnCode: '85444299',
    price: 249,
    costPrice: 110,
    unit: 'pcs',
    category: 'Electronics',
    taxRate: 18,
    stock: 92,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod-4',
    name: 'Wireless Optical Mouse',
    hsnCode: '84716060',
    price: 450,
    costPrice: 240,
    unit: 'pcs',
    category: 'Electronics',
    taxRate: 18,
    stock: 28,
    updatedAt: new Date().toISOString()
  }
];

const FALLBACK_Z_REPORTS = [
  {
    id: 'z-2026-11-01',
    date: '2026-11-01',
    reportNumber: 'Z-0048',
    closingTime: '21:45',
    storeName: 'Smart Retail Store',
    registerId: 'REG-01',
    totalItemsSold: 45,
    grossSales: 19800,
    discount: 650,
    netSales: 19150,
    taxTotal: 2140,
    paymentBreakdown: { cash: 6200, upi: 9850, card: 3100 },
    items: [
      { productName: 'Cotton Polo T-Shirt', hsnCode: '61091000', quantity: 14, unit: 'pcs', unitPrice: 499, lineTotal: 6986, taxRate: 5 },
      { productName: 'Wireless Bluetooth Earbuds', hsnCode: '85183000', quantity: 4, unit: 'pcs', unitPrice: 1299, lineTotal: 5196, taxRate: 18 },
      { productName: 'USB-C Braided Fast Cable 65W', hsnCode: '85444299', quantity: 12, unit: 'pcs', unitPrice: 249, lineTotal: 2988, taxRate: 18 }
    ],
    uploadedAt: '2026-11-01T21:46:12Z'
  }
];

export const AppProvider = ({ children }) => {
  const { user, isAuthenticated, updateUserProfile } = useAuth();

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('retail_products');
    return saved ? JSON.parse(saved) : FALLBACK_PRODUCTS;
  });

  const [zReports, setZReports] = useState(() => {
    const saved = localStorage.getItem('retail_z_reports');
    return saved ? JSON.parse(saved) : FALLBACK_Z_REPORTS;
  });

  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('gemini_free_api_key') || '';
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
    role: user?.role || 'owner'
  };

  // Synchronize with backend database when user changes or logs in
  useEffect(() => {
    const fetchRemoteData = async () => {
      if (!isAuthenticated) return;
      try {
        // Fetch products from database
        const prodRes = await productsApi.getAll();
        if (prodRes.products) {
          setProducts(prodRes.products);
          localStorage.setItem('retail_products', JSON.stringify(prodRes.products));
        }

        // Fetch Z-reports from database
        const zRes = await zReportsApi.getAll();
        if (zRes.zReports) {
          setZReports(zRes.zReports);
          localStorage.setItem('retail_z_reports', JSON.stringify(zRes.zReports));
        }
      } catch (err) {
        console.warn('Backend sync failed, using cached store data:', err.message);
      }
    };

    fetchRemoteData();
  }, [isAuthenticated, user?.id]);

  // Sync state to LocalStorage as offline backup
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

  // Z-Report Actions with DB Persistence
  const addOrUpdateZReport = async (reportData) => {
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

    // Update local state immediately for instant responsiveness
    setZReports(prev => {
      const filtered = prev.filter(r => r.date !== reportDate);
      return [newReport, ...filtered];
    });

    setSelectedJournalDate(reportDate);

    // Save to real database
    if (isAuthenticated) {
      try {
        const res = await zReportsApi.save(reportData);
        if (res.report) {
          setZReports(prev => prev.map(r => r.date === reportDate ? res.report : r));
        }
      } catch (err) {
        console.warn('Stored locally in cache, database sync deferred:', err.message);
      }
    }

    showToast(`EOD Z-Report saved for ${reportDate}! (${shopProfile.currency}${newReport.netSales.toLocaleString()})`);
    return newReport;
  };

  const deleteZReport = async (reportId) => {
    setZReports(prev => prev.filter(r => r.id !== reportId));
    if (isAuthenticated) {
      try {
        await zReportsApi.delete(reportId);
      } catch (err) {
        console.warn('Deleted locally, remote DB sync deferred:', err.message);
      }
    }
    showToast('Z-Report entry deleted');
  };

  const setShopProfile = async (newProfile) => {
    if (isAuthenticated) {
      try {
        await updateUserProfile({
          shopName: newProfile.name,
          ownerName: newProfile.owner,
          gstin: newProfile.gstin,
          currency: newProfile.currency
        });
      } catch (err) {
        console.warn('Profile update locally stored:', err.message);
      }
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
