/**
 * GST Tax Compliance & GSTR-1 Computation Utilities
 * Implements Section 15 CGST Act Tax-Inclusive (MRP Reverse) Calculations,
 * Table 12 (HSN-wise Summary of Outward Supplies), Table 7 (B2C Small Rate Slabs),
 * and official export formatters for Chartered Accountants (CAs).
 */

// Government standard Unit Quantity Codes (UQC)
export const UQC_MAP = {
  pcs: 'PCS-PIECES',
  piece: 'PCS-PIECES',
  pieces: 'PCS-PIECES',
  mtr: 'MTR-METRES',
  meter: 'MTR-METRES',
  metres: 'MTR-METRES',
  meters: 'MTR-METRES',
  kg: 'KGS-KILOGRAMS',
  kgs: 'KGS-KILOGRAMS',
  gm: 'GMS-GRAMMES',
  gms: 'GMS-GRAMMES',
  pkt: 'PAC-PACKETS',
  pkts: 'PAC-PACKETS',
  packet: 'PAC-PACKETS',
  box: 'BOX-BOX',
  pair: 'PRS-PAIRS',
  pairs: 'PRS-PAIRS',
  set: 'SET-SETS',
  sets: 'SET-SETS',
  roll: 'ROL-ROLLS',
  rolls: 'ROL-ROLLS'
};

export const getUQC = (unit) => {
  if (!unit) return 'PCS-PIECES';
  const clean = unit.trim().toLowerCase();
  return UQC_MAP[clean] || `${clean.toUpperCase()}-OTHERS`;
};

// State code mapping from GSTIN (first 2 digits)
export const STATE_CODES = {
  '01': '01-Jammu & Kashmir',
  '02': '02-Himachal Pradesh',
  '03': '03-Punjab',
  '04': '04-Chandigarh',
  '05': '05-Uttarakhand',
  '06': '06-Haryana',
  '07': '07-Delhi',
  '08': '08-Rajasthan',
  '09': '09-Uttar Pradesh',
  '10': '10-Bihar',
  '19': '19-West Bengal',
  '24': '24-Gujarat',
  '27': '27-Maharashtra',
  '29': '29-Karnataka',
  '32': '32-Kerala',
  '33': '33-Tamil Nadu',
  '36': '36-Telangana',
  '37': '37-Andhra Pradesh'
};

export const getStateFromGstin = (gstin) => {
  if (!gstin || gstin.length < 2) return '29-Karnataka';
  const code = gstin.substring(0, 2);
  return STATE_CODES[code] || `${code}-State`;
};

// Official CBIC Statutory 4-Digit HSN Descriptions for Retail Tax Compliance
export const STATUTORY_HSN_DESCRIPTIONS = {
  '5208': 'Woven Fabrics of Cotton (Rubia, Camric, TipTop, Cottonsilk, Jacquard)',
  '5407': 'Woven Fabrics of Synthetic Filament (Saree Falls, Lining, Poly)',
  '5810': 'Embroidery in the piece, in strips or motifs (Sequence & Border Work)',
  '6204': 'Women\'s Apparel, Blouse Pieces & Petticoats (ATC, Payal, SBT)',
  '6109': 'T-Shirts, Singlets and other Vests',
  '8471': 'Automatic Data Processing Machines & Accessories',
  '8518': 'Microphones, Loudspeakers & Headphones',
  '8544': 'Insulated Wire, Cable and Optical Fiber'
};

export const getHsnDescription = (hsn, fallbackName = 'Outward Supply') => {
  if (!hsn) return fallbackName;
  const code = hsn.toString().trim().substring(0, 4);
  return STATUTORY_HSN_DESCRIPTIONS[code] || fallbackName;
};

/**
 * Calculates GSTR-1 Table 12, Table 7, Tender Reconciliation,
 * and Smart Health Check metrics for a given list of Z-Reports.
 */
export const calculateMonthlyGST = (reports = [], shopProfile = {}) => {
  const table12Map = new Map();
  const table7Map = new Map();

  // Initialize standard GST rate slabs for Table 7 (0%, 5%, 12%, 18%, 28%)
  const standardRates = [0, 5, 12, 18, 28];
  standardRates.forEach(rate => {
    table7Map.set(rate, {
      rate,
      cgstRate: rate / 2,
      sgstRate: rate / 2,
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      totalValue: 0
    });
  });

  let totalGrossTurnover = 0;
  let totalNetTurnover = 0;
  let totalDiscounts = 0;
  let totalTaxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalItemsSold = 0;

  let totalCash = 0;
  let totalUpi = 0;
  let totalCard = 0;

  const missingHsnItems = [];

  (reports || []).forEach(report => {
    const reportGross = parseFloat(report.grossSales) || 0;
    const pBreak = report.paymentBreakdown || {};
    let cashVal = parseFloat(pBreak.cash ?? report.paymentCash) || 0;
    let upiVal = parseFloat(pBreak.upi ?? report.paymentUpi) || 0;
    let cardVal = parseFloat(pBreak.card ?? report.paymentCard) || 0;

    // Decision 3: If tenders were not itemized on thermal slip (e.g. Nov 2), default to Cash
    if (cashVal === 0 && upiVal === 0 && cardVal === 0 && reportGross > 0) {
      cashVal = reportGross;
    }

    totalCash += cashVal;
    totalUpi += upiVal;
    totalCard += cardVal;

    totalGrossTurnover += reportGross;
    totalNetTurnover += parseFloat(report.netSales) || 0;
    totalDiscounts += parseFloat(report.discount) || 0;
    totalItemsSold += parseInt(report.totalItemsSold, 10) || 0;

    const items = Array.isArray(report.items) ? report.items : [];
    let reportItemsGross = 0;
    let reportItemsQty = 0;

    items.forEach(item => {
      const rawName = (item.productName || item.name || 'Item').trim();
      const rawHsn = (item.hsnCode || item.hsn || '').toString().trim();
      const isMissing = !rawHsn || rawHsn === '999999' || rawHsn.length < 4;
      const cleanHsn = isMissing ? '999999' : rawHsn;

      if (isMissing) {
        missingHsnItems.push({
          date: report.date,
          reportId: report.id,
          productName: rawName,
          currentHsn: rawHsn || 'Empty'
        });
      }

      const qty = parseInt(item.quantity || item.qty, 10) || 1;
      const uPrice = parseFloat(item.unitPrice || item.price) || 0;
      const lineGross = parseFloat(item.lineTotal || item.total) || (qty * uPrice);
      const rate = parseFloat(item.taxRate ?? item.tax_rate) || (shopProfile.defaultTaxRate || 5);
      const unit = (item.unit || 'pcs').trim().toLowerCase();

      reportItemsGross += lineGross;
      reportItemsQty += qty;

      // Reverse MRP Tax-Inclusive Calculation:
      // Taxable Value = LineGross / (1 + Rate / 100)
      const taxable = lineGross / (1 + rate / 100);
      const tax = lineGross - taxable;
      const cgst = tax / 2;
      const sgst = tax / 2;

      totalTaxableValue += taxable;
      totalCGST += cgst;
      totalSGST += sgst;

      // Decision 4: Group Table 12 by statutory 4-digit HSN code + tax rate
      const statHsn = cleanHsn.length >= 4 ? cleanHsn.substring(0, 4) : cleanHsn;
      const t12Key = `${statHsn}_${rate}`;
      if (!table12Map.has(t12Key)) {
        table12Map.set(t12Key, {
          hsnCode: statHsn,
          description: getHsnDescription(statHsn, rawName),
          uqc: getUQC(unit),
          unit,
          rate,
          cgstRate: rate / 2,
          sgstRate: rate / 2,
          totalQty: 0,
          totalValue: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
          isMissingHsn: isMissing,
          itemMap: new Map()
        });
      }
      const t12Row = table12Map.get(t12Key);
      t12Row.totalQty += qty;
      t12Row.totalValue += lineGross;
      t12Row.taxableValue += taxable;
      t12Row.cgst += cgst;
      t12Row.sgst += sgst;
      t12Row.totalTax += tax;

      // Expandable Product Variety Details inside this HSN
      const itemKey = `${rawName.toLowerCase()}_${unit}_${rate}`;
      if (!t12Row.itemMap.has(itemKey)) {
        t12Row.itemMap.set(itemKey, {
          productName: rawName,
          unit,
          uqc: getUQC(unit),
          rate,
          cgstRate: rate / 2,
          sgstRate: rate / 2,
          qty: 0,
          gross: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          totalTax: 0
        });
      }
      const pVar = t12Row.itemMap.get(itemKey);
      pVar.qty += qty;
      pVar.gross += lineGross;
      pVar.taxable += taxable;
      pVar.cgst += cgst;
      pVar.sgst += sgst;
      pVar.totalTax += tax;

      // Table 7 Aggregation (grouped by Rate Slab)
      if (!table7Map.has(rate)) {
        table7Map.set(rate, { 
          rate, 
          cgstRate: rate / 2, 
          sgstRate: rate / 2, 
          taxableValue: 0, 
          cgst: 0, 
          sgst: 0, 
          totalValue: 0 
        });
      }
      const t7Row = table7Map.get(rate);
      t7Row.taxableValue += taxable;
      t7Row.cgst += cgst;
      t7Row.sgst += sgst;
      t7Row.totalValue += lineGross;
    });

    // Decision 2: Map unitemized sales difference to shop's primary textile HSN (5208) at 5%
    const diffGross = reportGross - reportItemsGross;
    if (diffGross > 0.05) {
      const defaultRate = shopProfile.defaultTaxRate || 5;
      const primaryHsn = shopProfile.primaryHsn || '5208';
      const diffTaxable = diffGross / (1 + defaultRate / 100);
      const diffTax = diffGross - diffTaxable;
      const diffCgst = diffTax / 2;
      const diffSgst = diffTax / 2;
      const diffQty = Math.max(1, (parseInt(report.totalItemsSold, 10) || 0) - reportItemsQty);

      totalTaxableValue += diffTaxable;
      totalCGST += diffCgst;
      totalSGST += diffSgst;

      // Table 12 entry under statutory HSN 5208
      const t12Key = `${primaryHsn}_${defaultRate}`;
      if (!table12Map.has(t12Key)) {
        table12Map.set(t12Key, {
          hsnCode: primaryHsn,
          description: getHsnDescription(primaryHsn, 'Woven Fabrics of Cotton'),
          uqc: 'MTR-METRES',
          unit: 'mtr',
          rate: defaultRate,
          cgstRate: defaultRate / 2,
          sgstRate: defaultRate / 2,
          totalQty: 0,
          totalValue: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
          isMissingHsn: false,
          itemMap: new Map()
        });
      }
      const t12Row = table12Map.get(t12Key);
      t12Row.totalQty += diffQty;
      t12Row.totalValue += diffGross;
      t12Row.taxableValue += diffTaxable;
      t12Row.cgst += diffCgst;
      t12Row.sgst += diffSgst;
      t12Row.totalTax += diffTax;

      const unKey = `General Matching (${report.date})_${defaultRate}`;
      if (!t12Row.itemMap.has(unKey)) {
        t12Row.itemMap.set(unKey, {
          productName: `General Matching & Fabric (Day Total ${report.date})`,
          unit: 'mtr',
          uqc: 'MTR-METRES',
          rate: defaultRate,
          cgstRate: defaultRate / 2,
          sgstRate: defaultRate / 2,
          qty: 0,
          gross: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          totalTax: 0,
          isUnitemized: true
        });
      }
      const unVar = t12Row.itemMap.get(unKey);
      unVar.qty += diffQty;
      unVar.gross += diffGross;
      unVar.taxable += diffTaxable;
      unVar.cgst += diffCgst;
      unVar.sgst += diffSgst;
      unVar.totalTax += diffTax;

      // Table 7 entry
      if (!table7Map.has(defaultRate)) {
        table7Map.set(defaultRate, { 
          rate: defaultRate, 
          cgstRate: defaultRate / 2, 
          sgstRate: defaultRate / 2, 
          taxableValue: 0, 
          cgst: 0, 
          sgst: 0, 
          totalValue: 0 
        });
      }
      const t7Row = table7Map.get(defaultRate);
      t7Row.taxableValue += diffTaxable;
      t7Row.cgst += diffCgst;
      t7Row.sgst += diffSgst;
      t7Row.totalValue += diffGross;
    }
  });

  // Convert maps to sorted arrays
  const table12 = Array.from(table12Map.values()).map(row => ({
    ...row,
    items: Array.from(row.itemMap?.values() || []).sort((a, b) => b.gross - a.gross)
  })).sort((a, b) => b.totalValue - a.totalValue);
  const table7 = Array.from(table7Map.values())
    .filter(row => row.totalValue > 0 || standardRates.includes(row.rate))
    .sort((a, b) => a.rate - b.rate);

  const totalGSTLiability = totalCGST + totalSGST;

  return {
    turnover: {
      grossSales: totalGrossTurnover,
      netSales: totalNetTurnover,
      discounts: totalDiscounts,
      taxableValue: totalTaxableValue,
      totalGST: totalGSTLiability,
      cgst: totalCGST,
      sgst: totalSGST,
      totalItemsSold
    },
    tenders: {
      cash: totalCash,
      upi: totalUpi,
      card: totalCard,
      totalTendered: totalCash + totalUpi + totalCard
    },
    table12,
    table7,
    healthCheck: {
      isCompliant: missingHsnItems.length === 0,
      missingHsnCount: missingHsnItems.length,
      missingItems: missingHsnItems
    }
  };
};

/**
 * Computes official statutory GSTR-1 filing due date (11th of succeeding month).
 */
export const getGSTR1DueDate = (monthStr) => {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return `11th ${nextMonth.toLocaleString('en-US', { month: 'short' })} ${nextMonth.getFullYear()}`;
  }
  const [y, m] = monthStr.split('-').map(Number);
  const next = new Date(y, m, 11);
  return `11th ${next.toLocaleString('en-US', { month: 'short' })} ${next.getFullYear()}`;
};

/**
 * Generates formatted WhatsApp executive summary text for CA / Accountant.
 */
export const generateWhatsAppCAMessage = (monthStr, gstData, shopProfile) => {
  const currency = shopProfile.currency || '₹';
  const monthName = new Date(`${monthStr}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const dueDate = getGSTR1DueDate(monthStr);

  const t = gstData.turnover;
  const pay = gstData.tenders;

  let text = `📋 *MONTHLY GST & SALES SUMMARY*\n`;
  text += `🏪 *${shopProfile.name || 'Store'}*\n`;
  text += `🆔 *GSTIN:* ${shopProfile.gstin || '29ABCDE1234F1Z5'}\n`;
  text += `📅 *Tax Period:* ${monthName}\n`;
  text += `⏰ *GSTR-1 Due Date:* ${dueDate}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *Gross Sales:* ${currency}${t.grossSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
  if (t.discounts > 0) {
    text += `📉 *Discounts:* ${currency}${t.discounts.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
  }
  text += `💎 *Taxable Turnover:* ${currency}${t.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n\n`;

  text += `🏛️ *TAX LIABILITY (Split 50% CGST + 50% SGST):*\n`;
  text += `  • CGST (Central): ${currency}${t.cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
  text += `  • SGST (State): ${currency}${t.sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
  text += `  • *Total GST Payable:* ${currency}${t.totalGST.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
  text += `  _(Note: 5% tax = 2.5% CGST + 2.5% SGST; 18% tax = 9% CGST + 9% SGST)_\n\n`;

  text += `💵 *PAYMENT MODES:*\n`;
  text += `  • Cash: ${currency}${pay.cash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
  text += `  • UPI / QR: ${currency}${pay.upi.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`;
  text += `  • Card / POS: ${currency}${pay.card.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n\n`;

  text += `📦 *GSTR-1 TABLE 12 (HSN BREAKDOWN):*\n`;
  (gstData.table12 || []).slice(0, 8).forEach(row => {
    text += `  • HSN ${row.hsnCode}: ${row.totalQty} ${row.unit} | Gross: ${currency}${row.totalValue.toFixed(2)} | Taxable: ${currency}${row.taxableValue.toFixed(2)} | GST ${row.rate}% (${row.cgstRate}%+${row.sgstRate}%): ${currency}${row.totalTax.toFixed(2)}\n`;
  });

  if ((gstData.table12 || []).length > 8) {
    text += `  • ... +${gstData.table12.length - 8} additional HSN codes\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Please find the detailed GSTR-1 Excel/CSV attached for filing. Sent via Report Buddy._`;

  return text;
};

/**
 * Generates an official GSTR-1 Government CSV compatible with GST Offline Utility and CA software.
 */
export const generateGSTR1CSV = (monthStr, gstData, shopProfile) => {
  const monthName = new Date(`${monthStr}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const pos = getStateFromGstin(shopProfile.gstin);

  let csv = `GSTR-1 MONTHLY SUMMARY - ${monthName.toUpperCase()}\n`;
  csv += `Store Name,"${(shopProfile.name || '').replace(/"/g, '""')}"\n`;
  csv += `GSTIN,"${shopProfile.gstin || ''}"\n`;
  csv += `State / Place of Supply,"${pos}"\n`;
  csv += `Due Date,"${getGSTR1DueDate(monthStr)}"\n`;
  csv += `Tax Note,"Standard 5% GST represents 2.5% CGST + 2.5% SGST"\n\n`;

  csv += `=== SUMMARY METRICS ===\n`;
  csv += `Gross Turnover,${gstData.turnover.grossSales.toFixed(2)}\n`;
  csv += `Discounts,${gstData.turnover.discounts.toFixed(2)}\n`;
  csv += `Taxable Turnover,${gstData.turnover.taxableValue.toFixed(2)}\n`;
  csv += `Central Tax (CGST),${gstData.turnover.cgst.toFixed(2)}\n`;
  csv += `State Tax (SGST),${gstData.turnover.sgst.toFixed(2)}\n`;
  csv += `Total GST Liability,${gstData.turnover.totalGST.toFixed(2)}\n`;
  csv += `Total Units Sold,${gstData.turnover.totalItemsSold}\n`;
  csv += `Cash Tender,${gstData.tenders.cash.toFixed(2)}\n`;
  csv += `UPI Tender,${gstData.tenders.upi.toFixed(2)}\n`;
  csv += `Card Tender,${gstData.tenders.card.toFixed(2)}\n\n`;

  csv += `=== GSTR-1 TABLE 12: HSN-WISE SUMMARY OF OUTWARD SUPPLIES ===\n`;
  csv += `HSN Code,Description,UQC (Unit),Total Quantity,Total Value,Taxable Value,Integrated Tax (IGST),Central Tax (CGST),State Tax (SGST),Total Tax,Total GST Rate (%),CGST Rate (%),SGST Rate (%)\n`;
  gstData.table12.forEach(row => {
    csv += `"${row.hsnCode}","${(row.description || '').replace(/"/g, '""')}","${row.uqc}",${row.totalQty},${row.totalValue.toFixed(2)},${row.taxableValue.toFixed(2)},0.00,${row.cgst.toFixed(2)},${row.sgst.toFixed(2)},${row.totalTax.toFixed(2)},${row.rate}%,${row.cgstRate}%,${row.sgstRate}%\n`;
  });
  csv += `\n`;

  csv += `=== GSTR-1 TABLE 7: B2C (SMALL) DETAILS BY RATE SLAB ===\n`;
  csv += `Type,Place of Supply,Total GST Rate (%),CGST Rate (%),SGST Rate (%),Taxable Value,Central Tax (CGST),State Tax (SGST),Total Invoice Value\n`;
  gstData.table7.forEach(row => {
    csv += `"B2C Intra-State","${pos}",${row.rate}%,${row.cgstRate}%,${row.sgstRate}%,${row.taxableValue.toFixed(2)},${row.cgst.toFixed(2)},${row.sgst.toFixed(2)},${row.totalValue.toFixed(2)}\n`;
  });

  return csv;
};

/**
 * Triggers a browser download of the GSTR-1 CSV file.
 */
export const downloadGSTR1CSV = (monthStr, gstData, shopProfile) => {
  const csv = generateGSTR1CSV(monthStr, gstData, shopProfile);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (shopProfile.name || 'Store').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `GSTR1_${safeName}_${monthStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
