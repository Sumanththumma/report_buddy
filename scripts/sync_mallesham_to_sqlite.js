import Database from 'better-sqlite3';
import { supabase } from '../server/supabase.js';

async function syncToSqlite() {
  const db = new Database('retail_database.sqlite');
  console.log('Fetching Mallesham from Supabase...');
  const { data: user } = await supabase.from('users').select('*').eq('email', 'mallesham.tm@gmail.com').single();
  if (!user) {
    console.error('Mallesham not found in Supabase');
    return;
  }

  // Upsert user into SQLite
  const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(user.id);
  if (!existingUser) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, shop_name, owner_name, store_category, tagline, logo_icon, theme_color, phone, address, receipt_footer, gstin, currency, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id, user.email, user.password_hash, user.shop_name, user.owner_name,
      user.store_category, user.tagline, user.logo_icon, user.theme_color,
      user.phone, user.address, user.receipt_footer, user.gstin, user.currency, user.created_at
    );
    console.log('✅ User inserted into SQLite');
  }

  // Upsert products
  const { data: prods } = await supabase.from('products').select('*').eq('user_id', user.id);
  db.prepare('DELETE FROM products WHERE user_id = ?').run(user.id);
  const insProd = db.prepare(`
    INSERT INTO products (id, user_id, name, hsn_code, price, cost_price, tax_rate, unit, category, stock, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of prods) {
    insProd.run(p.id, p.user_id, p.name, p.hsn_code, p.price, p.cost_price, p.tax_rate, p.unit, p.category, p.stock, p.created_at, p.updated_at);
  }
  console.log(`✅ ${prods.length} products synced to SQLite`);

  // Upsert Z-reports
  const { data: reps } = await supabase.from('z_reports').select('*').eq('user_id', user.id);
  const { data: items } = await supabase.from('z_report_items').select('*').eq('user_id', user.id);

  db.prepare('DELETE FROM z_report_items WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM z_reports WHERE user_id = ?').run(user.id);

  const insRep = db.prepare(`
    INSERT INTO z_reports (id, user_id, date, report_number, closing_time, store_name, register_id, gross_sales, net_sales, discount, tax_total, total_items_sold, payment_cash, payment_upi, payment_card, raw_image_url, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of reps) {
    insRep.run(r.id, r.user_id, r.date, r.report_number, r.closing_time, r.store_name, r.register_id, r.gross_sales, r.net_sales, r.discount, r.tax_total, r.total_items_sold, r.payment_cash, r.payment_upi, r.payment_card, r.raw_image_url, r.notes, r.created_at);
  }

  const insItem = db.prepare(`
    INSERT INTO z_report_items (id, z_report_id, user_id, product_name, hsn_code, quantity, unit, unit_price, line_total, tax_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const it of items) {
    insItem.run(it.id, it.z_report_id, it.user_id, it.product_name, it.hsn_code, it.quantity, it.unit, it.unit_price, it.line_total, it.tax_rate);
  }

  console.log(`✅ ${reps.length} reports and ${items.length} items synced to SQLite!`);
}

syncToSqlite().catch(console.error);
