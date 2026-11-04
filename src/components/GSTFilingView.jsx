import React, { useState } from 'react';
import { 
  Building2, 
  Share2, 
  Download, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Coins, 
  Receipt, 
  TrendingUp, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Clock
} from 'lucide-react';
import { 
  calculateMonthlyGST, 
  getGSTR1DueDate, 
  generateWhatsAppCAMessage, 
  downloadGSTR1CSV,
  getStateFromGstin 
} from '../utils/gstCalculations';

export const GSTFilingView = ({ 
  monthReports = [], 
  selectedMonth = '', 
  shopProfile = {}, 
  products = [], 
  onUpdateProductHsn 
}) => {
  const [activeTableTab, setActiveTableTab] = useState('table12'); // 'table12' | 'table7'
  const [editingItemHsn, setEditingItemHsn] = useState(null);
  const [newHsnInput, setNewHsnInput] = useState('');
  const [newTaxRateInput, setNewTaxRateInput] = useState('5');

  const gstData = calculateMonthlyGST(monthReports, shopProfile);
  const currency = shopProfile.currency || '₹';
  const dueDate = getGSTR1DueDate(selectedMonth);
  const placeOfSupply = getStateFromGstin(shopProfile.gstin);

  const monthDisplay = selectedMonth 
    ? new Date(`${selectedMonth}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : 'Selected Month';

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppCAMessage(selectedMonth, gstData, shopProfile);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadCSV = () => {
    downloadGSTR1CSV(selectedMonth, gstData, shopProfile);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveHsnFix = () => {
    if (!editingItemHsn || !newHsnInput.trim()) return;
    if (onUpdateProductHsn) {
      onUpdateProductHsn(editingItemHsn.productName, newHsnInput.trim(), parseFloat(newTaxRateInput) || 5);
    }
    setEditingItemHsn(null);
    setNewHsnInput('');
  };

  if (!monthReports || monthReports.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-neutral-200/80 dark:border-zinc-800/80 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rust-50 dark:bg-rust-950/60 border border-rust-200 dark:border-rust-800/60 text-rust-600 dark:text-rust-400 flex items-center justify-center mx-auto shadow-spray-rust">
          <Building2 className="w-5 h-5 stroke-[1.8]" />
        </div>
        <div>
          <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
            No GST Data for {monthDisplay}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Log or upload daily sales Z-Reports in the Daily Journal for this month to generate compliant GSTR-1 tables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in print:p-0">
      {/* Statutory Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-neutral-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                GSTR-1 Tax Filing Period
              </span>
            </div>
            <h2 className="font-display font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 mt-0.5">
              {monthDisplay} Compliance Summary
            </h2>
            <p className="text-[11px] text-neutral-500 dark:text-zinc-400">
              {shopProfile.name} • GSTIN: <span className="font-mono font-semibold text-neutral-700 dark:text-zinc-300">{shopProfile.gstin || 'Unspecified'}</span> • POS: {placeOfSupply}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-rust-50 dark:bg-rust-950/60 border border-rust-200/80 dark:border-rust-800/60 text-right">
              <div className="flex items-center gap-1 text-[10px] text-rust-600 dark:text-rust-400 font-medium">
                <Clock className="w-3 h-3" /> Due Date
              </div>
              <p className="text-xs font-display font-bold text-rust-700 dark:text-rust-300">
                {dueDate}
              </p>
            </div>

            {gstData.healthCheck.isCompliant ? (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                HSN Ready
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {gstData.healthCheck.missingHsnCount} Needs Review
              </div>
            )}
          </div>
        </div>

        {/* Action Bar: WhatsApp, PDF, CSV */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 print:hidden">
          <button
            onClick={handleShareWhatsApp}
            className="py-2.5 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-display font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            title="Send pre-filled GSTR-1 summary to CA on WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share with CA (WhatsApp)
          </button>

          <button
            onClick={handleDownloadCSV}
            className="py-2.5 px-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-neutral-900 text-white font-display font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            title="Download official GSTR-1 Table 12 & Table 7 CSV for GST Portal"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Download GSTR-1 CSV
          </button>

          <button
            onClick={handlePrint}
            className="py-2.5 px-3.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-neutral-800 dark:text-zinc-200 font-display font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-200/80 dark:border-zinc-700 transition-all active:scale-95"
            title="Print or Save as PDF for your accountant"
          >
            <Printer className="w-3.5 h-3.5" />
            Print CA Report (PDF)
          </button>
        </div>
      </div>

      {/* Compliance Health Check Alert (if missing HSN codes exist) */}
      {!gstData.healthCheck.isCompliant && (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in print:hidden">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-display font-bold text-xs text-amber-900 dark:text-amber-200">
                Action Recommended: {gstData.healthCheck.missingHsnCount} Line Item(s) with Unspecified HSN
              </h4>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Indian GST requires 4-digit HSN codes for Table 12. Standard code for cotton fabric is <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">5208</code>, apparel <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">6204</code>.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const first = gstData.healthCheck.missingItems[0];
              if (first) {
                setEditingItemHsn(first);
                setNewHsnInput('');
              }
            }}
            className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-display font-semibold text-xs shrink-0 self-start sm:self-auto transition-colors"
          >
            Fix HSN Codes
          </button>
        </div>
      )}

      {/* 4 Hero Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-3.5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-zinc-400 block">
            Gross Billing Turnover
          </span>
          <p className="font-display font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">
            {currency}{gstData.turnover.grossSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-neutral-600 dark:text-zinc-400 block">
            Total MRP collections
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-3.5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-zinc-400 block">
            Net Taxable Value
          </span>
          <p className="font-display font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">
            {currency}{gstData.turnover.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-neutral-600 dark:text-zinc-400 block">
            Pre-tax taxable supply
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-3.5 border border-rust-200/80 dark:border-rust-800/60 bg-gradient-to-br from-rust-50/40 via-transparent to-transparent dark:from-rust-950/20 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-rust-700 dark:text-rust-300 block">
            Total GST Liability
          </span>
          <p className="font-display font-bold text-base sm:text-lg text-rust-700 dark:text-rust-300">
            {currency}{gstData.turnover.totalGST.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-rust-700 dark:text-rust-300/80 block">
            CGST {currency}{gstData.turnover.cgst.toFixed(2)} + SGST {currency}{gstData.turnover.sgst.toFixed(2)}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-3.5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-neutral-500 dark:text-zinc-400 block">
            Total Units Sold
          </span>
          <p className="font-display font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">
            {gstData.turnover.totalItemsSold.toLocaleString()}
          </p>
          <span className="text-[10px] text-neutral-600 dark:text-zinc-400 block">
            Across {gstData.table12.length} HSN categories
          </span>
        </div>
      </div>

      {/* Tender Breakdown Reconciliation Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-neutral-500" />
            Tender / Payment Reconciliation
          </h3>
          <span className="text-[11px] font-mono text-neutral-500">
            Total: {currency}{gstData.tenders.totalTendered.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-zinc-850/60 border border-neutral-100 dark:border-zinc-800 text-center">
            <span className="text-[10px] text-neutral-500 block uppercase font-medium">Cash</span>
            <p className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 mt-0.5">
              {currency}{gstData.tenders.cash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-zinc-850/60 border border-neutral-100 dark:border-zinc-800 text-center">
            <span className="text-[10px] text-neutral-500 block uppercase font-medium">UPI / QR</span>
            <p className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 mt-0.5">
              {currency}{gstData.tenders.upi.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-zinc-850/60 border border-neutral-100 dark:border-zinc-800 text-center">
            <span className="text-[10px] text-neutral-500 block uppercase font-medium">Card / POS</span>
            <p className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 mt-0.5">
              {currency}{gstData.tenders.card.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Table Switcher (Table 12 HSN vs Table 7 Slabs) */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200/80 dark:border-zinc-700">
            <button
              onClick={() => setActiveTableTab('table12')}
              className={`py-1.5 px-3 rounded-xl font-display font-bold text-xs transition-all ${
                activeTableTab === 'table12'
                  ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-zinc-200'
              }`}
            >
              Table 12: HSN Summary ({gstData.table12.length})
            </button>
            <button
              onClick={() => setActiveTableTab('table7')}
              className={`py-1.5 px-3 rounded-xl font-display font-bold text-xs transition-all ${
                activeTableTab === 'table7'
                  ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-zinc-200'
              }`}
            >
              Table 7: Rate Slabs ({gstData.table7.length})
            </button>
          </div>

          <span className="text-[11px] text-neutral-600 dark:text-zinc-400 hidden sm:inline">
            Intra-State B2C Supplies
          </span>
        </div>

        {/* Table 12: HSN Outward Supplies */}
        {activeTableTab === 'table12' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200/80 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 font-display font-semibold">
                  <th className="py-2.5 px-3">HSN Code</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">UQC (Unit)</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Gross Value</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800/60 font-sans">
                {gstData.table12.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-850/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {row.isMissingHsn ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px]">
                          999999
                        </span>
                      ) : (
                        row.hsnCode
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-800 dark:text-zinc-200 font-medium max-w-[150px] truncate" title={row.description}>
                      {row.description}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500 text-[11px] font-mono">
                      {row.uqc}
                    </td>
                    <td className="py-2.5 px-3 text-right font-display font-semibold text-neutral-900 dark:text-neutral-100">
                      {row.totalQty}
                    </td>
                    <td className="py-2.5 px-3 text-right font-display font-semibold text-neutral-900 dark:text-neutral-100">
                      {currency}{row.totalValue.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-display font-semibold text-neutral-900 dark:text-neutral-100">
                      {currency}{row.taxableValue.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-neutral-600 dark:text-zinc-400">
                      {row.rate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-800 dark:text-zinc-200">
                      {currency}{row.cgst.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-800 dark:text-zinc-200">
                      {currency}{row.sgst.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-300 dark:border-zinc-700 font-display font-bold text-neutral-900 dark:text-neutral-100">
                  <td className="py-3 px-3" colSpan="3">Total Outward Supplies</td>
                  <td className="py-3 px-3 text-right">{gstData.turnover.totalItemsSold}</td>
                  <td className="py-3 px-3 text-right">{currency}{gstData.turnover.grossSales.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">{currency}{gstData.turnover.taxableValue.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">—</td>
                  <td className="py-3 px-3 text-right">{currency}{gstData.turnover.cgst.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">{currency}{gstData.turnover.sgst.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Table 7: B2C Details by Rate Slab */}
        {activeTableTab === 'table7' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200/80 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 font-display font-semibold">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Place of Supply</th>
                  <th className="py-2.5 px-3 text-right">GST Rate</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                  <th className="py-2.5 px-3 text-right">Total Invoice Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800/60 font-sans">
                {gstData.table7.map((row, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-850/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-neutral-800 dark:text-zinc-200">
                      B2C (Others)
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500 font-mono text-[11px]">
                      {placeOfSupply}
                    </td>
                    <td className="py-2.5 px-3 text-right font-display font-bold text-neutral-900 dark:text-neutral-100">
                      {row.rate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-display font-semibold text-neutral-900 dark:text-neutral-100">
                      {currency}{row.taxableValue.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-800 dark:text-zinc-200">
                      {currency}{row.cgst.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-800 dark:text-zinc-200">
                      {currency}{row.sgst.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-display font-bold text-neutral-900 dark:text-neutral-100">
                      {currency}{row.totalValue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-300 dark:border-zinc-700 font-display font-bold text-neutral-900 dark:text-neutral-100">
                  <td className="py-3 px-3" colSpan="3">Total Rate Slabs</td>
                  <td className="py-3 px-3 text-right">{currency}{gstData.turnover.taxableValue.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">{currency}{gstData.turnover.cgst.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">{currency}{gstData.turnover.sgst.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">{currency}{gstData.turnover.grossSales.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* In-Line Modal to Fix Missing HSN Code */}
      {editingItemHsn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rust-100 dark:bg-rust-950/60 text-rust-600 dark:text-rust-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Set 4-Digit HSN Code
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-zinc-400">
                  Product: <span className="font-semibold text-neutral-800 dark:text-zinc-200">{editingItemHsn.productName}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-zinc-400 block mb-1">
                  HSN / SAC Code (4, 6 or 8 Digits)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5208 (Cotton) or 6204 (Apparel)"
                  value={newHsnInput}
                  onChange={(e) => setNewHsnInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-xs font-mono font-bold text-neutral-900 dark:text-neutral-100 outline-none focus:border-rust-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-zinc-400 block mb-1">
                  Applicable GST Rate Slab
                </label>
                <select
                  value={newTaxRateInput}
                  onChange={(e) => setNewTaxRateInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-xs font-display font-semibold text-neutral-900 dark:text-neutral-100 outline-none focus:border-rust-500"
                >
                  <option value="0">0% (Exempt)</option>
                  <option value="5">5% (Fabrics & Daily Wear)</option>
                  <option value="12">12% (Apparel above ₹1,000 / Accessories)</option>
                  <option value="18">18% (General Retail / Electronics)</option>
                  <option value="28">28% (Luxury Goods)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingItemHsn(null)}
                className="py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 text-neutral-800 dark:text-zinc-200 font-display font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHsnFix}
                className="py-2.5 px-3 rounded-xl bg-rust-600 hover:bg-rust-700 text-white font-display font-semibold text-xs transition-colors shadow-sm"
              >
                Save & Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
