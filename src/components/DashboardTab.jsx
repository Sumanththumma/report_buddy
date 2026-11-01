import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  TrendingUp, 
  Receipt, 
  Package, 
  Camera, 
  CalendarDays, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export const DashboardTab = ({ onOpenPersonalization }) => {
  const { 
    zReports, 
    products, 
    shopProfile, 
    setActiveTab, 
    setSelectedJournalDate 
  } = useApp();

  const { user } = useAuth();
  const { theme } = useTheme();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayReport = zReports.find(r => r.date === todayStr);

  // Month calculation
  const currentMonthStr = todayStr.substring(0, 7);
  const currentMonthReports = zReports.filter(r => r.date.startsWith(currentMonthStr));
  const currentMonthRevenue = currentMonthReports.reduce((acc, r) => acc + (r.netSales || 0), 0);
  const currentMonthUnits = currentMonthReports.reduce((acc, r) => acc + (r.totalItemsSold || 0), 0);

  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.owner_name || 'Retailer';
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Personalized Greeting */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg tracking-tight text-neutral-900 dark:text-neutral-100">
              {getGreeting()}
            </h2>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-subtle" />
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-zinc-400 font-medium tracking-tight mt-0.5">
            {user?.tagline || 'End-of-day sales overview & reporting'}
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-display font-semibold text-neutral-400 dark:text-zinc-500">
            {formattedToday}
          </span>
        </div>
      </div>

      {/* Hero Financial Metric Card with subtle sprayed rust & copper airbrush glow */}
      <div className="rounded-3xl p-5 bg-gradient-to-b from-neutral-900 via-zinc-900 to-neutral-950 text-white border border-rust-500/25 dark:border-rust-500/30 shadow-2xl shadow-rust-950/30 relative overflow-hidden">
        {/* Sprayed rust & copper ambient spots */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-rust-600/25 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-copper-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="text-[11px] font-medium tracking-wider uppercase text-rust-300/90">
              {todayReport ? "Verified Daily Revenue" : "Month-to-Date Revenue"}
            </span>
            <span className="text-[10px] font-display font-semibold px-2.5 py-0.5 rounded-full bg-rust-500/15 text-rust-300 border border-rust-500/30">
              {todayReport ? 'Shift Closed' : 'EOD Active'}
            </span>
          </div>

          <div className="flex items-baseline space-x-1">
            <span className="font-display text-4xl font-extrabold tracking-tight text-white">
              {shopProfile.currency} {
                todayReport 
                  ? todayReport.netSales.toLocaleString() 
                  : currentMonthRevenue.toLocaleString()
              }
            </span>
          </div>

          {todayReport ? (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{todayReport.reportNumber || 'Z-Report'} logged ({todayReport.totalItemsSold} units sold)</span>
            </div>
          ) : (
            <p className="text-[11px] text-neutral-400 font-medium">
              Snap photo of closing Z-Report at store shut.
            </p>
          )}

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
            <div className="py-1">
              <span className="text-[10px] text-neutral-400 uppercase font-medium">Reported</span>
              <p className="font-display text-sm font-bold text-white mt-0.5">{currentMonthReports.length} days</p>
            </div>
            <div className="py-1 border-x border-white/10">
              <span className="text-[10px] text-neutral-400 uppercase font-medium">Units Sold</span>
              <p className="font-display text-sm font-bold text-white mt-0.5">{currentMonthUnits}</p>
            </div>
            <div className="py-1">
              <span className="text-[10px] text-neutral-400 uppercase font-medium">Catalog</span>
              <p className="font-display text-sm font-bold text-white mt-0.5">{products.length} prods</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main EOD Scanner Trigger Card (Understated, Sleek Apple Card) */}
      <div 
        onClick={() => setActiveTab('ai_scan')}
        className="cursor-pointer bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800/80 hover:border-rust-500/40 dark:hover:border-rust-500/40 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:shadow-spray-rust group"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rust-700 to-copper-600 text-white flex items-center justify-center shrink-0 shadow-spray-rust group-hover:scale-105 transition-transform">
            <Camera className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-xs tracking-tight text-neutral-900 dark:text-neutral-100">
                Scan Daily Z-Report
              </h3>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-rust-500/10 dark:bg-rust-950/50 text-rust-700 dark:text-rust-300 border border-rust-500/25">
                AI Vision
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-zinc-400 truncate mt-0.5">
              Auto-extract items, quantities, and HSN codes from paper bill
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-zinc-500 group-hover:text-rust-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Navigation Shortcuts */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setActiveTab('daily_journal')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800/80 hover:border-neutral-400 dark:hover:border-zinc-600 transition-all text-left shadow-2xs group"
        >
          <div className="flex items-center justify-between">
            <CalendarDays className="w-4 h-4 text-neutral-700 dark:text-zinc-300" />
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-white transition-colors" />
          </div>
          <span className="block font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 mt-2">
            Daily Journal
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-zinc-500">
            Browse by date
          </span>
        </button>

        <button
          onClick={() => setActiveTab('monthly_analytics')}
          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200/80 dark:border-zinc-800/80 hover:border-neutral-400 dark:hover:border-zinc-600 transition-all text-left shadow-2xs group"
        >
          <div className="flex items-center justify-between">
            <BarChart3 className="w-4 h-4 text-neutral-700 dark:text-zinc-300" />
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-white transition-colors" />
          </div>
          <span className="block font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 mt-2">
            Monthly Report
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-zinc-500">
            Analytics & Tax
          </span>
        </button>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight">
            Recent Z-Reports
          </h3>
          <button 
            onClick={() => setActiveTab('daily_journal')}
            className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center"
          >
            View all
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        <div className="space-y-2">
          {zReports.slice(0, 3).map((report) => (
            <div 
              key={report.id}
              onClick={() => {
                setSelectedJournalDate(report.date);
                setActiveTab('daily_journal');
              }}
              className="cursor-pointer flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-zinc-850/60 border border-neutral-100 dark:border-zinc-800/60 hover:bg-neutral-100/70 dark:hover:bg-zinc-800 transition-all"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center space-x-1.5">
                  <span className="font-display font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                    {report.date}
                  </span>
                  <span className="text-[9px] font-mono text-neutral-500 dark:text-zinc-400 bg-neutral-200/60 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                    {report.reportNumber || 'Z-Report'}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-0.5">
                  {report.totalItemsSold} items • Closed {report.closingTime || '21:30'}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="font-display font-extrabold text-xs text-neutral-900 dark:text-neutral-100 block">
                  {shopProfile.currency}{report.netSales?.toLocaleString()}
                </span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
