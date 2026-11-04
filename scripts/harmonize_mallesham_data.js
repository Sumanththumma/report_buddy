import db from '../server/database.js';
import { supabase, isSupabaseEnabled } from '../server/supabase.js';

async function harmonizeMalleshamData() {
  console.log('--- Harmonizing Mallesham November Records to 5% Textile Tax Rate ---');
  const userId = 'user-1793557936085-mnfr2';

  // 1. Update SQLite
  // Update textile items in z_report_items to 5%
  const updateItemsSql = `
    UPDATE z_report_items 
    SET tax_rate = 5 
    WHERE user_id = ? 
      AND z_report_id IN (SELECT id FROM z_reports WHERE user_id = ? AND date LIKE '2026-11%')
  `;
  const info1 = db.prepare(updateItemsSql).run(userId, userId);
  console.log(`SQLite: Updated ${info1.changes} line items to tax_rate = 5%`);

  // Update Nov 2 tender to Cash = gross_sales if 0
  const updateNov2Sql = `
    UPDATE z_reports 
    SET payment_cash = gross_sales 
    WHERE user_id = ? AND date = '2026-11-02' AND (payment_cash = 0 OR payment_cash IS NULL)
  `;
  const info2 = db.prepare(updateNov2Sql).run(userId);
  console.log(`SQLite: Updated Nov 2 tender breakdown, changes: ${info2.changes}`);

  // Update products catalog to 5% for textile products
  const updateProdsSql = `
    UPDATE products 
    SET tax_rate = 5 
    WHERE user_id = ? AND category IN ('Matching & Fabric', 'Fabric', 'Fabrics', 'Sarees', 'General')
  `;
  const info3 = db.prepare(updateProdsSql).run(userId);
  console.log(`SQLite: Updated ${info3.changes} catalog products to tax_rate = 5%`);

  // 2. Update Supabase Cloud if enabled
  if (isSupabaseEnabled()) {
    console.log('Updating Supabase Cloud...');
    // Update items in Supabase
    const { data: novReps, error: repErr } = await supabase
      .from('z_reports')
      .select('id, date, gross_sales')
      .eq('user_id', userId)
      .like('date', '2026-11%');

    if (repErr) throw repErr;

    const repIds = (novReps || []).map(r => r.id);
    if (repIds.length > 0) {
      const { error: itemErr } = await supabase
        .from('z_report_items')
        .update({ tax_rate: 5 })
        .in('z_report_id', repIds);
      if (itemErr) throw itemErr;
      console.log(`Supabase: Updated line items in reports ${repIds.join(', ')} to tax_rate = 5%`);
    }

    // Update Nov 2 tender in Supabase
    const nov2 = (novReps || []).find(r => r.date === '2026-11-02');
    if (nov2) {
      const { error: n2Err } = await supabase
        .from('z_reports')
        .update({ payment_cash: nov2.gross_sales })
        .eq('id', nov2.id);
      if (n2Err) throw n2Err;
      console.log(`Supabase: Updated Nov 2 payment_cash to ${nov2.gross_sales}`);
    }

    // Update products catalog in Supabase
    const { error: pErr } = await supabase
      .from('products')
      .update({ tax_rate: 5 })
      .eq('user_id', userId);
    if (pErr) console.warn('Supabase product update notice:', pErr.message);
    else console.log('Supabase: Updated catalog products to tax_rate = 5%');
  }

  console.log('\n>>> Data Harmonization Completed Successfully! <<<');
}

harmonizeMalleshamData().catch(err => {
  console.error('Harmonization Failed:', err);
  process.exit(1);
});
