import db, { initDatabase } from './database.js';
import { supabase, isSupabaseEnabled } from './supabase.js';
import bcrypt from 'bcryptjs';

export const isCloudDatabase = () => isSupabaseEnabled();

export const getDbEngineName = () => {
  return isSupabaseEnabled()
    ? 'Supabase Cloud PostgreSQL (Multi-Device Persistent)'
    : 'SQLite WAL (Local Database)';
};

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------

export const getUserByEmail = async (email) => {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
  }
};

export const getUserById = async (id) => {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, shop_name, owner_name, store_category, tagline, logo_icon, theme_color, phone, address, receipt_footer, gstin, currency, role, gemini_api_key, gemini_preferred_model, dark_mode, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } else {
    return db.prepare(`
      SELECT id, email, shop_name, owner_name, store_category, tagline,
             logo_icon, theme_color, phone, address, receipt_footer,
             gstin, currency, role, gemini_api_key, gemini_preferred_model, dark_mode, created_at
      FROM users WHERE id = ?
    `).get(id);
  }
};

export const createUser = async (userData) => {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select('id, email, shop_name, owner_name, store_category, tagline, logo_icon, theme_color, phone, address, receipt_footer, gstin, currency, role, gemini_api_key, gemini_preferred_model, dark_mode, created_at')
      .single();
    if (error) throw error;
    return data;
  } else {
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, shop_name, owner_name, store_category,
        tagline, logo_icon, theme_color, phone, address, receipt_footer,
        gstin, currency, role, gemini_api_key, gemini_preferred_model, dark_mode
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userData.id,
      userData.email,
      userData.password_hash,
      userData.shop_name,
      userData.owner_name || null,
      userData.store_category || 'General Retail',
      userData.tagline || 'Your neighborhood retail shop',
      userData.logo_icon || 'Store',
      userData.theme_color || 'indigo',
      userData.phone || null,
      userData.address || null,
      userData.receipt_footer || 'Thank you for shopping with us! Please visit again.',
      userData.gstin || null,
      userData.currency || '₹',
      userData.role || 'owner',
      userData.gemini_api_key || null,
      userData.gemini_preferred_model || 'gemini-2.0-flash',
      userData.dark_mode ?? 1
    );

    return getUserById(userData.id);
  }
};

export const updateUserProfile = async (id, updates) => {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, shop_name, owner_name, store_category, tagline, logo_icon, theme_color, phone, address, receipt_footer, gstin, currency, role, gemini_api_key, gemini_preferred_model, dark_mode, created_at')
      .single();
    if (error) throw error;
    return data;
  } else {
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
          gemini_api_key = COALESCE(?, gemini_api_key),
          gemini_preferred_model = COALESCE(?, gemini_preferred_model),
          dark_mode = COALESCE(?, dark_mode)
      WHERE id = ?
    `).run(
      updates.shop_name,
      updates.owner_name,
      updates.store_category,
      updates.tagline,
      updates.logo_icon,
      updates.theme_color,
      updates.phone,
      updates.address,
      updates.receipt_footer,
      updates.gstin,
      updates.currency,
      updates.gemini_api_key,
      updates.gemini_preferred_model,
      updates.dark_mode,
      id
    );

    return getUserById(id);
  }
};

// -------------------------------------------------------------
// PRODUCTS OPERATIONS
// -------------------------------------------------------------

export const getProducts = async (userId) => {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data.map(p => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      hsnCode: p.hsn_code,
      price: parseFloat(p.price) || 0,
      costPrice: parseFloat(p.cost_price) || 0,
      taxRate: parseFloat(p.tax_rate) || 18,
      unit: p.unit || 'pcs',
      category: p.category || 'General',
      stock: parseInt(p.stock) || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
  } else {
    return db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY name ASC')
      .all(userId)
      .map(p => ({
        id: p.id,
        userId: p.user_id,
        name: p.name,
        hsnCode: p.hsn_code,
        price: p.price,
        costPrice: p.cost_price,
        taxRate: p.tax_rate,
        unit: p.unit,
        category: p.category,
        stock: p.stock,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
  }
};

export const createProduct = async (productData) => {
  if (isSupabaseEnabled()) {
    const row = {
      id: productData.id,
      user_id: productData.userId,
      name: productData.name.trim(),
      hsn_code: productData.hsnCode || '999999',
      price: parseFloat(productData.price) || 0,
      cost_price: parseFloat(productData.costPrice) || 0,
      tax_rate: parseFloat(productData.taxRate) || 18,
      unit: productData.unit || 'pcs',
      category: productData.category || 'General',
      stock: parseInt(productData.stock) || 0
    };
    const { data, error } = await supabase.from('products').insert([row]).select().single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      hsnCode: data.hsn_code,
      price: parseFloat(data.price),
      costPrice: parseFloat(data.cost_price),
      taxRate: parseFloat(data.tax_rate),
      unit: data.unit,
      category: data.category,
      stock: data.stock
    };
  } else {
    db.prepare(`
      INSERT INTO products (id, user_id, name, hsn_code, price, cost_price, tax_rate, unit, category, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productData.id,
      productData.userId,
      productData.name.trim(),
      productData.hsnCode || '999999',
      parseFloat(productData.price) || 0,
      parseFloat(productData.costPrice) || 0,
      parseFloat(productData.taxRate) || 18,
      productData.unit || 'pcs',
      productData.category || 'General',
      parseInt(productData.stock) || 0
    );

    return productData;
  }
};

export const updateProduct = async (id, userId, updates) => {
  if (isSupabaseEnabled()) {
    const row = {
      name: updates.name,
      hsn_code: updates.hsnCode,
      price: updates.price,
      cost_price: updates.costPrice,
      tax_rate: updates.taxRate,
      unit: updates.unit,
      category: updates.category,
      stock: updates.stock,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('products')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    db.prepare(`
      UPDATE products
      SET name = ?, hsn_code = ?, price = ?, cost_price = ?, tax_rate = ?, unit = ?, category = ?, stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      updates.name,
      updates.hsnCode,
      updates.price,
      updates.costPrice,
      updates.taxRate,
      updates.unit,
      updates.category,
      updates.stock,
      id,
      userId
    );
    return { id, ...updates };
  }
};

export const deleteProduct = async (id, userId) => {
  if (isSupabaseEnabled()) {
    const { error } = await supabase.from('products').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  } else {
    db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(id, userId);
  }
};

// -------------------------------------------------------------
// Z-REPORTS OPERATIONS
// -------------------------------------------------------------

export const getZReports = async (userId, limit = 60) => {
  if (isSupabaseEnabled()) {
    const { data: reports, error: repErr } = await supabase
      .from('z_reports')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    if (repErr) throw repErr;

    const reportIds = reports.map(r => r.id);
    let items = [];
    if (reportIds.length > 0) {
      const { data: itemData, error: itemErr } = await supabase
        .from('z_report_items')
        .select('*')
        .in('z_report_id', reportIds);
      if (itemErr) throw itemErr;
      items = itemData || [];
    }

    return reports.map(r => ({
      id: r.id,
      date: r.date,
      reportNumber: r.report_number,
      closingTime: r.closing_time,
      storeName: r.store_name,
      registerId: r.register_id,
      grossSales: parseFloat(r.gross_sales) || 0,
      netSales: parseFloat(r.net_sales) || 0,
      discount: parseFloat(r.discount) || 0,
      taxTotal: parseFloat(r.tax_total) || 0,
      totalItemsSold: parseInt(r.total_items_sold) || 0,
      paymentBreakdown: {
        cash: parseFloat(r.payment_cash) || 0,
        upi: parseFloat(r.payment_upi) || 0,
        card: parseFloat(r.payment_card) || 0
      },
      rawImageUrl: r.raw_image_url,
      notes: r.notes,
      items: items.filter(i => i.z_report_id === r.id).map(i => ({
        id: i.id,
        name: i.product_name,
        productName: i.product_name,
        hsn: i.hsn_code,
        hsnCode: i.hsn_code,
        quantity: i.quantity,
        qty: i.quantity,
        unit: i.unit,
        price: parseFloat(i.unit_price) || 0,
        unitPrice: parseFloat(i.unit_price) || 0,
        total: parseFloat(i.line_total) || 0,
        lineTotal: parseFloat(i.line_total) || 0,
        taxRate: parseFloat(i.tax_rate) || 18
      }))
    }));
  } else {
    const getItems = db.prepare('SELECT * FROM z_report_items WHERE z_report_id = ?');
    const reports = db.prepare(`
      SELECT * FROM z_reports WHERE user_id = ? ORDER BY date DESC LIMIT ?
    `).all(userId, limit);

    return reports.map(r => ({
      id: r.id,
      date: r.date,
      reportNumber: r.report_number,
      closingTime: r.closing_time,
      storeName: r.store_name,
      registerId: r.register_id,
      grossSales: r.gross_sales,
      netSales: r.net_sales,
      discount: r.discount,
      taxTotal: r.tax_total,
      totalItemsSold: r.total_items_sold,
      paymentBreakdown: {
        cash: r.payment_cash,
        upi: r.payment_upi,
        card: r.payment_card
      },
      rawImageUrl: r.raw_image_url,
      notes: r.notes,
      items: getItems.all(r.id).map(i => ({
        id: i.id,
        name: i.product_name,
        productName: i.product_name,
        hsn: i.hsn_code,
        hsnCode: i.hsn_code,
        quantity: i.quantity,
        qty: i.quantity,
        unit: i.unit,
        price: i.unit_price,
        unitPrice: i.unit_price,
        total: i.line_total,
        lineTotal: i.line_total,
        taxRate: i.tax_rate
      }))
    }));
  }
};

export const getZReportByDate = async (userId, date) => {
  if (isSupabaseEnabled()) {
    const { data: report, error } = await supabase
      .from('z_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();
    if (error) throw error;
    if (!report) return null;

    const { data: items } = await supabase
      .from('z_report_items')
      .select('*')
      .eq('z_report_id', report.id);

    return {
      id: report.id,
      date: report.date,
      reportNumber: report.report_number,
      closingTime: report.closing_time,
      storeName: report.store_name,
      registerId: report.register_id,
      grossSales: parseFloat(report.gross_sales) || 0,
      netSales: parseFloat(report.net_sales) || 0,
      discount: parseFloat(report.discount) || 0,
      taxTotal: parseFloat(report.tax_total) || 0,
      totalItemsSold: parseInt(report.total_items_sold) || 0,
      paymentBreakdown: {
        cash: parseFloat(report.payment_cash) || 0,
        upi: parseFloat(report.payment_upi) || 0,
        card: parseFloat(report.payment_card) || 0
      },
      items: (items || []).map(i => ({
        id: i.id,
        name: i.product_name,
        productName: i.product_name,
        hsnCode: i.hsn_code,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: parseFloat(i.unit_price) || 0,
        lineTotal: parseFloat(i.line_total) || 0,
        taxRate: parseFloat(i.tax_rate) || 18
      }))
    };
  } else {
    const r = db.prepare('SELECT * FROM z_reports WHERE user_id = ? AND date = ?').get(userId, date);
    if (!r) return null;
    const items = db.prepare('SELECT * FROM z_report_items WHERE z_report_id = ?').all(r.id);
    return {
      id: r.id,
      date: r.date,
      reportNumber: r.report_number,
      closingTime: r.closing_time,
      storeName: r.store_name,
      registerId: r.register_id,
      grossSales: r.gross_sales,
      netSales: r.net_sales,
      discount: r.discount,
      taxTotal: r.tax_total,
      totalItemsSold: r.total_items_sold,
      paymentBreakdown: { cash: r.payment_cash, upi: r.payment_upi, card: r.payment_card },
      items: items.map(i => ({
        id: i.id,
        name: i.product_name,
        productName: i.product_name,
        hsnCode: i.hsn_code,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unit_price,
        lineTotal: i.line_total,
        taxRate: i.tax_rate
      }))
    };
  }
};

export const createZReport = async (reportData, items = []) => {
  if (isSupabaseEnabled()) {
    // Delete existing report for this date
    const existing = await getZReportByDate(reportData.userId, reportData.date);
    if (existing) {
      await supabase.from('z_reports').delete().eq('id', existing.id);
    }

    const { error: repErr } = await supabase.from('z_reports').insert([{
      id: reportData.id,
      user_id: reportData.userId,
      date: reportData.date,
      report_number: reportData.reportNumber,
      closing_time: reportData.closingTime,
      store_name: reportData.storeName,
      register_id: reportData.registerId,
      gross_sales: reportData.grossSales,
      net_sales: reportData.netSales,
      discount: reportData.discount,
      tax_total: reportData.taxTotal,
      total_items_sold: reportData.totalItemsSold,
      payment_cash: reportData.paymentCash,
      payment_upi: reportData.paymentUpi,
      payment_card: reportData.paymentCard,
      raw_image_url: reportData.rawImageUrl,
      notes: reportData.notes
    }]);
    if (repErr) throw repErr;

    if (items.length > 0) {
      const formattedItems = items.map(i => ({
        id: i.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        z_report_id: reportData.id,
        user_id: reportData.userId,
        product_name: i.productName || i.name,
        hsn_code: i.hsnCode || i.hsn || '999999',
        quantity: parseInt(i.quantity || i.qty) || 1,
        unit: i.unit || 'pcs',
        unit_price: parseFloat(i.unitPrice || i.price) || 0,
        line_total: parseFloat(i.lineTotal || i.total) || 0,
        tax_rate: parseFloat(i.taxRate) || 18
      }));
      const { error: itemErr } = await supabase.from('z_report_items').insert(formattedItems);
      if (itemErr) throw itemErr;

      // Auto-catalog missing products & update existing product details in Supabase
      const { data: existingProds } = await supabase
        .from('products')
        .select('id, name, price, stock, hsn_code')
        .eq('user_id', reportData.userId);

      const prodMap = new Map();
      (existingProds || []).forEach(p => prodMap.set((p.name || '').toLowerCase().trim(), p));

      for (const item of items) {
        const prodName = (item.productName || item.name || '').trim();
        if (!prodName) continue;
        const key = prodName.toLowerCase();
        const uPrice = parseFloat(item.unitPrice || item.price) || 0;
        const hsn = item.hsnCode || item.hsn || '999999';
        const tax = parseFloat(item.taxRate) || 18;
        const unit = item.unit || 'pcs';

        if (prodMap.has(key)) {
          const match = prodMap.get(key);
          await supabase.from('products').update({
            price: uPrice > 0 ? uPrice : match.price,
            hsn_code: hsn !== '999999' ? hsn : match.hsn_code,
            tax_rate: tax,
            updated_at: new Date().toISOString()
          }).eq('id', match.id);
        } else {
          const newProdId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          await supabase.from('products').insert([{
            id: newProdId,
            user_id: reportData.userId,
            name: prodName,
            hsn_code: hsn,
            price: uPrice,
            cost_price: Math.round(uPrice * 0.7),
            tax_rate: tax,
            unit,
            category: 'Scanned Items',
            stock: 25
          }]);
          prodMap.set(key, { id: newProdId, name: prodName, price: uPrice, hsn_code: hsn });
        }
      }
    }

    return getZReportByDate(reportData.userId, reportData.date);
  } else {
    const existing = db.prepare('SELECT id FROM z_reports WHERE user_id = ? AND date = ?').get(reportData.userId, reportData.date);
    if (existing) {
      db.prepare('DELETE FROM z_report_items WHERE z_report_id = ?').run(existing.id);
      db.prepare('DELETE FROM z_reports WHERE id = ?').run(existing.id);
    }

    db.prepare(`
      INSERT INTO z_reports (
        id, user_id, date, report_number, closing_time, store_name, register_id,
        gross_sales, net_sales, discount, tax_total, total_items_sold,
        payment_cash, payment_upi, payment_card, raw_image_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportData.id,
      reportData.userId,
      reportData.date,
      reportData.reportNumber,
      reportData.closingTime,
      reportData.storeName,
      reportData.registerId,
      reportData.grossSales,
      reportData.netSales,
      reportData.discount,
      reportData.taxTotal,
      reportData.totalItemsSold,
      reportData.paymentCash,
      reportData.paymentUpi,
      reportData.paymentCard,
      reportData.rawImageUrl,
      reportData.notes
    );

    const insertItem = db.prepare(`
      INSERT INTO z_report_items (id, z_report_id, user_id, product_name, hsn_code, quantity, unit, unit_price, line_total, tax_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const findProd = db.prepare(`
      SELECT id, price, hsn_code FROM products 
      WHERE user_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?))
    `);
    const updateExisting = db.prepare(`
      UPDATE products 
      SET price = ?, hsn_code = ?, tax_rate = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const insertNewProd = db.prepare(`
      INSERT INTO products (id, user_id, name, hsn_code, price, cost_price, tax_rate, unit, category, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const prodName = (item.productName || item.name || '').trim();
      const uPrice = parseFloat(item.unitPrice || item.price) || 0;
      const hsn = item.hsnCode || item.hsn || '999999';
      const tax = parseFloat(item.taxRate) || 18;
      const unit = item.unit || 'pcs';
      const qty = parseInt(item.quantity || item.qty) || 1;
      const lTotal = parseFloat(item.lineTotal || item.total) || 0;

      insertItem.run(
        item.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        reportData.id,
        reportData.userId,
        prodName || 'Item',
        hsn,
        qty,
        unit,
        uPrice,
        lTotal,
        tax
      );

      // Auto add / update in product catalog
      if (prodName) {
        const match = findProd.get(reportData.userId, prodName);
        if (match) {
          updateExisting.run(uPrice > 0 ? uPrice : match.price, hsn !== '999999' ? hsn : match.hsn_code, tax, match.id);
        } else {
          insertNewProd.run(
            `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            reportData.userId,
            prodName,
            hsn,
            uPrice,
            Math.round(uPrice * 0.7),
            tax,
            unit,
            'Scanned Items',
            25
          );
        }
      }
    }

    return getZReportByDate(reportData.userId, reportData.date);
  }
};

export const deleteZReport = async (id, userId) => {
  if (isSupabaseEnabled()) {
    const { error } = await supabase.from('z_reports').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  } else {
    db.prepare('DELETE FROM z_report_items WHERE z_report_id = ? AND user_id = ?').run(id, userId);
    db.prepare('DELETE FROM z_reports WHERE id = ? AND user_id = ?').run(id, userId);
  }
};

// -------------------------------------------------------------
// BACKUP & STATUS
// -------------------------------------------------------------

export const getDatabaseStatus = async (userId) => {
  if (isSupabaseEnabled()) {
    const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const { count: repCount } = await supabase.from('z_reports').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const { data: revData } = await supabase.from('z_reports').select('net_sales').eq('user_id', userId);
    const totalRev = (revData || []).reduce((acc, r) => acc + (parseFloat(r.net_sales) || 0), 0);

    return {
      persistent: true,
      cloud: true,
      engine: 'Supabase Cloud PostgreSQL (Multi-Device Active)',
      totalProducts: prodCount || 0,
      totalZReports: repCount || 0,
      totalRevenue: totalRev,
      lastSynced: new Date().toISOString()
    };
  } else {
    const prodCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?').get(userId).count;
    const repCount = db.prepare('SELECT COUNT(*) as count FROM z_reports WHERE user_id = ?').get(userId).count;
    const totalRev = db.prepare('SELECT SUM(net_sales) as total FROM z_reports WHERE user_id = ?').get(userId).total || 0;

    return {
      persistent: true,
      cloud: false,
      engine: 'SQLite WAL (Local Database)',
      totalProducts: prodCount,
      totalZReports: repCount,
      totalRevenue: totalRev,
      lastSynced: new Date().toISOString()
    };
  }
};

export const exportBackupData = async (userId) => {
  const user = await getUserById(userId);
  const products = await getProducts(userId);
  const zReports = await getZReports(userId, null, 1000);
  return {
    app: 'RetailKhata',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    user,
    products,
    zReports
  };
};

export const importBackupData = async (userId, backupData) => {
  let importedProducts = 0;
  let importedReports = 0;

  if (backupData.user) {
    await updateUserProfile(userId, backupData.user);
  }

  if (Array.isArray(backupData.products)) {
    for (const p of backupData.products) {
      await createProduct({
        id: p.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId,
        name: p.name,
        hsnCode: p.hsnCode || p.hsn_code,
        price: p.price,
        costPrice: p.costPrice || p.cost_price,
        taxRate: p.taxRate || p.tax_rate,
        unit: p.unit,
        category: p.category,
        stock: p.stock
      });
      importedProducts++;
    }
  }

  if (Array.isArray(backupData.zReports)) {
    for (const r of backupData.zReports) {
      await createZReport({
        id: r.id || `z-${r.date}-${Date.now().toString().slice(-4)}`,
        userId,
        date: r.date,
        reportNumber: r.reportNumber,
        closingTime: r.closingTime,
        storeName: r.storeName,
        registerId: r.registerId,
        grossSales: r.grossSales,
        netSales: r.netSales,
        discount: r.discount,
        taxTotal: r.taxTotal,
        totalItemsSold: r.totalItemsSold,
        paymentCash: r.paymentBreakdown?.cash ?? r.cash,
        paymentUpi: r.paymentBreakdown?.upi ?? r.upi,
        paymentCard: r.paymentBreakdown?.card ?? r.card,
        rawImageUrl: r.rawImageUrl,
        notes: r.notes
      }, r.items || []);
      importedReports++;
    }
  }

  return { importedProducts, importedReports };
};

export const bulkSync = async (userId, products = [], zReports = []) => {
  let addedProducts = 0;
  let addedReports = 0;

  const currentProducts = await getProducts(userId);
  const currentProdsByName = new Set(currentProducts.map(p => (p.name || '').toLowerCase().trim()));

  if (Array.isArray(products)) {
    for (const p of products) {
      if (p.name && !currentProdsByName.has(p.name.toLowerCase().trim())) {
        await createProduct({
          id: p.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId,
          name: p.name,
          hsnCode: p.hsnCode || '999999',
          price: p.price,
          costPrice: p.costPrice,
          taxRate: p.taxRate,
          unit: p.unit,
          category: p.category,
          stock: p.stock
        });
        currentProdsByName.add(p.name.toLowerCase().trim());
        addedProducts++;
      }
    }
  }

  if (Array.isArray(zReports)) {
    for (const r of zReports) {
      const existing = await getZReportByDate(userId, r.date);
      if (!existing && r.date) {
        await createZReport({
          id: r.id || `z-${r.date}-${Date.now().toString().slice(-4)}`,
          userId,
          date: r.date,
          reportNumber: r.reportNumber || 'Z-Report',
          closingTime: r.closingTime || '21:30',
          storeName: r.storeName || 'Retail Store',
          registerId: r.registerId || 'REG-01',
          grossSales: r.grossSales,
          netSales: r.netSales,
          discount: r.discount,
          taxTotal: r.taxTotal,
          totalItemsSold: r.totalItemsSold,
          paymentCash: r.paymentBreakdown?.cash ?? r.cash,
          paymentUpi: r.paymentBreakdown?.upi ?? r.upi,
          paymentCard: r.paymentBreakdown?.card ?? r.card,
          rawImageUrl: r.rawImageUrl,
          notes: r.notes
        }, r.items || []);
        addedReports++;
      }
    }
  }

  const updatedProducts = await getProducts(userId);
  const updatedReports = await getZReports(userId);

  return {
    stats: { addedProducts, addedReports },
    products: updatedProducts,
    zReports: updatedReports
  };
};
