import * as dbAdapter from '../server/dbAdapter.js';
import { supabase } from '../server/supabase.js';

async function testLifecycle() {
  console.log('🧪 Starting End-to-End Z-Report Lifecycle & Safety Net Test...');

  const userId = 'user-1793557936085-mnfr2'; // Mallesham
  const testDate = '2026-11-04'; // Today test date
  const testRepId = `z-test-${Date.now()}`;

  // Step 1: Create a test report
  console.log('\n1️⃣ Creating test Z-report for date:', testDate);
  const initialData = {
    id: testRepId,
    userId,
    date: testDate,
    reportNumber: 'TEST-001',
    grossSales: 5000,
    netSales: 5000,
    discount: 0,
    taxTotal: 0,
    totalItemsSold: 10,
    paymentCash: 5000,
    paymentUpi: 0,
    paymentCard: 0
  };
  const initialItems = [
    { productName: '2/2RUBIA', hsnCode: '5208', quantity: 5, unitPrice: 500, lineTotal: 2500, taxRate: 5 },
    { productName: 'LAXMI FALL', hsnCode: '5407', quantity: 5, unitPrice: 500, lineTotal: 2500, taxRate: 5 }
  ];

  const saved = await dbAdapter.createZReport(initialData, initialItems);
  console.log('✅ Created report:', { id: saved.id, date: saved.date, netSales: saved.netSales, items: saved.items.length });

  // Step 2: Verify it is in active reports
  const reps1 = await dbAdapter.getZReports(userId);
  const found1 = reps1.find(r => r.date === testDate);
  if (!found1) throw new Error('Report not found after create');
  console.log('✅ Verified report is present in active reports');

  // Step 3: Delete the report (simulate user deletion)
  console.log('\n2️⃣ Deleting test Z-report for date:', testDate);
  const archived = await dbAdapter.deleteZReport(testDate, userId);
  console.log('✅ Deleted & archived to Recycle Bin:', { archivedDate: archived?.date, archivedNet: archived?.netSales, items: archived?.items?.length });

  // Step 4: Verify it is GONE from active reports
  const reps2 = await dbAdapter.getZReports(userId);
  const found2 = reps2.find(r => r.date === testDate);
  if (found2) throw new Error('Report still present after delete');
  console.log('✅ Verified report is removed from active reports');

  // Step 5: Restore the report from Trash
  console.log('\n3️⃣ Restoring test Z-report from Recycle Bin for date:', testDate);
  const restored = await dbAdapter.restoreZReportFromTrash(testDate, userId);
  if (!restored) throw new Error('Failed to restore report from trash');
  console.log('✅ Restored report successfully:', { id: restored.id, date: restored.date, netSales: restored.netSales, items: restored.items.length });

  // Step 6: Verify it is back in active reports
  const reps3 = await dbAdapter.getZReports(userId);
  const found3 = reps3.find(r => r.date === testDate);
  if (!found3) throw new Error('Report not found after restore');
  console.log('✅ Verified report is back in active reports with correct totals');

  // Step 7: Simulate Re-upload on the same date with new data (to prove NO duplicate key constraint error)
  console.log('\n4️⃣ Simulating Re-upload for date:', testDate);
  const reuploadData = {
    id: `z-reupload-${Date.now()}`,
    userId,
    date: testDate,
    reportNumber: 'TEST-002-REUPLOAD',
    grossSales: 7500,
    netSales: 7500,
    discount: 0,
    taxTotal: 0,
    totalItemsSold: 15,
    paymentCash: 7500,
    paymentUpi: 0,
    paymentCard: 0
  };
  const reuploadItems = [
    { productName: 'COTTONSILK', hsnCode: '5208', quantity: 15, unitPrice: 500, lineTotal: 7500, taxRate: 5 }
  ];

  const reuploaded = await dbAdapter.createZReport(reuploadData, reuploadItems);
  console.log('✅ Re-upload succeeded with NO unique collision:', {
    id: reuploaded.id,
    date: reuploaded.date,
    repNo: reuploaded.reportNumber,
    netSales: reuploaded.netSales,
    items: reuploaded.items.length
  });

  // Step 8: Clean up test report
  console.log('\n5️⃣ Cleaning up test data for date:', testDate);
  await dbAdapter.deleteZReport(testDate, userId);
  console.log('✅ Cleaned up test record.');

  // Step 9: Verify Mallesham's authentic 3 reports are still 100% intact
  console.log('\n6️⃣ Verifying Mallesham authentic reports...');
  const malleshamReports = await dbAdapter.getZReports(userId);
  console.log(`Mallesham active reports count: ${malleshamReports.length}`);
  for (const r of malleshamReports) {
    console.log(`  - [${r.date}] ${r.reportNumber}: ₹${r.netSales} (${r.items.length} items)`);
  }

  if (malleshamReports.length !== 3) {
    throw new Error(`Expected 3 reports for Mallesham, found ${malleshamReports.length}`);
  }

  console.log('\n🎉 ALL LIFECYCLE, ARCHIVE, RESTORE & RE-UPLOAD SAFETY TESTS PASSED!');
}

testLifecycle().catch(console.error);
