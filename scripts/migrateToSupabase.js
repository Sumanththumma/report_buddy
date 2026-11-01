import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be defined in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'retail_database.sqlite');
const sqlite = new Database(dbPath);

async function migrate() {
  console.log(`🚀 Starting migration from SQLite (${dbPath}) to Supabase (${supabaseUrl})...`);

  // 1. Migrate Users
  const users = sqlite.prepare('SELECT * FROM users').all();
  console.log(`👤 Found ${users.length} users in SQLite.`);

  for (const u of users) {
    const { error } = await supabase.from('users').upsert({
      id: u.id,
      email: u.email.toLowerCase(),
      password_hash: u.password_hash,
      shop_name: u.shop_name,
      owner_name: u.owner_name,
      store_category: u.store_category || 'General Retail',
      tagline: u.tagline,
      logo_icon: u.logo_icon,
      theme_color: u.theme_color,
      phone: u.phone,
      address: u.address,
      receipt_footer: u.receipt_footer,
      gstin: u.gstin,
      currency: u.currency,
      gemini_api_key: u.gemini_api_key,
      gemini_preferred_model: u.gemini_preferred_model || 'gemini-2.0-flash',
      dark_mode: u.dark_mode ?? 1,
      role: u.role || 'owner',
      created_at: u.created_at || new Date().toISOString()
    });

    if (error) {
      console.error(`⚠️ Failed to migrate user ${u.email}:`, error.message);
    } else {
      console.log(`  ✅ Migrated user: ${u.email} (${u.shop_name})`);
    }
  }

  // 2. Migrate Products
  const products = sqlite.prepare('SELECT * FROM products').all();
  console.log(`📦 Found ${products.length} products in SQLite.`);

  if (products.length > 0) {
    const formattedProds = products.map(p => ({
      id: p.id,
      user_id: p.user_id,
      name: p.name,
      hsn_code: p.hsn_code,
      price: p.price,
      cost_price: p.cost_price,
      tax_rate: p.tax_rate,
      unit: p.unit,
      category: p.category,
      stock: p.stock,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString()
    }));

    const { error: prodErr } = await supabase.from('products').upsert(formattedProds);
    if (prodErr) {
      console.error('⚠️ Failed to migrate products:', prodErr.message);
    } else {
      console.log(`  ✅ Successfully migrated ${products.length} products!`);
    }
  }

  // 3. Migrate Z-Reports
  const reports = sqlite.prepare('SELECT * FROM z_reports').all();
  console.log(`🧾 Found ${reports.length} Z-Reports in SQLite.`);

  for (const r of reports) {
    const { error: repErr } = await supabase.from('z_reports').upsert({
      id: r.id,
      user_id: r.user_id,
      date: r.date,
      report_number: r.report_number,
      closing_time: r.closing_time,
      store_name: r.store_name,
      register_id: r.register_id,
      gross_sales: r.gross_sales,
      net_sales: r.net_sales,
      discount: r.discount,
      tax_total: r.tax_total,
      total_items_sold: r.total_items_sold,
      payment_cash: r.payment_cash,
      payment_upi: r.payment_upi,
      payment_card: r.payment_card,
      raw_image_url: r.raw_image_url,
      notes: r.notes,
      created_at: r.created_at || new Date().toISOString()
    });

    if (repErr) {
      console.error(`⚠️ Failed to migrate report ${r.date}:`, repErr.message);
    } else {
      console.log(`  ✅ Migrated Z-Report for date ${r.date}`);
    }
  }

  // 4. Migrate Z-Report Items
  const items = sqlite.prepare('SELECT * FROM z_report_items').all();
  console.log(`📋 Found ${items.length} Z-Report line items in SQLite.`);

  if (items.length > 0) {
    const formattedItems = items.map(i => ({
      id: i.id,
      z_report_id: i.z_report_id,
      user_id: i.user_id,
      product_name: i.product_name,
      hsn_code: i.hsn_code,
      quantity: i.quantity,
      unit: i.unit,
      unit_price: i.unit_price,
      line_total: i.line_total,
      tax_rate: i.tax_rate,
      created_at: i.created_at || new Date().toISOString()
    }));

    const { error: itemErr } = await supabase.from('z_report_items').upsert(formattedItems);
    if (itemErr) {
      console.error('⚠️ Failed to migrate items:', itemErr.message);
    } else {
      console.log(`  ✅ Successfully migrated ${items.length} line items!`);
    }
  }

  console.log('\n🎉 ALL DATA MIGRATED TO SUPABASE SUCCESSFULLY!');
}

migrate().catch(console.error);
