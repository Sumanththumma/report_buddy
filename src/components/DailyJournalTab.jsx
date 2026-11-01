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
  Printer
} from 'lucide-react';

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
    const cur = new Date(selectedJournalDate);
    cur.setDate(cur.getDate() + days);
    setSelectedJournalDate(cur.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setSelectedJournalDate(new Date().toISOString().split('T')[0]);
  };

  const currentReport = zReports.find(r => r.date === selectedJournalDate);

  const dateObj = new Date(selectedJournalDate + 'T00:00:00');
  const formattedDisplay = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const isToday = selectedJournalDate === new Date().toISOString().split('T')[0];

  const dateStrip = [-3, -2, -1, 0, 1, 2, 3].map(offset => {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().split('T')[0];
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
            <p className="text-[11px] font-medium text-neutral-400 dark:text-zinc-500 mt-0.5">
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
              <span className={`text-[8.5px] uppercase ${item.isSelected ? 'opacity-80' : 'text-neutral-400 dark:text-zinc-500'}`}>
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
                <span className="text-[9px] font-bold text-neutral-400 uppercase">Cash</span>
                <p className="font-display font-bold text-neutral-900 dark:text-zinc-100 mt-0.5">
                  {shopProfile.currency}{(currentReport.paymentBreakdown.cash || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-100 dark:border-zinc-700/60">
                <span className="text-[9px] font-bold text-neutral-400 uppercase">UPI / QR</span>
                <p className="font-display font-bold text-neutral-900 dark:text-zinc-100 mt-0.5">
                  {shopProfile.currency}{(currentReport.paymentBreakdown.upi || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-neutral-50 dark:bg-zinc-800/60 border border-neutral-100 dark:border-zinc-700/60">
                <span className="text-[9px] font-bold text-neutral-400 uppercase">Card (POS)</span>
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
                <p className="text-[10px] text-neutral-400 dark:text-zinc-500">Products sold on this date</p>
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
                    <div className="flex items-center space-x-2 text-[10px] text-neutral-400 dark:text-zinc-500 mt-0.5">
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

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-zinc-800/80 text-xs">
              <span className="text-[10px] text-neutral-400 dark:text-zinc-500">
                Logged: {new Date(currentReport.uploadedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={() => {
                  if (confirm(`Delete Z-Report for ${selectedJournalDate}?`)) {
                    deleteZReport(currentReport.id);
                  }
                }}
                className="text-[10px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-neutral-200/80 dark:border-zinc-800/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-400 flex items-center justify-center mx-auto">
            <Calendar className="w-5 h-5 stroke-[1.8]" />
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
              No EOD Report for {formattedDisplay}
            </h3>
            <p className="text-xs text-neutral-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">
              Scan today's cash register Z-Report to automatically store itemized sales.
            </p>
          </div>

          <div className="pt-2 max-w-xs mx-auto">
            <button
              onClick={() => setActiveTab('ai_scan')}
              className="w-full py-2.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-display font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              Scan Z-Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
