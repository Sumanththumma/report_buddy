import { supabase } from '../server/supabase.js';
import db from '../server/database.js';

async function cleanup() {
  console.log('🧹 Cleaning up incorrect synthetic products and line items...');

  const targetEmails = ['mallesham.tm@gmail.com', 'srivani77@gmail.com'];

  // Clean in Supabase
  for (const email of targetEmails) {
    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('id, email, shop_name')
      .eq('email', email)
      .maybeSingle();

    if (user) {
      console.log(`Found Supabase user: ${user.email} (${user.id})`);

      // 1. Delete synthetic products
      const { data: delProds, error: pErr } = await supabase
        .from('products')
        .delete()
        .eq('user_id', user.id)
        .select();

      console.log(`  🗑️ Deleted ${delProds?.length || 0} incorrect products for ${user.email}`);

      // 2. Delete synthetic z_report_items
      const { data: delItems, error: iErr } = await supabase
        .from('z_report_items')
        .delete()
        .eq('user_id', user.id)
        .select();

      console.log(`  🗑️ Deleted ${delItems?.length || 0} synthetic report line items for ${user.email}`);
    }
  }

  // Also clean local SQLite
  try {
    for (const email of targetEmails) {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (user) {
        const pRes = db.prepare('DELETE FROM products WHERE user_id = ?').run(user.id);
        const iRes = db.prepare('DELETE FROM z_report_items WHERE user_id = ?').run(user.id);
        console.log(`  SQLite: Deleted ${pRes.changes} products and ${iRes.changes} items for ${email}`);
      }
    }
  } catch (err) {
    console.warn('SQLite cleanup warning:', err.message);
  }

  console.log('✨ Cleanup complete! Catalogs reset to clean state without fake items.');
}

cleanup().catch(console.error);
