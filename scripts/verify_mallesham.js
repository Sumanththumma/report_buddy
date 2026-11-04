import * as dbAdapter from '../server/dbAdapter.js';

async function main() {
  const reports = await dbAdapter.getZReports('user-1793557936085-mnfr2');
  console.log('Mallesham total reports:', reports.length);
  for (const r of reports) {
    console.log(`- Date: ${r.date} | RepNo: ${r.reportNumber} | Net: ₹${r.netSales} | Items: ${r.items?.length} | Cash: ₹${r.paymentBreakdown?.cash}`);
  }
}

main().catch(console.error);
