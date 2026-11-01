import React from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Printer
} from 'lucide-react';

export const MonthlyAnalyticsTab = () => {
  const { 
    zReports, 
    shopProfile, 
    exportMonthlyReportCSV, 
    setSelectedJournalDate, 
    setActiveTab,
    selectedAnalyticsMonth,
    setSelectedAnalyticsMonth
  } = useApp();

  const { theme } = useTheme();

  const availableMonths = Array.from(new Set(
    zReports.map(r => r.date.substring(0, 7))
  )).sort().reverse();

  const activeMonth = selectedAnalyticsMonth || availableMonths[0] || new Date().toISOString().substring(0, 7);
  const monthReports = zReports.filter(r => r.date.startsWith(activeMonth));
  monthReports.sort((a, b) => a.date.localeCompare(b.date));

  const totalGross = monthReports.reduce((acc, r) => acc + (r.grossSales || 0), 0);
  const totalNet = monthReports.reduce((acc, r) => acc + (r.netSales || 0), 0);
  const totalTax = monthReports.reduce((acc, r) => acc + (r.taxTotal || 0), 0);
  const totalUnits = monthReports.reduce((acc, r) => acc + (r.totalItemsSold || 0), 0);
  const avgDailySales = monthReports.length > 0 ? Math.round(totalNet / monthReports.length) : 0;

  let bestDay = null;
  monthReports.forEach(r => {
    if (!bestDay || r.netSales > bestDay.netSales) {
      bestDay = r;
    }
  });

  const totalCash = monthReports.reduce((acc, r) => acc + (r.paymentBreakdown?.cash || 0), 0);
  const totalUpi = monthReports.reduce((acc, r) => acc + (r.paymentBreakdown?.upi || 0), 0);
  const totalCard = monthReports.reduce((acc, r) => acc + (r.paymentBreakdown?.card || 0), 0);
  const totalPayments = totalCash + totalUpi + totalCard || 1;

  const productSalesMap = {};
  monthReports.forEach(r => {
    if (r.items && Array.isArray(r.items)) {
      r.items.forEach(i => {
        const key = i.productName.toLowerCase().trim();
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            productName: i.productName,
            hsnCode: i.hsnCode || '999999',
            unit: i.unit || 'pcs',
            unitPrice: i.unitPrice || 0,
            quantity: 0,
            revenue: 0,
            taxRate: i.taxRate || 18
          };
        }
        productSalesMap[key].quantity += (parseInt(i.quantity) || 1);
        productSalesMap[key].revenue += (parseFloat(i.lineTotal) || 0);
      });
    }
  });

  const rankedProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);

  const hsnMap = {};
  monthReports.forEach(r => {
    if (r.items && Array.isArray(r.items)) {
      r.items.forEach(i => {
        const hsn = i.hsnCode || '999999';
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsnCode: hsn,
            productNames: new Set(),
            quantity: 0,
            taxableValue: 0,
            taxRate: i.taxRate || 18,
          };
        }
        hsnMap[hsn].productNames.add(i.productName);
        hsnMap[hsn].quantity += (parseInt(i.quantity) || 1);
        hsnMap[hsn].taxableValue += (parseFloat(i.lineTotal) || 0);
      });
    }
  });

  const hsnList = Object.values(hsnMap).sort((a, b) => b.taxableValue - a.taxableValue);

  const [yearStr, monthNumStr] = activeMonth.split('-');
  const daysInMonth = new Date(parseInt(yearStr), parseInt(monthNumStr), 0).getDate();
  const maxDaySales = Math.max(...monthReports.map(r => r.netSales), 1);

  const monthDateObj = new Date(parseInt(yearStr), parseInt(monthNumStr) - 1, 1);
  const formattedMonthName = monthDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Month Selector Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-neutral-400 dark:text-zinc-500">
              Monthly Intelligence
            </span>
            <h2 className="font-display text-base font-extrabold text-neutral-900 dark:text-neutral-100 mt-0.5">
              {formattedMonthName}
            </h2>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => exportMonthlyReportCSV(activeMonth)}
              className="py-1.5 px-3 rounded-full bg-gradient-to-r from-rust-700 to-copper-600 text-white font-display font-semibold text-[11px] flex items-center gap-1.5 transition-all shadow-spray-rust hover:opacity-95"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dropdown */}
        <div className="flex items-center space-x-2 pt-2 border-t border-neutral-100 dark:border-zinc-800/80 text-xs">
          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-500 dark:text-zinc-400 font-medium">Month:</span>
          <select
            value={activeMonth}
            onChange={(e) => setSelectedAnalyticsMonth(e.target.value)}
            className="flex-1 text-xs font-display font-semibold bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2.5 py-1 text-neutral-900 dark:text-zinc-100 outline-none cursor-pointer"
          >
            {availableMonths.map(m => {
              const [y, mth] = m.split('-');
              const d = new Date(parseInt(y), parseInt(mth) - 1, 1);
              return (
                <option key={m} value={m}>
                  {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* KPI Cards with sprayed rust aura */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2 rounded-3xl p-5 bg-gradient-to-b from-neutral-900 via-zinc-900 to-black text-white border border-rust-500/25 dark:border-rust-500/30 shadow-xl shadow-rust-950/20 relative overflow-hidden space-y-2">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-rust-600/20 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="text-[10px] font-medium tracking-wider uppercase text-rust-300/90">Net Monthly Volume</span>
            <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-rust-500/15 text-rust-300 border border-rust-500/30">
              {monthReports.length} Active Days
            </span>
          </div>
          <div className="font-display text-3xl font-extrabold tracking-tight text-white">
            {shopProfile.currency}{totalNet.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-white/10">
            <span>Gross: {shopProfile.currency}{totalGross.toLocaleString()}</span>
            <span>Tax: {shopProfile.currency}{totalTax.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs">
          <span className="text-[10px] font-medium text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Total Units</span>
          <p className="font-display text-xl font-extrabold text-neutral-900 dark:text-neutral-100 mt-0.5">
            {totalUnits.toLocaleString()}
          </p>
          <span className="text-[10px] text-neutral-500 dark:text-zinc-400 mt-1 block">
            {rankedProducts.length} unique products
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs">
          <span className="text-[10px] font-medium text-neutral-400 dark:text-zinc-500 uppercase tracking-wider">Daily Average</span>
          <p className="font-display text-xl font-extrabold text-neutral-900 dark:text-neutral-100 mt-0.5">
            {shopProfile.currency}{avgDailySales.toLocaleString()}
          </p>
          {bestDay && (
            <span className="text-[10px] text-neutral-500 dark:text-zinc-400 mt-1 block truncate">
              Peak: {shopProfile.currency}{bestDay.netSales.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Daily Revenue Bar Chart (Apple Fitness / Stocks Aesthetic) */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight">
            Daily Trajectory
          </h3>
          <span className="text-[10px] font-mono text-neutral-400 dark:text-zinc-500">
            Peak: {shopProfile.currency}{maxDaySales.toLocaleString()}
          </span>
        </div>

        <div className="pt-3 pb-1">
          <div className="h-36 flex items-end justify-between gap-1 border-b border-neutral-100 dark:border-zinc-800 px-1">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const dayStr = `${activeMonth}-${String(dayNum).padStart(2, '0')}`;
              const report = monthReports.find(r => r.date === dayStr);
              const heightPercent = report ? Math.max(10, Math.round((report.netSales / maxDaySales) * 100)) : 0;

              return (
                <div 
                  key={dayNum} 
                  className="flex-1 flex flex-col items-center group relative cursor-pointer"
                  onClick={() => {
                    setSelectedJournalDate(dayStr);
                    setActiveTab('daily_journal');
                  }}
                >
                  {report && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 z-20 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[9px] font-display font-bold py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap shadow-lg">
                      {shopProfile.currency}{report.netSales.toLocaleString()}
                    </div>
                  )}

                  <div 
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-sm transition-all ${
                      report 
                        ? 'bg-gradient-to-t from-rust-700 to-copper-500 shadow-spray-rust group-hover:from-rust-600 group-hover:to-copper-400' 
                        : 'bg-neutral-100 dark:bg-zinc-850 h-1 rounded-full'
                    }`}
                  />
                  <span className={`text-[8px] mt-1 font-mono ${report ? 'text-neutral-700 dark:text-zinc-300 font-bold' : 'text-neutral-300 dark:text-zinc-700'}`}>
                    {dayNum % 4 === 1 || dayNum === daysInMonth ? dayNum : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 5 Products */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight">
          Top Products by Revenue
        </h3>

        <div className="space-y-2">
          {rankedProducts.slice(0, 5).map((prod, idx) => {
            const percent = totalNet > 0 ? Math.round((prod.revenue / totalNet) * 100) : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 truncate pr-2">
                    <span className="font-mono text-[10px] text-neutral-400 dark:text-zinc-500 w-4">
                      0{idx + 1}
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{prod.productName}</span>
                    <span className="text-[9px] font-mono text-neutral-400 bg-neutral-100 dark:bg-zinc-800 px-1 rounded shrink-0">
                      HSN: {prod.hsnCode}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display font-bold text-neutral-900 dark:text-neutral-100 block">
                      {shopProfile.currency}{prod.revenue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Minimalist Progress Bar */}
                <div className="w-full bg-neutral-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                  <div 
                    className="bg-neutral-800 dark:bg-zinc-200 h-1 rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HSN Summary (GSTR-1 Tax Compliance) */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight">
            HSN Tax Breakdown (GSTR-1)
          </h3>
          <span className="text-[10px] font-mono text-neutral-400 dark:text-zinc-500">
            {hsnList.length} Codes
          </span>
        </div>

        <div className="space-y-2">
          {hsnList.map(item => (
            <div 
              key={item.hsnCode}
              className="p-3 rounded-2xl bg-neutral-50 dark:bg-zinc-850/60 border border-neutral-100 dark:border-zinc-800/60 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 bg-neutral-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                  HSN {item.hsnCode}
                </span>
                <span className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100">
                  {shopProfile.currency}{item.taxableValue.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 dark:text-zinc-500 truncate">
                {Array.from(item.productNames).join(', ')}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-zinc-800/80 text-[10px] text-neutral-500 dark:text-zinc-400">
                <span>Units: {item.quantity}</span>
                <span>GST: {item.taxRate}%</span>
                <span>Tax: {shopProfile.currency}{Math.round(item.taxableValue * (item.taxRate / 100)).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
