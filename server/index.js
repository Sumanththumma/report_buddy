import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import db, { initDatabase } from './database.js';
import { generateToken, requireAuth, requireRole } from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database
initDatabase();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to seed a demo store if no users exist
const seedDemoDataIfEmpty = () => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const demoUserId = 'demo-shop-owner-001';
    const passwordHash = bcrypt.hashSync('demo1234', 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, shop_name, owner_name, gstin, currency, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      demoUserId,
      'demo@retailstore.com',
      passwordHash,
      'Smart Retail Store',
      'Store Manager',
      '29ABCDE1234F1Z5',
      '₹',
      'owner'
    );

    // Seed products
    const initialProducts = [
      { id: 'p-1', name: 'Cotton Polo T-Shirt', hsn: '61091000', price: 499, cost: 280, tax: 5, unit: 'pcs', cat: 'Apparel', stock: 85 },
      { id: 'p-2', name: 'Wireless Bluetooth Earbuds', hsn: '85183000', price: 1299, cost: 750, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 34 },
      { id: 'p-3', name: 'USB-C Braided Fast Cable 65W', hsn: '85444299', price: 249, cost: 110, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 92 },
      { id: 'p-4', name: 'Wireless Optical Mouse', hsn: '84716060', price: 450, cost: 240, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 28 },
      { id: 'p-5', name: 'Organic Wildflower Honey 500g', hsn: '04090000', price: 350, cost: 210, tax: 5, unit: 'jar', cat: 'Groceries', stock: 40 },
      { id: 'p-6', name: 'Ceramic Designer Coffee Mug', hsn: '69120010', price: 180, cost: 85, tax: 12, unit: 'pcs', cat: 'Home & Kitchen', stock: 50 },
      { id: 'p-7', name: 'Premium Basmati Rice 5kg', hsn: '10063020', price: 540, cost: 420, tax: 0, unit: 'bag', cat: 'Groceries', stock: 65 },
      { id: 'p-8', name: 'Fast Charging Power Bank 20000mAh', hsn: '85044090', price: 1499, cost: 880, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 19 }
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (id, user_id, name, hsn_code, price, cost_price, tax_rate, unit, category, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of initialProducts) {
      insertProd.run(p.id, demoUserId, p.name, p.hsn, p.price, p.cost, p.tax, p.unit, p.cat, p.stock);
    }

    // Seed recent multi-day Z-Reports
    const initialReports = [
      {
        id: 'z-2026-11-01',
        date: '2026-11-01',
        repNum: 'Z-0048',
        time: '21:45',
        gross: 19800,
        discount: 650,
        net: 19150,
        tax: 2140,
        cash: 6200,
        upi: 9850,
        card: 3100,
        items: [
          { name: 'Cotton Polo T-Shirt', hsn: '61091000', qty: 14, unit: 'pcs', rate: 499, total: 6986, tax: 5 },
          { name: 'Wireless Bluetooth Earbuds', hsn: '85183000', qty: 4, unit: 'pcs', rate: 1299, total: 5196, tax: 18 },
          { name: 'USB-C Braided Fast Cable 65W', hsn: '85444299', qty: 12, unit: 'pcs', rate: 249, total: 2988, tax: 18 },
          { name: 'Organic Wildflower Honey 500g', hsn: '04090000', qty: 5, unit: 'jar', rate: 350, total: 1750, tax: 5 },
          { name: 'Ceramic Designer Coffee Mug', hsn: '69120010', qty: 7, unit: 'pcs', rate: 180, total: 1260, tax: 12 },
          { name: 'Premium Basmati Rice 5kg', hsn: '10063020', qty: 3, unit: 'bag', rate: 540, total: 1620, tax: 0 }
        ]
      },
      {
        id: 'z-2026-10-31',
        date: '2026-10-31',
        repNum: 'Z-0047',
        time: '21:30',
        gross: 22798,
        discount: 498,
        net: 22300,
        tax: 3180,
        cash: 7300,
        upi: 11500,
        card: 3500,
        items: [
          { name: 'Wireless Optical Mouse', hsn: '84716060', qty: 10, unit: 'pcs', rate: 450, total: 4500, tax: 18 },
          { name: 'Fast Charging Power Bank 20000mAh', hsn: '85044090', qty: 4, unit: 'pcs', rate: 1499, total: 5996, tax: 18 },
          { name: 'USB-C Braided Fast Cable 65W', hsn: '85444299', qty: 15, unit: 'pcs', rate: 280, total: 4200, tax: 18 },
          { name: 'Cotton Polo T-Shirt', hsn: '61091000', qty: 8, unit: 'pcs', rate: 499, total: 3992, tax: 5 },
          { name: 'Ceramic Designer Coffee Mug', hsn: '69120010', qty: 12, unit: 'pcs', rate: 180, total: 2160, tax: 12 },
          { name: 'Premium Basmati Rice 5kg', hsn: '10063020', qty: 3, unit: 'bag', rate: 540, total: 1620, tax: 0 }
        ]
      },
      {
        id: 'z-2026-10-30',
        date: '2026-10-30',
        repNum: 'Z-0046',
        time: '21:40',
        gross: 16840,
        discount: 340,
        net: 16500,
        tax: 1850,
        cash: 5500,
        upi: 8200,
        card: 2800,
        items: [
          { name: 'Cotton Polo T-Shirt', hsn: '61091000', qty: 10, unit: 'pcs', rate: 499, total: 4990, tax: 5 },
          { name: 'USB-C Braided Fast Cable 65W', hsn: '85444299', qty: 14, unit: 'pcs', rate: 249, total: 3486, tax: 18 },
          { name: 'Organic Wildflower Honey 500g', hsn: '04090000', qty: 8, unit: 'jar', rate: 350, total: 2800, tax: 5 },
          { name: 'Wireless Bluetooth Earbuds', hsn: '85183000', qty: 3, unit: 'pcs', rate: 1299, total: 3897, tax: 18 }
        ]
      }
    ];

    const insertZ = db.prepare(`
      INSERT INTO z_reports (id, user_id, date, report_number, closing_time, store_name, register_id, gross_sales, net_sales, discount, tax_total, total_items_sold, payment_cash, payment_upi, payment_card)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertZItem = db.prepare(`
      INSERT INTO z_report_items (id, z_report_id, user_id, product_name, hsn_code, quantity, unit, unit_price, line_total, tax_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of initialReports) {
      const totalUnits = r.items.reduce((acc, i) => acc + i.qty, 0);
      insertZ.run(r.id, demoUserId, r.date, r.repNum, r.time, 'Smart Retail Store', 'REG-01', r.gross, r.net, r.discount, r.tax, totalUnits, r.cash, r.upi, r.card);
      for (const item of r.items) {
        insertZItem.run(`item-${Date.now()}-${Math.random()}`, r.id, demoUserId, item.name, item.hsn, item.qty, item.unit, item.rate, item.total, item.tax);
      }
    }

    console.log('🌱 Seeded initial demo retail store (demo@retailstore.com / demo1234)');
  }
};

seedDemoDataIfEmpty();

// -------------------------------------------------------------
// AUTHENTICATION & AUTHORIZATION ROUTES
// -------------------------------------------------------------

const CATEGORY_STARTER_PRODUCTS = {
  'Apparel & Fashion': [
    { name: 'Cotton Crew T-Shirt', hsn: '61091000', price: 499, cost: 260, tax: 5, unit: 'pcs', cat: 'Apparel', stock: 50 },
    { name: 'Slim Fit Denim Jeans', hsn: '62034200', price: 1499, cost: 790, tax: 12, unit: 'pcs', cat: 'Apparel', stock: 30 },
    { name: 'Casual Cotton Shirt', hsn: '62052000', price: 899, cost: 450, tax: 5, unit: 'pcs', cat: 'Apparel', stock: 40 },
    { name: 'Fleece Zipper Hoodie', hsn: '61102000', price: 1299, cost: 680, tax: 12, unit: 'pcs', cat: 'Apparel', stock: 25 },
    { name: 'Ankle Cotton Socks 3-Pack', hsn: '61159500', price: 199, cost: 85, tax: 5, unit: 'pack', cat: 'Apparel', stock: 60 }
  ],
  'Electronics & Gadgets': [
    { name: 'Wireless Bluetooth Earbuds', hsn: '85183000', price: 1299, cost: 750, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 30 },
    { name: 'USB-C Braided Fast Cable 65W', hsn: '85444299', price: 249, cost: 110, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 80 },
    { name: 'Fast Charging Power Bank 20000mAh', hsn: '85044090', price: 1499, cost: 850, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 20 },
    { name: 'Ergonomic Optical Mouse', hsn: '84716060', price: 450, cost: 230, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 35 },
    { name: 'HDMI 2.1 Ultra High Speed Cable', hsn: '85444299', price: 320, cost: 150, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 45 }
  ],
  'Grocery & Supermarket': [
    { name: 'Premium Basmati Rice 5kg', hsn: '10063020', price: 540, cost: 420, tax: 0, unit: 'bag', cat: 'Groceries', stock: 50 },
    { name: 'Cold Pressed Sunflower Oil 1L', hsn: '15121110', price: 175, cost: 145, tax: 5, unit: 'bottle', cat: 'Groceries', stock: 60 },
    { name: 'Organic Raw Honey 500g', hsn: '04090000', price: 350, cost: 220, tax: 5, unit: 'jar', cat: 'Groceries', stock: 35 },
    { name: 'Roasted Cashew Nuts 500g', hsn: '08013220', price: 460, cost: 360, tax: 12, unit: 'pack', cat: 'Groceries', stock: 25 },
    { name: 'Whole Wheat Atta 10kg', hsn: '11010000', price: 420, cost: 340, tax: 0, unit: 'bag', cat: 'Groceries', stock: 40 }
  ],
  'Hardware & Electrical': [
    { name: 'Smart LED Bulb 12W B22', hsn: '85395200', price: 140, cost: 75, tax: 18, unit: 'pcs', cat: 'Electrical', stock: 60 },
    { name: '4-Socket Spike Extension Board', hsn: '85371000', price: 399, cost: 210, tax: 18, unit: 'pcs', cat: 'Electrical', stock: 30 },
    { name: 'PVC Insulation Electrical Tape', hsn: '39191000', price: 30, cost: 12, tax: 18, unit: 'pcs', cat: 'Hardware', stock: 100 },
    { name: 'Precision Screwdriver Set 8-in-1', hsn: '82054000', price: 280, cost: 130, tax: 18, unit: 'set', cat: 'Hardware', stock: 25 }
  ],
  'General Retail': [
    { name: 'Cotton Polo T-Shirt', hsn: '61091000', price: 499, cost: 280, tax: 5, unit: 'pcs', cat: 'Apparel', stock: 45 },
    { name: 'Ceramic Designer Coffee Mug', hsn: '69120010', price: 180, cost: 85, tax: 12, unit: 'pcs', cat: 'Home', stock: 35 },
    { name: 'USB-C Braided Fast Cable 65W', hsn: '85444299', price: 249, cost: 110, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 50 },
    { name: 'Organic Wildflower Honey 500g', hsn: '04090000', price: 350, cost: 210, tax: 5, unit: 'jar', cat: 'Groceries', stock: 30 }
  ]
};

// Register a new retail shop with personalization
app.post('/api/auth/register', (req, res) => {
  try {
    const { 
      email, 
      password, 
      shopName, 
      ownerName, 
      storeCategory = 'General Retail',
      tagline,
      logoIcon = 'Store',
      themeColor = 'indigo',
      phone,
      address,
      receiptFooter,
      gstin, 
      currency = '₹',
      seedStarterProducts = true
    } = req.body;

    if (!email || !password || !shopName) {
      return res.status(400).json({ error: 'Email, password, and shop name are required.' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, shop_name, owner_name, 
        store_category, tagline, logo_icon, theme_color,
        phone, address, receipt_footer, gstin, currency, role
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      email.trim().toLowerCase(),
      passwordHash,
      shopName.trim(),
      ownerName ? ownerName.trim() : null,
      storeCategory || 'General Retail',
      tagline ? tagline.trim() : 'Your neighborhood retail shop',
      logoIcon || 'Store',
      themeColor || 'indigo',
      phone ? phone.trim() : null,
      address ? address.trim() : null,
      receiptFooter ? receiptFooter.trim() : 'Thank you for shopping with us! Please visit again.',
      gstin ? gstin.trim() : null,
      currency || '₹',
      'owner'
    );

    // Auto-seed industry-specific starter products if requested
    if (seedStarterProducts) {
      const starterList = CATEGORY_STARTER_PRODUCTS[storeCategory] || CATEGORY_STARTER_PRODUCTS['General Retail'];
      const insertProd = db.prepare(`
        INSERT INTO products (id, user_id, name, hsn_code, price, cost_price, tax_rate, unit, category, stock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const p of starterList) {
        insertProd.run(
          `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId,
          p.name,
          p.hsn,
          p.price,
          p.cost,
          p.tax,
          p.unit,
          p.cat,
          p.stock
        );
      }
    }

    const newUser = db.prepare(`
      SELECT id, email, shop_name, owner_name, store_category, tagline,
             logo_icon, theme_color, phone, address, receipt_footer,
             gstin, currency, role, gemini_api_key, created_at
      FROM users WHERE id = ?
    `).get(userId);

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Retail shop account created successfully!',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account: ' + err.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { password_hash, ...safeUser } = user;
    const token = generateToken(safeUser);

    res.json({
      message: 'Logged in successfully',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Get current authenticated user profile with personalization
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, shop_name, owner_name, store_category, tagline,
           logo_icon, theme_color, phone, address, receipt_footer,
           gstin, currency, role, gemini_api_key, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  res.json({ user });
});

// Update shop profile & personalization settings
app.put('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const { 
      shopName, 
      ownerName, 
      storeCategory,
      tagline,
      logoIcon,
      themeColor,
      phone,
      address,
      receiptFooter,
      gstin, 
      currency, 
      geminiApiKey 
    } = req.body;

    db.prepare(`
      UPDATE users
      SET shop_name = COALESCE(?, shop_name),
          owner_name = COALESCE(?, owner_name),
          store_category = COALESCE(?, store_category),
          tagline = COALESCE(?, tagline),
          logo_icon = COALESCE(?, logo_icon),
          theme_color = COALESCE(?, theme_color),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          receipt_footer = COALESCE(?, receipt_footer),
          gstin = COALESCE(?, gstin),
          currency = COALESCE(?, currency),
          gemini_api_key = COALESCE(?, gemini_api_key)
      WHERE id = ?
    `).run(
      shopName || null,
      ownerName || null,
      storeCategory || null,
      tagline || null,
      logoIcon || null,
      themeColor || null,
      phone || null,
      address || null,
      receiptFooter || null,
      gstin || null,
      currency || null,
      geminiApiKey !== undefined ? geminiApiKey : null,
      req.user.id
    );

    const updatedUser = db.prepare(`
      SELECT id, email, shop_name, owner_name, store_category, tagline,
             logo_icon, theme_color, phone, address, receipt_footer,
             gstin, currency, role, gemini_api_key, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({ message: 'Store profile & personalization updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

// -------------------------------------------------------------
// PRODUCT CATALOG ROUTES (MULTI-TENANT AUTHORIZATION)
// -------------------------------------------------------------

// Get products for logged-in shop
app.get('/api/products', requireAuth, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT id, name, hsn_code as hsnCode, price, cost_price as costPrice,
             tax_rate as taxRate, unit, category, stock, updated_at as updatedAt
      FROM products
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(req.user.id);

    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
  }
});

// Add new product
app.post('/api/products', requireAuth, (req, res) => {
  try {
    const { name, hsnCode, price, costPrice, taxRate, unit, category, stock } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Product name and price are required.' });
    }

    const prodId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO products (id, user_id, name, hsn_code, price, cost_price, tax_rate, unit, category, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      prodId,
      req.user.id,
      name.trim(),
      hsnCode ? hsnCode.trim() : '999999',
      parseFloat(price) || 0,
      parseFloat(costPrice) || 0,
      parseFloat(taxRate) || 18,
      unit || 'pcs',
      category || 'General',
      parseInt(stock) || 0
    );

    const created = db.prepare(`
      SELECT id, name, hsn_code as hsnCode, price, cost_price as costPrice,
             tax_rate as taxRate, unit, category, stock, updated_at as updatedAt
      FROM products WHERE id = ?
    `).get(prodId);

    res.status(201).json({ product: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add product: ' + err.message });
  }
});

// Update product
app.put('/api/products/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, hsnCode, price, costPrice, taxRate, unit, category, stock } = req.body;

    const existing = db.prepare('SELECT id FROM products WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found or unauthorized.' });
    }

    db.prepare(`
      UPDATE products
      SET name = COALESCE(?, name),
          hsn_code = COALESCE(?, hsn_code),
          price = COALESCE(?, price),
          cost_price = COALESCE(?, cost_price),
          tax_rate = COALESCE(?, tax_rate),
          unit = COALESCE(?, unit),
          category = COALESCE(?, category),
          stock = COALESCE(?, stock),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      name,
      hsnCode,
      price !== undefined ? parseFloat(price) : null,
      costPrice !== undefined ? parseFloat(costPrice) : null,
      taxRate !== undefined ? parseFloat(taxRate) : null,
      unit,
      category,
      stock !== undefined ? parseInt(stock) : null,
      id,
      req.user.id
    );

    const updated = db.prepare(`
      SELECT id, name, hsn_code as hsnCode, price, cost_price as costPrice,
             tax_rate as taxRate, unit, category, stock, updated_at as updatedAt
      FROM products WHERE id = ?
    `).get(id);

    res.json({ product: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product: ' + err.message });
  }
});

// Delete product
app.delete('/api/products/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found or unauthorized.' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product: ' + err.message });
  }
});

// -------------------------------------------------------------
// END-OF-DAY (EOD) Z-REPORTS ROUTES
// -------------------------------------------------------------

// Get all Z-reports for user (optional filter ?month=YYYY-MM)
app.get('/api/z-reports', requireAuth, (req, res) => {
  try {
    const { month } = req.query;

    let query = `
      SELECT id, date, report_number as reportNumber, closing_time as closingTime,
             store_name as storeName, register_id as registerId,
             gross_sales as grossSales, net_sales as netSales, discount, tax_total as taxTotal,
             total_items_sold as totalItemsSold,
             payment_cash as cash, payment_upi as upi, payment_card as card,
             created_at as uploadedAt
      FROM z_reports
      WHERE user_id = ?
    `;
    const params = [req.user.id];

    if (month) {
      query += ` AND date LIKE ?`;
      params.push(`${month}%`);
    }

    query += ` ORDER BY date DESC`;

    const reports = db.prepare(query).all(...params);

    // Format each report with its items and paymentBreakdown object
    const getItems = db.prepare(`
      SELECT product_name as productName, hsn_code as hsnCode, quantity,
             unit, unit_price as unitPrice, line_total as lineTotal, tax_rate as taxRate
      FROM z_report_items
      WHERE z_report_id = ?
    `);

    const formatted = reports.map(r => ({
      ...r,
      paymentBreakdown: { cash: r.cash, upi: r.upi, card: r.card },
      items: getItems.all(r.id)
    }));

    res.json({ zReports: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Z-reports: ' + err.message });
  }
});

// Get Z-report by date
app.get('/api/z-reports/:date', requireAuth, (req, res) => {
  try {
    const { date } = req.params;

    const report = db.prepare(`
      SELECT id, date, report_number as reportNumber, closing_time as closingTime,
             store_name as storeName, register_id as registerId,
             gross_sales as grossSales, net_sales as netSales, discount, tax_total as taxTotal,
             total_items_sold as totalItemsSold,
             payment_cash as cash, payment_upi as upi, payment_card as card,
             created_at as uploadedAt
      FROM z_reports
      WHERE user_id = ? AND date = ?
    `).get(req.user.id, date);

    if (!report) {
      return res.status(404).json({ report: null });
    }

    const items = db.prepare(`
      SELECT product_name as productName, hsn_code as hsnCode, quantity,
             unit, unit_price as unitPrice, line_total as lineTotal, tax_rate as taxRate
      FROM z_report_items
      WHERE z_report_id = ?
    `).all(report.id);

    res.json({
      report: {
        ...report,
        paymentBreakdown: { cash: report.cash, upi: report.upi, card: report.card },
        items
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report: ' + err.message });
  }
});

// Save or Update Z-Report (with itemized breakdown)
app.post('/api/z-reports', requireAuth, (req, res) => {
  const transaction = db.transaction((reportData) => {
    const reportDate = reportData.date || new Date().toISOString().split('T')[0];
    const reportId = reportData.id || `z-${reportDate}-${Date.now().toString().slice(-4)}`;
    const pay = reportData.paymentBreakdown || {};

    const totalUnits = reportData.totalItemsSold ||
      (reportData.items?.reduce((acc, i) => acc + (parseInt(i.quantity) || 1), 0) || 0);

    // Delete existing Z-report for this date if overwriting
    const existing = db.prepare('SELECT id FROM z_reports WHERE user_id = ? AND date = ?').get(req.user.id, reportDate);
    if (existing) {
      db.prepare('DELETE FROM z_report_items WHERE z_report_id = ?').run(existing.id);
      db.prepare('DELETE FROM z_reports WHERE id = ?').run(existing.id);
    }

    // Insert new Z-report
    db.prepare(`
      INSERT INTO z_reports (
        id, user_id, date, report_number, closing_time, store_name, register_id,
        gross_sales, net_sales, discount, tax_total, total_items_sold,
        payment_cash, payment_upi, payment_card
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      req.user.id,
      reportDate,
      reportData.reportNumber || 'Z-Report',
      reportData.closingTime || '21:30',
      reportData.storeName || req.user.shop_name || 'Retail Store',
      reportData.registerId || 'REG-01',
      parseFloat(reportData.grossSales) || 0,
      parseFloat(reportData.netSales) || 0,
      parseFloat(reportData.discount) || 0,
      parseFloat(reportData.taxTotal) || 0,
      totalUnits,
      parseFloat(pay.cash) || 0,
      parseFloat(pay.upi) || 0,
      parseFloat(pay.card) || 0
    );

    // Insert line items
    const insertItem = db.prepare(`
      INSERT INTO z_report_items (id, z_report_id, user_id, product_name, hsn_code, quantity, unit, unit_price, line_total, tax_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Auto-catalog missing products
    const findProd = db.prepare(`
      SELECT id FROM products WHERE user_id = ? AND (LOWER(TRIM(name)) = LOWER(TRIM(?)) OR hsn_code = ?)
    `);
    const insertNewProd = db.prepare(`
      INSERT INTO products (id, user_id, name, hsn_code, price, cost_price, tax_rate, unit, category, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (reportData.items && Array.isArray(reportData.items)) {
      for (const item of reportData.items) {
        insertItem.run(
          `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          reportId,
          req.user.id,
          item.productName,
          item.hsnCode || '999999',
          parseInt(item.quantity) || 1,
          item.unit || 'pcs',
          parseFloat(item.unitPrice) || 0,
          parseFloat(item.lineTotal) || 0,
          parseFloat(item.taxRate) || 18
        );

        // Auto add to catalog if not present
        const exists = findProd.get(req.user.id, item.productName, item.hsnCode);
        if (!exists) {
          insertNewProd.run(
            `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            req.user.id,
            item.productName,
            item.hsnCode || '999999',
            parseFloat(item.unitPrice) || 0,
            Math.round((parseFloat(item.unitPrice) || 0) * 0.7),
            item.taxRate || 18,
            item.unit || 'pcs',
            'Scanned Items',
            25
          );
        }
      }
    }

    return {
      id: reportId,
      date: reportDate,
      ...reportData
    };
  });

  try {
    const saved = transaction(req.body);
    res.status(201).json({ message: 'Z-Report stored successfully in database', report: saved });
  } catch (err) {
    console.error('Error saving Z-Report:', err);
    res.status(500).json({ error: 'Failed to save Z-Report: ' + err.message });
  }
});

// Delete Z-Report
app.delete('/api/z-reports/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM z_reports WHERE id = ? AND user_id = ?').run(id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Report not found or unauthorized.' });
    }
    res.json({ message: 'Z-Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete report: ' + err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: 'connected', version: '2.0.0' });
});

// Serve frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 RetailKhata Production Backend running on http://127.0.0.1:${PORT}`);
});
