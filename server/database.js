import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize persistent SQLite database (configurable for cloud persistent disks via DB_PATH)
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'retail_database.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);

// Enable WAL mode (Write-Ahead Logging) for superior concurrent performance & reliability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema with personalization columns
export const initDatabase = () => {
  db.exec(`
    -- Users / Retail Shops Table with Personalization
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      owner_name TEXT,
      store_category TEXT DEFAULT 'General Retail',
      tagline TEXT DEFAULT 'Your neighborhood retail shop',
      logo_icon TEXT DEFAULT 'Store',
      theme_color TEXT DEFAULT 'indigo',
      phone TEXT,
      address TEXT,
      receipt_footer TEXT DEFAULT 'Thank you for shopping with us! Please visit again.',
      gstin TEXT,
      currency TEXT DEFAULT '₹',
      gemini_api_key TEXT,
      gemini_preferred_model TEXT DEFAULT 'gemini-2.0-flash',
      dark_mode INTEGER DEFAULT 1,
      role TEXT DEFAULT 'owner',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Product Catalog with HSN Codes and Pricing
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      hsn_code TEXT NOT NULL,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      tax_rate REAL DEFAULT 18,
      unit TEXT DEFAULT 'pcs',
      category TEXT DEFAULT 'General',
      stock INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- End-Of-Day (EOD) Z-Reports Table
    CREATE TABLE IF NOT EXISTS z_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      report_number TEXT,
      closing_time TEXT,
      store_name TEXT,
      register_id TEXT,
      gross_sales REAL DEFAULT 0,
      net_sales REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_total REAL DEFAULT 0,
      total_items_sold INTEGER DEFAULT 0,
      payment_cash REAL DEFAULT 0,
      payment_upi REAL DEFAULT 0,
      payment_card REAL DEFAULT 0,
      raw_image_url TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, date)
    );

    -- Itemized Products Sold in each Z-Report
    CREATE TABLE IF NOT EXISTS z_report_items (
      id TEXT PRIMARY KEY,
      z_report_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      hsn_code TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit TEXT DEFAULT 'pcs',
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      tax_rate REAL DEFAULT 18,
      FOREIGN KEY (z_report_id) REFERENCES z_reports(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for high-speed queries
    CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
    CREATE INDEX IF NOT EXISTS idx_zreports_user_date ON z_reports(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_zreport_items_report ON z_report_items(z_report_id);
  `);

  // Safe migrations in case the database was created earlier without the new personalization columns
  const addColumnIfNotExists = (table, column, definition) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (e) {
      // Column already exists, ignore
    }
  };

  addColumnIfNotExists('users', 'store_category', "TEXT DEFAULT 'General Retail'");
  addColumnIfNotExists('users', 'tagline', "TEXT DEFAULT 'Your neighborhood retail shop'");
  addColumnIfNotExists('users', 'logo_icon', "TEXT DEFAULT 'Store'");
  addColumnIfNotExists('users', 'theme_color', "TEXT DEFAULT 'indigo'");
  addColumnIfNotExists('users', 'phone', "TEXT");
  addColumnIfNotExists('users', 'address', "TEXT");
  addColumnIfNotExists('users', 'receipt_footer', "TEXT DEFAULT 'Thank you for shopping with us! Please visit again.'");
  addColumnIfNotExists('users', 'gemini_preferred_model', "TEXT DEFAULT 'gemini-2.0-flash'");
  addColumnIfNotExists('users', 'dark_mode', "INTEGER DEFAULT 1");

  console.log('✅ SQLite database schema & personalization columns verified at:', dbPath);
};

export default db;
