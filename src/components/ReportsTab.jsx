import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter, 
  FileSpreadsheet, 
  Receipt, 
  Trash2, 
  Layers,
  ChevronDown,
  Printer,
  AlertTriangle
} from 'lucide-react';

export const ReportsTab = () => {
  const { sales, exportSalesCSV, deleteSale, shopProfile } = useApp();

  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'week', 'custom'
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeReportSubTab, setActiveReportSubTab] = useState('transactions'); // 'transactions' or 'hsn'
  const [saleToDelete, setSaleToDelete] = useState(null);

  // Filter sales
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredSales = sales.filter(s => {
    if (dateFilter === 'today') return s.date === todayStr;
    if (dateFilter === 'custom') return s.date === customDate;
    if (dateFilter === 'week') {
      const saleDate = new Date(s.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return saleDate >= weekAgo;
    }
    return true; // 'all'
  });

  const totalRevenue = filteredSales.reduce((acc, s) => acc + (parseFloat(s.grandTotal) || 0), 0);
  const totalInvoices = filteredSales.length;

  // Compute HSN-wise sales summary
  const hsnSummaryMap = {};
  filteredSales.forEach(sale => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        const hsn = item.hsnCode || 'Unclassified (999999)';
        if (!hsnSummaryMap[hsn]) {
          hsnSummaryMap[hsn] = {
            hsnCode: hsn,
            productNames: new Set(),
            totalQty: 0,
            taxRate: item.taxRate || 18,
            totalValue: 0,
          };
        }
        hsnSummaryMap[hsn].productNames.add(item.productName);
        hsnSummaryMap[hsn].totalQty += (parseInt(item.quantity) || 1);
        hsnSummaryMap[hsn].totalValue += (parseFloat(item.lineTotal) || 0);
      });
    }
  });

  const hsnSummaryList = Object.values(hsnSummaryMap);

  return (
    <div className="space-y-4 pb-24">
      {/* Top Filter Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Sales & Tax Reports
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {filteredSales.length} invoice records found
            </p>
          </div>

          <button
            onClick={exportSalesCSV}
            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'custom', label: 'By Date' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                dateFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-xs text-slate-500 font-medium">Select Date:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none"
            />
          </div>
        )}

        {/* Metrics Summary Card */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Total Sales</span>
            <p className="text-base font-extrabold text-indigo-700 mt-0.5">
              {shopProfile.currency}{totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Invoices Logged</span>
            <p className="text-base font-extrabold text-slate-800 mt-0.5">
              {totalInvoices} bills
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tab Toggle: Transactions vs HSN Summary */}
      <div className="flex p-1 bg-slate-200/70 rounded-2xl">
        <button
          onClick={() => setActiveReportSubTab('transactions')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeReportSubTab === 'transactions'
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Invoices Log ({filteredSales.length})
        </button>
        <button
          onClick={() => setActiveReportSubTab('hsn')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeReportSubTab === 'hsn'
              ? 'bg-white text-indigo-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          HSN Tax Summary ({hsnSummaryList.length})
        </button>
      </div>

      {/* View 1: Invoices Log */}
      {activeReportSubTab === 'transactions' && (
        <div className="space-y-2.5">
          {filteredSales.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-semibold text-slate-600">No invoices for selected period</p>
              <p className="text-[11px] text-slate-400 mt-1">Switch filter to "All Time" to see past transactions.</p>
            </div>
          ) : (
            filteredSales.map((sale) => (
              <div 
                key={sale.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-xs text-slate-800">
                        {sale.invoiceNumber}
                      </span>
                      {sale.source === 'ai_scan' ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                          AI Scanned
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{sale.date}</span>
                      <span>•</span>
                      <span>{sale.customerName || 'Walk-in'}</span>
                      <span>•</span>
                      <span className="font-semibold text-indigo-600">{sale.paymentMode || 'Cash'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-sm text-slate-900 block">
                      {shopProfile.currency}{sale.grandTotal?.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSaleToDelete(sale)}
                      className="text-[10px] text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Items breakdown inside invoice */}
                {sale.items && sale.items.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 text-xs border border-slate-100">
                    {sale.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-700 font-medium">
                            {item.productName}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded">
                            HSN: {item.hsnCode}
                          </span>
                          <span className="text-slate-400">
                            x{item.quantity}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-800">
                          {shopProfile.currency}{item.lineTotal?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* View 2: HSN Summary Table */}
      {activeReportSubTab === 'hsn' && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              HSN Code Breakdown (GST Tax Filing)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Aggregated sales grouped by Harmonized System of Nomenclature code
            </p>
          </div>

          {hsnSummaryList.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-xs">No HSN data found for this period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hsnSummaryList.map(item => (
                <div 
                  key={item.hsnCode}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      HSN {item.hsnCode}
                    </span>
                    <span className="font-extrabold text-sm text-slate-900">
                      {shopProfile.currency}{item.totalValue.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 truncate">
                    Products: {Array.from(item.productNames).join(', ')}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                    <span>Total Qty Sold: {item.totalQty} units</span>
                    <span>GST Rate: {item.taxRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom 2-Step Confirmation Modal for Invoice Delete */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Delete Invoice #{saleToDelete.invoiceNumber}?
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-zinc-400 mt-0.5">
                  Are you sure you want to permanently delete this sales transaction?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-zinc-850/80 border border-neutral-100 dark:border-zinc-800 text-xs space-y-1.5">
              <div className="flex justify-between text-neutral-600 dark:text-zinc-400">
                <span>Invoice:</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">#{saleToDelete.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-zinc-400">
                <span>Date:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{saleToDelete.date}</span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-zinc-400">
                <span>Total Amount:</span>
                <span className="font-display font-bold text-neutral-900 dark:text-neutral-100">
                  {shopProfile.currency}{saleToDelete.grandTotal?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-neutral-800 dark:text-zinc-200 font-display font-semibold text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteSale(saleToDelete.id);
                  setSaleToDelete(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
