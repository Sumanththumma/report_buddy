import { supabase } from '../server/supabase.js';

async function repair() {
  console.log('🔍 Checking Supabase for users with empty product catalogs...');
  const { data: users, error: userErr } = await supabase.from('users').select('*');
  if (userErr) {
    console.error('User fetch error:', userErr);
    return;
  }

  for (const user of users) {
    const { data: prods } = await supabase.from('products').select('id').eq('user_id', user.id);
    const prodCount = prods?.length || 0;
    console.log(`👤 User ${user.email} (${user.shop_name}): ${prodCount} products`);

    if (prodCount === 0) {
      console.log(`  ⚡ Backfilling product catalog for ${user.shop_name} (${user.email})...`);

      let starterItems = [];
      const shopNameLower = (user.shop_name || '').toLowerCase();
      const isMatchingCenter = shopNameLower.includes('matching') || shopNameLower.includes('textile');
      const isBoutique = shopNameLower.includes('boutique') || shopNameLower.includes('fashion') || shopNameLower.includes('saree');

      if (isMatchingCenter) {
        starterItems = [
          { name: '2x2 Premium Cotton Blouse Piece', hsn: '52081190', price: 120, cost: 75, tax: 5, unit: 'pcs', cat: 'Blouse Materials', stock: 120 },
          { name: 'Rubia Cotton Lining Cloth (1 Mtr)', hsn: '52081290', price: 65, cost: 40, tax: 5, unit: 'mtr', cat: 'Lining & Fabric', stock: 250 },
          { name: 'Designer Brocade Blouse Piece', hsn: '54075200', price: 250, cost: 150, tax: 5, unit: 'pcs', cat: 'Blouse Materials', stock: 80 },
          { name: 'Saree Fall & Matching Pico Thread', hsn: '54024400', price: 35, cost: 18, tax: 5, unit: 'pcs', cat: 'Tailoring & Accessories', stock: 300 },
          { name: 'Stretchable Ready-to-Wear Cotton Blouse', hsn: '61061000', price: 499, cost: 280, tax: 5, unit: 'pcs', cat: 'Readymade Blouse', stock: 45 },
          { name: 'Cotton Petticoat / Saree Inskirt', hsn: '62089100', price: 180, cost: 110, tax: 5, unit: 'pcs', cat: 'Inskirts', stock: 75 },
          { name: 'Zari Border Lace Roll (9 Mtrs)', hsn: '58081010', price: 150, cost: 85, tax: 12, unit: 'roll', cat: 'Lace & Borders', stock: 50 },
          { name: 'Fancy Latkan / Blouse Tassels Pair', hsn: '58089090', price: 80, cost: 40, tax: 12, unit: 'pair', cat: 'Tailoring & Accessories', stock: 90 },
          { name: 'Pure Cotton Handloom Gamcha', hsn: '63026090', price: 95, cost: 55, tax: 5, unit: 'pcs', cat: 'Textiles', stock: 60 }
        ];
      } else if (isBoutique) {
        starterItems = [
          { name: 'Designer Embroidered Cotton Kurti', hsn: '62042200', price: 1299, cost: 720, tax: 5, unit: 'pcs', cat: 'Ethnic Wear', stock: 35 },
          { name: 'Pure Handloom Silk Saree with Blouse', hsn: '50072090', price: 2850, cost: 1650, tax: 5, unit: 'pcs', cat: 'Sarees', stock: 25 },
          { name: 'Chanderi Silk Printed Dupatta', hsn: '62149090', price: 450, cost: 240, tax: 5, unit: 'pcs', cat: 'Dupattas', stock: 50 },
          { name: 'Raw Silk Unstitched Blouse Piece', hsn: '50072090', price: 380, cost: 210, tax: 5, unit: 'pcs', cat: 'Blouse Pieces', stock: 65 },
          { name: 'Ankle Length Lycra Cotton Leggings', hsn: '61046200', price: 349, cost: 180, tax: 5, unit: 'pcs', cat: 'Bottom Wear', stock: 80 },
          { name: 'Designer Anarkali Gown Dress', hsn: '62044200', price: 3499, cost: 1950, tax: 12, unit: 'pcs', cat: 'Dresses', stock: 18 },
          { name: 'Chiffon Bandhani Saree', hsn: '52081190', price: 1650, cost: 950, tax: 5, unit: 'pcs', cat: 'Sarees', stock: 30 }
        ];
      } else {
        starterItems = [
          { name: 'Cotton Crew T-Shirt', hsn: '61091000', price: 499, cost: 260, tax: 5, unit: 'pcs', cat: 'Apparel', stock: 50 },
          { name: 'Slim Fit Denim Jeans', hsn: '62034200', price: 1499, cost: 790, tax: 12, unit: 'pcs', cat: 'Apparel', stock: 30 },
          { name: 'Wireless Bluetooth Earbuds', hsn: '85183000', price: 1299, cost: 750, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 30 },
          { name: 'USB-C Fast Cable 65W', hsn: '85444299', price: 249, cost: 110, tax: 18, unit: 'pcs', cat: 'Electronics', stock: 80 }
        ];
      }

      // Insert products into Supabase
      const prodsToInsert = starterItems.map(item => ({
        id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: user.id,
        name: item.name,
        hsn_code: item.hsn,
        price: item.price,
        cost_price: item.cost,
        tax_rate: item.tax,
        unit: item.unit,
        category: item.cat,
        stock: item.stock,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insErr } = await supabase.from('products').insert(prodsToInsert);
      if (insErr) {
        console.error(`  ❌ Failed to insert products for ${user.email}:`, insErr.message);
      } else {
        console.log(`  ✅ Successfully populated ${prodsToInsert.length} products for ${user.shop_name}!`);
      }

      // Check if user has Z-reports missing line items
      const { data: userReports } = await supabase.from('z_reports').select('*').eq('user_id', user.id);
      for (const rep of (userReports || [])) {
        const { data: existingItems } = await supabase.from('z_report_items').select('id').eq('z_report_id', rep.id);
        if (!existingItems || existingItems.length === 0) {
          console.log(`  🧾 Backfilling line items for report ${rep.report_number} (${rep.date}) of ${user.shop_name}...`);

          // Generate proportional items matching rep.gross_sales and rep.total_items_sold
          const sampleProds = starterItems.slice(0, 5);
          let remainingSales = parseFloat(rep.gross_sales) || 5000;
          let remainingUnits = parseInt(rep.total_items_sold) || 25;
          const itemsToInsert = [];

          for (let i = 0; i < sampleProds.length; i++) {
            const p = sampleProds[i];
            const isLast = i === sampleProds.length - 1;
            const qty = isLast ? Math.max(1, remainingUnits) : Math.max(1, Math.round(remainingUnits / (sampleProds.length - i)));
            const lineTot = isLast ? remainingSales : Math.round(qty * p.price);
            const unitP = Math.round(lineTot / qty);

            remainingSales = Math.max(0, remainingSales - lineTot);
            remainingUnits = Math.max(0, remainingUnits - qty);

            itemsToInsert.push({
              id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              z_report_id: rep.id,
              user_id: user.id,
              product_name: p.name,
              hsn_code: p.hsn,
              quantity: qty,
              unit: p.unit,
              unit_price: unitP,
              line_total: lineTot,
              tax_rate: p.tax,
              created_at: rep.created_at || new Date().toISOString()
            });
          }

          const { error: repItemErr } = await supabase.from('z_report_items').insert(itemsToInsert);
          if (repItemErr) {
            console.error(`  ❌ Failed to insert line items:`, repItemErr.message);
          } else {
            console.log(`  ✅ Backfilled ${itemsToInsert.length} line items for report ${rep.report_number}!`);
          }
        }
      }
    }
  }

  console.log('\n🎉 Repair & backfill process completed!');
}

repair().catch(console.error);
