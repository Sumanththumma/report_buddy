import { getZReports } from '../server/dbAdapter.js';
import { calculateMonthlyGST, generateWhatsAppCAMessage, generateGSTR1CSV } from '../src/utils/gstCalculations.js';

async function testGSTEngine() {
  console.log('--- Testing GST Computation Engine with Mallesham\'s Data ---');

  const userId = 'user-1793557936085-mnfr2';
  const shopProfile = {
    name: 'Sumangali matching centre',
    gstin: '36ABCDE1234F1Z5', // Telangana state code 36
    currency: '₹'
  };

  // Fetch reports for November 2026
  const reports = await getZReports(userId);
  const novReports = reports.filter(r => r.date.startsWith('2026-11'));
  console.log(`Found ${novReports.length} November reports for Mallesham:`);
  novReports.forEach(r => {
    console.log(`  - ${r.date}: Net Sales = ₹${r.netSales}, Items Sold = ${r.totalItemsSold}, Line Items Count = ${r.items?.length || 0}`);
  });

  // Calculate GST
  const gstData = calculateMonthlyGST(novReports, shopProfile);

  console.log('\n--- GST Turnover Metrics ---');
  console.log(`Gross Sales:       ₹${gstData.turnover.grossSales.toFixed(2)}`);
  console.log(`Net Sales:         ₹${gstData.turnover.netSales.toFixed(2)}`);
  console.log(`Taxable Value:     ₹${gstData.turnover.taxableValue.toFixed(2)}`);
  console.log(`CGST (Central):    ₹${gstData.turnover.cgst.toFixed(2)}`);
  console.log(`SGST (State):      ₹${gstData.turnover.sgst.toFixed(2)}`);
  console.log(`Total GST Payable: ₹${gstData.turnover.totalGST.toFixed(2)}`);
  console.log(`Total Units Sold:  ${gstData.turnover.totalItemsSold}`);

  console.log('\n--- Tender Reconciliation ---');
  console.log(`Cash: ₹${gstData.tenders.cash.toFixed(2)} | UPI: ₹${gstData.tenders.upi.toFixed(2)} | Card: ₹${gstData.tenders.card.toFixed(2)}`);

  console.log('\n--- Table 12 HSN Summary (First 5 Rows) ---');
  gstData.table12.slice(0, 5).forEach((row, i) => {
    console.log(`  ${i+1}. HSN ${row.hsnCode} [${row.description}] - Qty: ${row.totalQty} ${row.uqc}, Gross: ₹${row.totalValue.toFixed(2)}, Taxable: ₹${row.taxableValue.toFixed(2)}, GST (${row.rate}%): ₹${row.totalTax.toFixed(2)}`);
  });

  console.log('\n--- Table 7 Rate Slabs ---');
  gstData.table7.filter(r => r.totalValue > 0).forEach(row => {
    console.log(`  Slab ${row.rate}%: Taxable = ₹${row.taxableValue.toFixed(2)}, CGST = ₹${row.cgst.toFixed(2)}, SGST = ₹${row.sgst.toFixed(2)}, Gross = ₹${row.totalValue.toFixed(2)}`);
  });

  console.log('\n--- Health Check ---');
  console.log(`Compliant: ${gstData.healthCheck.isCompliant}, Missing HSN Count: ${gstData.healthCheck.missingHsnCount}`);

  console.log('\n--- Sample WhatsApp Message to CA ---');
  const wa = generateWhatsAppCAMessage('2026-11', gstData, shopProfile);
  console.log(wa);

  console.log('\n--- Sample GSTR-1 CSV Output (First 15 lines) ---');
  const csv = generateGSTR1CSV('2026-11', gstData, shopProfile);
  console.log(csv.split('\n').slice(0, 15).join('\n'));

  // Assertions
  if (gstData.turnover.grossSales <= 0) {
    throw new Error('Gross sales must be greater than 0');
  }
  if (Math.abs((gstData.turnover.taxableValue + gstData.turnover.totalGST) - gstData.turnover.grossSales) > 0.05) {
    throw new Error('Taxable Value + GST must equal Gross Sales');
  }
  if (Math.abs(gstData.turnover.cgst - gstData.turnover.sgst) > 0.01) {
    throw new Error('CGST must equal SGST for intra-state supplies');
  }

  // Explicit 50/50 Tax Split Assertion (e.g. 5% means 2.5% CGST + 2.5% SGST, NOT 5% + 5%)
  gstData.table12.forEach(row => {
    if (row.cgstRate !== row.rate / 2 || row.sgstRate !== row.rate / 2) {
      throw new Error(`Table 12 row rate split error for HSN ${row.hsnCode}: expected ${row.rate / 2}% each, got ${row.cgstRate}% and ${row.sgstRate}%`);
    }
  });

  const slab5 = gstData.table7.find(r => r.rate === 5);
  if (slab5) {
    if (slab5.cgstRate !== 2.5 || slab5.sgstRate !== 2.5) {
      throw new Error(`5% slab must split into 2.5% CGST and 2.5% SGST! Got CGST: ${slab5.cgstRate}%, SGST: ${slab5.sgstRate}%`);
    }
    const computedTax = slab5.cgst + slab5.sgst;
    const expectedTax = slab5.taxableValue * 0.05;
    if (Math.abs(computedTax - expectedTax) > 0.10) {
      throw new Error(`Total 5% slab tax must equal 5% of taxable value, not 10%! Computed: ${computedTax}, Expected: ${expectedTax}`);
    }
    console.log(`\nVerified 5% Slab Split: 2.5% CGST (₹${slab5.cgst.toFixed(2)}) + 2.5% SGST (₹${slab5.sgst.toFixed(2)}) = Total 5% (₹${computedTax.toFixed(2)} on ₹${slab5.taxableValue.toFixed(2)} taxable value)`);
  }

  console.log('\n>>> ALL GST AUDIT CHECKS PASSED SUCCESSFULLY! <<<');
}

testGSTEngine().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
