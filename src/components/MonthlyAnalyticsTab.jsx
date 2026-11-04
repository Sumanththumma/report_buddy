import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar, 
  Printer,
  Award,
  Package,
  Flame,
  Zap,
  Sparkles,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  ArrowUpRight,
  ChevronRight,
  Building2
} from 'lucide-react';
import { GSTFilingView } from './GSTFilingView';

export const MonthlyAnalyticsTab = () => {
  const { 
    zReports, 
    shopProfile, 
    exportMonthlyReportCSV, 
    setSelectedJournalDate, 
    setActiveTab,
    selectedAnalyticsMonth,
    setSelectedAnalyticsMonth,
    products,
    updateProduct,
    addProduct,
    showToast
  } = useApp();

  const { theme } = useTheme();

  // Sort view options
  const [rankingMode, setRankingMode] = useState('quantity'); // 'quantity' or 'revenue'
  const [chartMode, setChartMode] = useState('trajectory'); // 'trajectory' or 'bars'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [analyticsSubTab, setAnalyticsSubTab] = useState('sales'); // 'sales' | 'gst'

  const handleUpdateProductHsn = async (productName, newHsn, newTaxRate) => {
    try {
      const existing = (products || []).find(
        p => p.name?.trim().toLowerCase() === productName.trim().toLowerCase()
      );
      if (existing) {
        await updateProduct(existing.id, {
          ...existing,
          hsn: newHsn,
          taxRate: newTaxRate
        });
      } else {
        await addProduct({
          name: productName,
          category: 'Matching & Fabric',
          hsn: newHsn,
          taxRate: newTaxRate,
          unit: 'pcs'
        });
      }
      showToast?.(`Updated HSN for ${productName} to ${newHsn}`, 'success');
    } catch (err) {
      console.error('Failed to update product HSN:', err);
      showToast?.(`Failed to update HSN: ${err.message}`, 'error');
    }
  };

  // Available months containing data
  const availableMonths = Array.from(new Set(
    zReports.map(r => r.date.substring(0, 7))
  )).sort().reverse();

  // Active month: Prioritize selected month if it exists, otherwise use latest month with reports
  const activeMonth = (selectedAnalyticsMonth && availableMonths.includes(selectedAnalyticsMonth))
    ? selectedAnalyticsMonth
    : (availableMonths[0] || new Date().toISOString().substring(0, 7));

  // Filter reports belonging to the selected month, sorted chronologically
  const monthReports = zReports.filter(r => r.date.startsWith(activeMonth));
  monthReports.sort((a, b) => a.date.localeCompare(b.date));

  // High-level financial aggregates
  const totalGross = monthReports.reduce((acc, r) => acc + (parseFloat(r.grossSales) || 0), 0);
  const totalNet = monthReports.reduce((acc, r) => acc + (parseFloat(r.netSales) || 0), 0);
  const totalTax = monthReports.reduce((acc, r) => acc + (parseFloat(r.taxTotal) || 0), 0);
  const totalUnits = monthReports.reduce((acc, r) => acc + (parseInt(r.totalItemsSold) || 0), 0);
  const avgDailySales = monthReports.length > 0 ? Math.round(totalNet / monthReports.length) : 0;

  // Best day identification
  let bestDay = null;
  monthReports.forEach(r => {
    if (!bestDay || (parseFloat(r.netSales) || 0) > (parseFloat(bestDay.netSales) || 0)) {
      bestDay = r;
    }
  });

  // Payment Breakdown
  const totalCash = monthReports.reduce((acc, r) => acc + (parseFloat(r.paymentBreakdown?.cash || r.cash) || 0), 0);
  const totalUpi = monthReports.reduce((acc, r) => acc + (parseFloat(r.paymentBreakdown?.upi || r.upi) || 0), 0);
  const totalCard = monthReports.reduce((acc, r) => acc + (parseFloat(r.paymentBreakdown?.card || r.card) || 0), 0);
  const totalPayments = totalCash + totalUpi + totalCard || 1;

  const cashPercent = Math.round((totalCash / totalPayments) * 100);
  const upiPercent = Math.round((totalUpi / totalPayments) * 100);
  const cardPercent = Math.max(0, 100 - (cashPercent + upiPercent));

  // Product sales aggregation
  const productSalesMap = {};
  monthReports.forEach(r => {
    if (r.items && Array.isArray(r.items)) {
      r.items.forEach(i => {
        const prodName = (i.productName || i.name || 'Item').trim();
        const key = prodName.toLowerCase();
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            productName: prodName,
            hsnCode: i.hsnCode || i.hsn || '999999',
            unit: i.unit || 'pcs',
            unitPrice: parseFloat(i.unitPrice || i.price) || 0,
            quantity: 0,
            revenue: 0,
            taxRate: parseFloat(i.taxRate) || 18
          };
        }
        productSalesMap[key].quantity += (parseInt(i.quantity || i.qty) || 1);
        productSalesMap[key].revenue += (parseFloat(i.lineTotal || i.total) || 0);
      });
    }
  });

  const rankedProductsByQty = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);
  const rankedProductsByRev = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);
  const displayedRankedProducts = rankingMode === 'quantity' ? rankedProductsByQty : rankedProductsByRev;

  // HSN Tax Breakdown
  const hsnMap = {};
  monthReports.forEach(r => {
    if (r.items && Array.isArray(r.items)) {
      r.items.forEach(i => {
        const hsn = i.hsnCode || i.hsn || '999999';
        const prodName = (i.productName || i.name || 'Item').trim();
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsnCode: hsn,
            productNames: new Set(),
            quantity: 0,
            taxableValue: 0,
            taxRate: parseFloat(i.taxRate) || 18,
          };
        }
        hsnMap[hsn].productNames.add(prodName);
        hsnMap[hsn].quantity += (parseInt(i.quantity || i.qty) || 1);
        hsnMap[hsn].taxableValue += (parseFloat(i.lineTotal || i.total) || 0);
      });
    }
  });

  const hsnList = Object.values(hsnMap).sort((a, b) => b.taxableValue - a.taxableValue);

  // Month Date details
  const [yearStr, monthNumStr] = activeMonth.split('-');
  const daysInMonth = new Date(parseInt(yearStr), parseInt(monthNumStr), 0).getDate();
  const maxDaySales = Math.max(...monthReports.map(r => parseFloat(r.netSales) || 0), 1);
  const monthDateObj = new Date(parseInt(yearStr), parseInt(monthNumStr) - 1, 1);
  const formattedMonthName = monthDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // -------------------------------------------------------------
  // Dynamic SVG Curve Math for 1 or more reports
  // -------------------------------------------------------------
  const svgWidth = 340;
  const svgHeight = 150;
  const paddingX = 24;
  const paddingY = 22;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  // Build chart points
  let chartCoords = [];
  let svgLinePath = '';
  let svgAreaPath = '';

  if (monthReports.length === 1) {
    const single = monthReports[0];
    const day = parseInt(single.date.split('-')[2]) || 1;
    // Map day of month (1 to daysInMonth) to X coordinate
    const x = paddingX + ((day - 1) / Math.max(daysInMonth - 1, 1)) * plotWidth;
    const y = paddingY + plotHeight * 0.35; // 35% from top

    chartCoords = [{ x, y, report: single, day }];
    svgLinePath = `M ${paddingX} ${y} L ${svgWidth - paddingX} ${y}`;
    svgAreaPath = `M ${paddingX} ${svgHeight - paddingY} L ${paddingX} ${y} L ${svgWidth - paddingX} ${y} L ${svgWidth - paddingX} ${svgHeight - paddingY} Z`;
  } else if (monthReports.length >= 2) {
    chartCoords = monthReports.map((r, idx) => {
      const x = paddingX + (idx / (monthReports.length - 1)) * plotWidth;
      const sales = parseFloat(r.netSales) || 0;
      const y = paddingY + plotHeight - (sales / maxDaySales) * plotHeight;
      const day = parseInt(r.date.split('-')[2]) || idx + 1;
      return { x, y, report: r, day };
    });

    // Smooth Bezier Curve
    svgLinePath = `M ${chartCoords[0].x} ${chartCoords[0].y}`;
    for (let i = 0; i < chartCoords.length - 1; i++) {
      const p0 = chartCoords[i];
      const p1 = chartCoords[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      svgLinePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    svgAreaPath = `${svgLinePath} L ${chartCoords[chartCoords.length - 1].x} ${svgHeight - paddingY} L ${chartCoords[0].x} ${svgHeight - paddingY} Z`;
  }

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Month Selector & Action Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-rust-700 dark:text-rust-400">
                Performance Intelligence
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-rust-500 animate-pulse" />
            </div>
            <h2 className="font-display text-base font-extrabold text-neutral-900 dark:text-neutral-100 mt-0.5">
              {formattedMonthName}
            </h2>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => exportMonthlyReportCSV(activeMonth)}
              className="py-1.5 px-3 rounded-full bg-gradient-to-r from-rust-700 to-copper-600 text-white font-display font-semibold text-[11px] flex items-center gap-1.5 transition-all shadow-spray-rust hover:opacity-95 active:scale-95"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-300 hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
              title="Print report"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Month Selector Dropdown */}
        <div className="flex items-center space-x-2 pt-2 border-t border-neutral-100 dark:border-zinc-800/80 text-xs">
          <Calendar className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400 shrink-0" />
          <span className="text-neutral-500 dark:text-zinc-400 font-medium shrink-0">Viewing:</span>
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
                  {d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} ({zReports.filter(r => r.date.startsWith(m)).length} reports)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Segmented Sub-Tab Switcher: Sales Analytics vs GST & CA Filing */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-zinc-800/80 border border-neutral-200/80 dark:border-zinc-700/80">
        <button
          type="button"
          onClick={() => setAnalyticsSubTab('sales')}
          className={`flex-1 py-2 px-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            analyticsSubTab === 'sales'
              ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-zinc-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
          Sales Intelligence
        </button>

        <button
          type="button"
          onClick={() => setAnalyticsSubTab('gst')}
          className={`flex-1 py-2 px-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
            analyticsSubTab === 'gst'
              ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-zinc-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
          GST & CA Filing
        </button>
      </div>

      {analyticsSubTab === 'gst' ? (
        <GSTFilingView
          monthReports={monthReports}
          selectedMonth={activeMonth}
          shopProfile={shopProfile}
          products={products}
          onUpdateProductHsn={handleUpdateProductHsn}
        />
      ) : (
        <>
      {/* Hero Financial Metric Card with Sprayed Rust Aura */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl p-5 bg-gradient-to-b from-neutral-900 via-zinc-900 to-black text-white border border-rust-500/25 dark:border-rust-500/30 shadow-xl shadow-rust-950/20 relative overflow-hidden space-y-2"
      >
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-rust-600/25 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-copper-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between text-neutral-400 text-xs relative z-10">
          <span className="text-[10px] font-medium tracking-wider uppercase text-rust-300/90 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-rust-400" />
            Net Monthly Revenue
          </span>
          <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-rust-500/15 text-rust-300 border border-rust-500/30">
            {monthReports.length} {monthReports.length === 1 ? 'Report Logged' : 'Active Days'}
          </span>
        </div>

        <div className="font-display text-3xl font-extrabold tracking-tight text-white relative z-10">
          {shopProfile.currency}{totalNet.toLocaleString()}
        </div>

        <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-white/10 relative z-10">
          <span>Gross: {shopProfile.currency}{totalGross.toLocaleString()}</span>
          <span>GST Collected: {shopProfile.currency}{totalTax.toLocaleString()}</span>
        </div>
      </motion.div>

      {/* Interactive Trajectory Graph (Visible with 1 or More Reports) */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
              Sales Trajectory Curve
            </h3>
            <p className="text-[10px] text-neutral-500 dark:text-zinc-400 mt-0.5">
              {monthReports.length === 0 
                ? 'No reports scanned yet for this month.'
                : monthReports.length === 1
                ? 'Milestone: Day 1 captured. Curve activates as more days are scanned.'
                : `${monthReports.length} data points tracked in ${formattedMonthName}`}
            </p>
          </div>

          <div className="flex items-center bg-neutral-100 dark:bg-zinc-800 rounded-xl p-0.5 text-[10px]">
            <button
              onClick={() => setChartMode('trajectory')}
              className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                chartMode === 'trajectory'
                  ? 'bg-white dark:bg-zinc-700 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 dark:text-zinc-400'
              }`}
            >
              Curve
            </button>
            <button
              onClick={() => setChartMode('bars')}
              className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                chartMode === 'bars'
                  ? 'bg-white dark:bg-zinc-700 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-500 dark:text-zinc-400'
              }`}
            >
              Bars
            </button>
          </div>
        </div>

        {/* SVG Curve Chart Mode */}
        {chartMode === 'trajectory' && (
          <div className="relative pt-2">
            {monthReports.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-850/50 border border-dashed border-neutral-200 dark:border-zinc-800">
                <BarChart3 className="w-8 h-8 text-neutral-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-neutral-700 dark:text-zinc-300">No Sales Data for {formattedMonthName}</p>
                <p className="text-[11px] text-neutral-500 dark:text-zinc-400 mt-0.5">Scan a daily Z-report to start viewing your live sales trajectory.</p>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-neutral-50/70 dark:bg-zinc-850/40 border border-neutral-100 dark:border-zinc-800/80 p-2">
                {/* SVG Canvas */}
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-40 overflow-visible"
                >
                  <defs>
                    <linearGradient id="rustAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#c2410c" stopOpacity="0.35" />
                      <stop offset="60%" stopColor="#ea580c" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#c2410c" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="rustStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#c2410c" />
                      <stop offset="50%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="currentColor" className="text-neutral-200 dark:text-zinc-800" strokeDasharray="3 3" strokeWidth="0.8" />
                  <line x1={paddingX} y1={paddingY + plotHeight / 2} x2={svgWidth - paddingX} y2={paddingY + plotHeight / 2} stroke="currentColor" className="text-neutral-200 dark:text-zinc-800" strokeDasharray="3 3" strokeWidth="0.8" />
                  <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="currentColor" className="text-neutral-200 dark:text-zinc-800" strokeWidth="1" />

                  {/* Shaded Area under Curve */}
                  {svgAreaPath && (
                    <motion.path
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6 }}
                      d={svgAreaPath}
                      fill="url(#rustAreaGradient)"
                    />
                  )}

                  {/* Trajectory Stroke Line */}
                  {svgLinePath && (
                    <motion.path
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      d={svgLinePath}
                      fill="none"
                      stroke="url(#rustStrokeGradient)"
                      strokeWidth={monthReports.length === 1 ? "1.5" : "2.5"}
                      strokeDasharray={monthReports.length === 1 ? "4 4" : "none"}
                    />
                  )}

                  {/* Interactive Milestone Nodes */}
                  {chartCoords.map((pt, i) => (
                    <g key={pt.report.id || i} className="cursor-pointer" onClick={() => {
                      setSelectedJournalDate(pt.report.date);
                      setActiveTab('daily_journal');
                    }}>
                      {/* Pulsing ring for single report or best day */}
                      {(monthReports.length === 1 || pt.report.date === bestDay?.date) && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="10"
                          fill="#ea580c"
                          opacity="0.25"
                          className="animate-ping"
                        />
                      )}

                      {/* Outer Ring */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#c2410c"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-transform hover:scale-125"
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />

                      {/* Day Label on X Axis */}
                      <text
                        x={pt.x}
                        y={svgHeight - 6}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="600"
                        className="fill-neutral-600 dark:fill-zinc-400 font-mono"
                      >
                        {pt.report.date.split('-')[2]}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Floating Interactive Tooltip or Active Milestone Callout */}
                <div className="flex items-center justify-between px-2 pt-1 border-t border-neutral-100 dark:border-zinc-800 text-[11px]">
                  {hoveredPoint ? (
                    <div className="flex items-center justify-between w-full font-display">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {hoveredPoint.report.date} ({hoveredPoint.report.reportNumber || 'Z-Report'})
                      </span>
                      <span className="font-bold text-rust-700 dark:text-rust-400">
                        {shopProfile.currency}{parseFloat(hoveredPoint.report.netSales).toLocaleString()} • {hoveredPoint.report.totalItemsSold} units
                      </span>
                    </div>
                  ) : monthReports.length === 1 ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-neutral-600 dark:text-zinc-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        First Z-Report Captured ({monthReports[0].date})
                      </span>
                      <span className="font-display font-bold text-rust-700 dark:text-rust-400">
                        {shopProfile.currency}{parseFloat(monthReports[0].netSales).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full text-neutral-500 dark:text-zinc-400 font-mono text-[10px]">
                      <span>Peak: {shopProfile.currency}{maxDaySales.toLocaleString()}</span>
                      <span>Avg: {shopProfile.currency}{avgDailySales.toLocaleString()}/day</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Daily Volume Bars Mode */}
        {chartMode === 'bars' && (
          <div className="pt-3 pb-1">
            <div className="h-36 flex items-end justify-between gap-1 border-b border-neutral-100 dark:border-zinc-800 px-1">
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dayStr = `${activeMonth}-${String(dayNum).padStart(2, '0')}`;
                const report = monthReports.find(r => r.date === dayStr);
                const heightPercent = report ? Math.max(16, Math.round((parseFloat(report.netSales) / maxDaySales) * 100)) : 0;

                return (
                  <div 
                    key={dayNum} 
                    className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    onClick={() => {
                      if (report) {
                        setSelectedJournalDate(dayStr);
                        setActiveTab('daily_journal');
                      }
                    }}
                  >
                    {report && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 z-20 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[9px] font-display font-bold py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap shadow-lg">
                        {shopProfile.currency}{parseFloat(report.netSales).toLocaleString()} ({report.totalItemsSold}u)
                      </div>
                    )}

                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ duration: 0.4, delay: i * 0.01 }}
                      className={`w-full rounded-t-sm transition-all ${
                        report 
                          ? 'bg-gradient-to-t from-rust-700 to-copper-500 shadow-spray-rust group-hover:from-rust-600 group-hover:to-copper-400' 
                          : 'bg-neutral-100 dark:bg-zinc-850 h-1 rounded-full'
                      }`}
                    />
                    <span className={`text-[8px] mt-1 font-mono ${report ? 'text-rust-700 dark:text-rust-400 font-extrabold' : 'text-neutral-300 dark:text-zinc-700'}`}>
                      {dayNum % 4 === 1 || dayNum === daysInMonth || report ? dayNum : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* KPI Performance Highlights Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Units Sold
            </span>
            <Package className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
          </div>
          <p className="font-display text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
            {totalUnits.toLocaleString()}
          </p>
          <span className="text-[10px] text-neutral-500 dark:text-zinc-400 block">
            Across {displayedRankedProducts.length} unique catalog items
          </span>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
              Daily Average (AOV)
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-copper-600 dark:text-copper-400" />
          </div>
          <p className="font-display text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
            {shopProfile.currency}{avgDailySales.toLocaleString()}
          </p>
          {bestDay && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block truncate">
              Peak: {shopProfile.currency}{parseFloat(bestDay.netSales).toLocaleString()} ({bestDay.date.split('-')[2]}th)
            </span>
          )}
        </motion.div>
      </div>

      {/* Payment Collections Distribution Gauge */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Payment Collection Split
          </h3>
          <span className="text-[10px] font-mono text-neutral-500 dark:text-zinc-400">
            {shopProfile.currency}{totalPayments.toLocaleString()} Collected
          </span>
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="w-full bg-neutral-100 dark:bg-zinc-800 rounded-full h-2.5 flex overflow-hidden p-0.5 gap-0.5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${upiPercent}%` }}
            transition={{ duration: 0.6 }}
            className="bg-indigo-500 rounded-full h-full" 
            title={`UPI: ${upiPercent}%`}
          />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${cashPercent}%` }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-emerald-500 rounded-full h-full" 
            title={`Cash: ${cashPercent}%`}
          />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${cardPercent}%` }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-rust-500 rounded-full h-full" 
            title={`Card: ${cardPercent}%`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-1 pt-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <div>
              <span className="text-neutral-500 dark:text-zinc-400 text-[10px] block">UPI / QR</span>
              <span className="font-display font-bold text-neutral-900 dark:text-neutral-100">{upiPercent}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <span className="text-neutral-500 dark:text-zinc-400 text-[10px] block">Cash</span>
              <span className="font-display font-bold text-neutral-900 dark:text-neutral-100">{cashPercent}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rust-500 shrink-0" />
            <div>
              <span className="text-neutral-500 dark:text-zinc-400 text-[10px] block">Card</span>
              <span className="font-display font-bold text-neutral-900 dark:text-neutral-100">{cardPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 🏆 Leaderboard: Most Sold Products with Cool Motion Animations */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-rust-600 dark:text-rust-400" />
            <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight">
              Most Sold Products
            </h3>
          </div>

          {/* Toggle between By Quantity vs By Revenue */}
          <div className="flex items-center bg-neutral-100 dark:bg-zinc-800 rounded-xl p-0.5 text-[10px]">
            <button
              onClick={() => setRankingMode('quantity')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                rankingMode === 'quantity'
                  ? 'bg-gradient-to-r from-rust-700 to-copper-600 text-white shadow-spray-rust'
                  : 'text-neutral-600 dark:text-zinc-400 hover:text-neutral-900'
              }`}
            >
              By Units Sold
            </button>
            <button
              onClick={() => setRankingMode('revenue')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                rankingMode === 'revenue'
                  ? 'bg-gradient-to-r from-rust-700 to-copper-600 text-white shadow-spray-rust'
                  : 'text-neutral-600 dark:text-zinc-400 hover:text-neutral-900'
              }`}
            >
              By Revenue
            </button>
          </div>
        </div>

        {displayedRankedProducts.length === 0 ? (
          <div className="text-center py-6 text-neutral-400 dark:text-zinc-500 text-xs">
            No itemized products captured in this month yet.
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            <AnimatePresence mode="wait">
              {displayedRankedProducts.slice(0, 8).map((prod, idx) => {
                const maxMetric = rankingMode === 'quantity' 
                  ? displayedRankedProducts[0].quantity 
                  : displayedRankedProducts[0].revenue;
                const currMetric = rankingMode === 'quantity' ? prod.quantity : prod.revenue;
                const percent = maxMetric > 0 ? Math.round((currMetric / maxMetric) * 100) : 0;

                // Rank Medallion Styling
                const getMedalColor = (rank) => {
                  if (rank === 0) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
                  if (rank === 1) return 'bg-neutral-200 dark:bg-zinc-700 text-neutral-700 dark:text-zinc-200 border-neutral-300';
                  if (rank === 2) return 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
                  return 'bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 border-transparent';
                };

                return (
                  <motion.div 
                    key={prod.productName}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className="p-3 rounded-2xl bg-neutral-50/80 dark:bg-zinc-850/60 border border-neutral-100 dark:border-zinc-800/80 hover:border-rust-500/30 dark:hover:border-rust-500/30 transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        {/* Medallion */}
                        <span className={`w-6 h-6 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center shrink-0 border ${getMedalColor(idx)}`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>

                        <div className="min-w-0">
                          <span className="font-display font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate block">
                            {prod.productName}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-mono text-neutral-500 dark:text-zinc-400 bg-neutral-200/60 dark:bg-zinc-800 px-1.5 py-0.2 rounded shrink-0">
                              HSN {prod.hsnCode}
                            </span>
                            <span className="text-[9px] text-neutral-400 dark:text-zinc-500 font-sans">
                              @{shopProfile.currency}{prod.unitPrice}/{prod.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Prominent Quantity & Revenue Badges */}
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 font-display font-extrabold text-xs text-rust-700 dark:text-rust-400 bg-rust-500/10 dark:bg-rust-950/50 px-2 py-0.5 rounded-md border border-rust-500/20">
                          <Flame className="w-3 h-3 text-rust-600 dark:text-rust-400" />
                          {prod.quantity} {prod.unit} sold
                        </span>
                        <span className="block font-display font-bold text-[11px] text-neutral-900 dark:text-neutral-100 mt-1">
                          {shopProfile.currency}{prod.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Animated Progress Bar */}
                    <div className="w-full bg-neutral-200/60 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        className={`h-full rounded-full ${
                          idx === 0 
                            ? 'bg-gradient-to-r from-rust-700 to-copper-500 shadow-spray-rust' 
                            : 'bg-neutral-800 dark:bg-zinc-300'
                        }`}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* HSN Tax Breakdown (GSTR-1 Tax Compliance) */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight">
            HSN Tax Breakdown (GSTR-1 Ready)
          </h3>
          <span className="text-[10px] font-mono text-neutral-600 dark:text-zinc-400">
            {hsnList.length} Active HSN Codes
          </span>
        </div>

        <div className="space-y-2">
          {hsnList.map(item => (
            <div 
              key={item.hsnCode}
              className="p-3 rounded-2xl bg-neutral-50 dark:bg-zinc-850/60 border border-neutral-100 dark:border-zinc-800/60 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 bg-neutral-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                  HSN {item.hsnCode}
                </span>
                <span className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100">
                  {shopProfile.currency}{item.taxableValue.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-neutral-600 dark:text-zinc-400 truncate">
                {Array.from(item.productNames).join(', ')}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-zinc-800/80 text-[10px] text-neutral-500 dark:text-zinc-400">
                <span>Units Sold: {item.quantity}</span>
                <span>GST Rate: {item.taxRate}%</span>
                <span>GST Amount: {shopProfile.currency}{Math.round(item.taxableValue * (item.taxRate / 100)).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
