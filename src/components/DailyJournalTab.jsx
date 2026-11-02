import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Camera, 
  Trash2,
  Clock,
  Printer,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

// Robust local date formatting helpers (prevents UTC timezone shift)
const formatLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0); // Noon local time avoids midnight rollover
  }
  return new Date();
};

export const DailyJournalTab = () => {
  const { 
    zReports, 
    selectedJournalDate, 
    setSelectedJournalDate, 
    setActiveTab, 
    shopProfile, 
    deleteZReport 
  } = useApp();

  const changeDate = (days) => {
    const cur = parseLocalDate(selectedJournalDate);
    cur.setDate(cur.getDate() + days);
    setSelectedJournalDate(formatLocalDate(cur));
  };

  const setToday = () => {
    setSelectedJournalDate(formatLocalDate(new Date()));
  };

  const currentReport = zReports.find(r => r.date === selectedJournalDate);

  const curDateObj = parseLocalDate(selectedJournalDate);
  const formattedDisplay = curDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const todayStr = formatLocalDate(new Date());
  const isToday = selectedJournalDate === todayStr;

  const dateStrip = [-3, -2, -1, 0, 1, 2, 3].map(offset => {
    const d = new Date(curDateObj);
    d.setDate(d.getDate() + offset);
    const dateStr = formatLocalDate(d);
    const hasReport = zReports.some(r => r.date === dateStr);
    return {
      dateStr,
      dayNum: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      isSelected: dateStr === selectedJournalDate,
      hasReport
    };
  });

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Date Navigation Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-3.5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="w-7 h-7 rounded-xl bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 flex items-center justify-center transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-zinc-400" />
              <input
                type="date"
                value={selectedJournalDate}
                onChange={(e) => setSelectedJournalDate(e.target.value)}
                className="font-display text-xs font-bold text-neutral-900 dark:text-neutral-100 bg-transparent border-none outline-none cursor-pointer"
              />
            </div>
            <p className="text-[11px] font-medium text-neutral-600 dark:text-zinc-400 mt-0.5">
              {formattedDisplay} {isToday && <span className="text-neutral-900 dark:text-zinc-200 font-bold">(Today)</span>}
            </p>
          </div>

          <div className="flex items-center space-x-1">
            {!isToday && (
              <button
                onClick={setToday}
                className="text-[10px] font-display font-semibold text-neutral-700 dark:text-zinc-300 bg-neutral-100 dark:bg-zinc-800 px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Today
              </button>
            )}
            <button
              onClick={() => changeDate(1)}
              className="w-7 h-7 rounded-xl bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 flex items-center justify-center transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Apple Calendar Style Day Scrubber */}
        <div className="flex justify-between items-center pt-1 border-t border-neutral-100 dark:border-zinc-800/80">
          {dateStrip.map(item => (
            <button
              key={item.dateStr}
              onClick={() => setSelectedJournalDate(item.dateStr)}
              className={`flex flex-col items-center py-1.5 px-2.5 rounded-xl transition-all duration-150 ${
                item.isSelected
                  ? 'bg-gradient-to-tr from-rust-700 to-copper-600 text-white font-bold shadow-spray-rust'
                  : 'text-neutral-500 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className={`text-[8.5px] uppercase ${item.isSelected ? 'opacity-80' : 'text-neutral-600 dark:text-zinc-400'}`}>
                {item.dayName}
              </span>
              <span className="font-display text-xs font-bold mt-0.5">
                {item.dayNum}
              </span>
              <span className={`w-1 h-1 rounded-full mt-1 ${
                item.isSelected 
                  ? 'bg-emerald-400 dark:bg-emerald-600' 
                  : item.hasReport 
                    ? 'bg-emerald-500' 
                    : 'bg-transparent'
              }`} />
            </button>
          ))}
        </div>
      </div>

      {/* Selected Day Content */}
      {currentReport ? (
        <div className="space-y-3">
          {/* Day Summary Card with subtle sprayed rust atmosphere */}
          <div className="bg-gradient-to-b from-neutral-900 via-zinc-900 to-black text-white rounded-3xl p-5 border border-rust-500/25 dark:border-rust-500/30 shadow-xl shadow-rust-950/20 relative overflow-hidden space-y-3">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-rust-600/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-display font-semibold border border-white/10">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {currentReport.reportNumber || 'Z-Report'} Verified
              </span>
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Closed: {currentReport.closingTime || '21:30'}
              </span>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Net Daily Revenue</p>
              <div className="font-display text-3xl font-extrabold tracking-tight mt-0.5 text-white">
                {shopProfile.currency}{currentReport.netSales?.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/10 text-center">
              <div>
                <p className="text-[10px] text-neutral-400 uppercase font-medium">Units</p>
                <p className="font-display text-sm font-bold text-white mt-0.5">{currentReport.totalItemsSold || 0}</p>
              </div>
              <div className="border-x border-white/10">
                <p className="text-[10px] text-neutral-400 uppercase font-medium">GST Tax</p>
                <p className="font-display text-sm font-bold text-white mt-0.5">{shopProfile.currency}{currentReport.taxTotal?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 uppercase font-medium">Discount</p>
                <p className="font-display text-sm font-bold text-white mt-0.5">{shopProfile.currency}{currentReport.discount || 0}</p>
              </div>
            </div>
          </div>

          {/* Payment Chips */}
          {currentReport.paymentBreakdown && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-neutral-200/80 dark:border-zinc-800/80 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-100 dark:border-zinc-700/60">
                <span className="text-[9px] font-bold text-neutral-600 dark:text-zinc-400 uppercase">Cash</span>
                <p className="font-display font-bold text-neutral-900 dark:text-zinc-100 mt-0.5">
                  {shopProfile.currency}{(currentReport.paymentBreakdown.cash || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-100 dark:border-zinc-700/60">
                <span className="text-[9px] font-bold text-neutral-600 dark:text-zinc-400 uppercase">UPI / QR</span>
                <p className="font-display font-bold text-neutral-900 dark:text-zinc-100 mt-0.5">
                  {shopProfile.currency}{(currentReport.paymentBreakdown.upi || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-100 dark:border-zinc-700/60">
                <span className="text-[9px] font-bold text-neutral-600 dark:text-zinc-400 uppercase">Card (POS)</span>
                <p className="font-display font-bold text-neutral-900 dark:text-zinc-100 mt-0.5">
                  {shopProfile.currency}{(currentReport.paymentBreakdown.card || 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Itemized Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 tracking-tight">
                  Itemized Sales ({currentReport.items?.length || 0} Products)
                </h3>
                <p className="text-[10px] text-neutral-600 dark:text-zinc-400">Products sold on this date</p>
              </div>
              <button
                onClick={() => window.print()}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-zinc-200"
                title="Print Report"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {currentReport.items?.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-zinc-850/60 border border-neutral-100 dark:border-zinc-800/60 text-xs flex items-center justify-between"
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">{item.productName}</span>
                      <span className="text-[9px] font-mono text-neutral-500 dark:text-zinc-400 bg-neutral-200/70 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                        HSN: {item.hsnCode || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-neutral-600 dark:text-zinc-400 mt-0.5">
                      <span className="font-medium text-neutral-700 dark:text-zinc-300">{item.quantity} {item.unit || 'pcs'} sold</span>
                      <span>•</span>
                      <span>Rate: {shopProfile.currency}{item.unitPrice}</span>
                      <span>•</span>
                      <span>GST: {item.taxRate ?? 18}%</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-display font-bold text-neutral-900 dark:text-neutral-100 text-xs block">
                      {shopProfile.currency}{item.lineTotal?.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions: Re-upload and Delete */}
            <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-zinc-400">
                <span className="text-[10px]">
                  Logged: {new Date(currentReport.uploadedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active Record
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setActiveTab('ai_scan')}
                  className="py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-neutral-800 dark:text-zinc-200 font-display font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-200/80 dark:border-zinc-700 active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-rust-600 dark:text-rust-400" />
                  Re-upload Report
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Permanently delete the Z-Report for ${formattedDisplay}?\n\nThis will remove the report and its line items. You will be able to re-upload a new scan for this date anytime.`)) {
                      deleteZReport(currentReport.id || selectedJournalDate);
                    }
                  }}
                  className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-display font-semibold text-xs flex items-center justify-center gap-1.5 transition-all border border-red-200 dark:border-red-800/50 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-neutral-200/80 dark:border-zinc-800/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rust-50 dark:bg-rust-950/60 border border-rust-200 dark:border-rust-800/60 text-rust-600 dark:text-rust-400 flex items-center justify-center mx-auto shadow-spray-rust">
            <Calendar className="w-5 h-5 stroke-[1.8]" />
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
              No Report Logged for {formattedDisplay}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Click below to scan or upload the cash register Z-Report specifically for this date.
            </p>
          </div>

          <div className="pt-2 max-w-xs mx-auto">
            <button
              onClick={() => setActiveTab('ai_scan')}
              className="w-full py-2.5 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-semibold text-xs flex items-center justify-center gap-2 shadow-spray-rust transition-all active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              Upload Report for {curDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
