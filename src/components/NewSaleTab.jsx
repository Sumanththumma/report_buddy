import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Check, 
  Search, 
  Calendar, 
  User, 
  CreditCard, 
  Sparkles,
  ArrowRight,
  Printer,
  RotateCcw
} from 'lucide-react';

export const NewSaleTab = () => {
  const { products, addSale, addProduct, shopProfile, setActiveTab } = useApp();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [cartItems, setCartItems] = useState([]);
  
  // Selected product state for adding
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customHsn, setCustomHsn] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customTaxRate, setCustomTaxRate] = useState(18);

  const [discount, setDiscount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuccessModal, setIsSuccessModal] = useState(null);

  // Filter products by search query
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.hsnCode && p.hsnCode.includes(searchQuery))
  );

  // Handle selecting an existing product
  const handleSelectProduct = (prod) => {
    setSelectedProductId(prod.id);
    setCustomName(prod.name);
    setCustomHsn(prod.hsnCode || '999999');
    setCustomPrice(prod.price || 0);
    setCustomTaxRate(prod.taxRate ?? 18);
    setCustomQty(1);
  };

  // Add item to cart
  const handleAddToCart = () => {
    if (!customName.trim()) return;
    const priceNum = parseFloat(customPrice) || 0;
    const qtyNum = parseInt(customQty) || 1;

    const newItem = {
      id: `cart-item-${Date.now()}`,
      productId: selectedProductId || null,
      productName: customName.trim(),
      hsnCode: customHsn.trim() || '999999',
      quantity: qtyNum,
      price: priceNum,
      lineTotal: Math.round(priceNum * qtyNum),
      taxRate: parseFloat(customTaxRate) || 0
    };

    setCartItems(prev => [...prev, newItem]);

    // Reset inputs
    setSelectedProductId('');
    setCustomName('');
    setCustomHsn('');
    setCustomPrice('');
    setCustomQty(1);
    setSearchQuery('');
  };

  const handleRemoveItem = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemQty = (index, delta) => {
    setCartItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, (item.quantity || 1) + delta);
        return {
          ...item,
          quantity: newQty,
          lineTotal: Math.round(item.price * newQty)
        };
      }
      return item;
    }));
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (item.lineTotal || 0), 0);
  const discountNum = Math.min(subtotal, Math.max(0, parseFloat(discount) || 0));
  const grandTotal = Math.max(0, subtotal - discountNum);

  // Complete Sale
  const handleCompleteSale = () => {
    if (cartItems.length === 0) return;

    const saleRecord = {
      date,
      customerName: customerName.trim() || 'Walk-in Customer',
      paymentMode,
      items: cartItems,
      subtotal,
      discount: discountNum,
      grandTotal,
      source: 'manual'
    };

    const savedSale = addSale(saleRecord);
    setIsSuccessModal(savedSale);
  };

  const resetForm = () => {
    setCartItems([]);
    setCustomerName('Walk-in Customer');
    setDiscount(0);
    setIsSuccessModal(null);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Transaction Details Header Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
            Billing Info
          </span>
          <div className="flex items-center space-x-1">
            <span className="text-[11px] text-slate-400">Date:</span>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Customer Name */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase">Customer Name</label>
            <div className="relative mt-1">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 pl-7 text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
              />
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full mt-1 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="Card">Card (Debit/Credit)</option>
              <option value="Credit">Credit / Udhaar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Selection / Item Addition Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Select or Add Product
          </h3>
          <span className="text-[11px] text-indigo-600 font-medium">
            HSN code auto-syncs
          </span>
        </div>

        {/* Quick Product Search / Dropdown */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search from catalog by name or HSN..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-8 focus:bg-white focus:border-indigo-500 outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        {/* Search Results Drawer (if searching) */}
        {searchQuery.trim() && (
          <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50 text-xs">
            {filteredProducts.length === 0 ? (
              <p className="p-2.5 text-center text-slate-400 text-xs">No matching product found. You can enter details manually below!</p>
            ) : (
              filteredProducts.map(prod => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleSelectProduct(prod)}
                  className="w-full text-left p-2.5 hover:bg-indigo-50 flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{prod.name}</span>
                    <span className="ml-2 text-[10px] text-slate-500 font-mono bg-slate-200/70 px-1.5 py-0.5 rounded">
                      HSN: {prod.hsnCode}
                    </span>
                  </div>
                  <span className="font-bold text-indigo-600">{shopProfile.currency}{prod.price}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Selected / Current Item Input Fields */}
        <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 space-y-2.5">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase">Product Name *</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Cotton Polo T-Shirt"
              className="w-full mt-1 text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase">HSN Code</label>
              <input
                type="text"
                value={customHsn}
                onChange={(e) => setCustomHsn(e.target.value)}
                placeholder="e.g. 6109"
                className="w-full mt-1 text-xs font-mono font-medium bg-white border border-slate-200 rounded-xl px-2 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase">Price ({shopProfile.currency}) *</label>
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0"
                className="w-full mt-1 text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2 py-2 text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase">Qty</label>
              <div className="flex items-center mt-1">
                <button
                  type="button"
                  onClick={() => setCustomQty(Math.max(1, customQty - 1))}
                  className="w-7 h-8 bg-slate-200 rounded-l-lg text-slate-700 font-bold text-xs"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-8 text-center text-xs font-bold bg-white border-y border-slate-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCustomQty(customQty + 1)}
                  className="w-7 h-8 bg-slate-200 rounded-r-lg text-slate-700 font-bold text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!customName.trim()}
            className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add to Current Bill
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Bill Items ({cartItems.length})
          </h3>
          {cartItems.length > 0 && (
            <button
              onClick={() => setCartItems([])}
              className="text-[11px] text-red-500 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
            <p className="text-xs font-medium">No items in this bill yet</p>
            <p className="text-[10px] text-slate-400">Select an item above to add it to the cart.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cartItems.map((item, index) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">{item.productName}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold">
                      HSN: {item.hsnCode}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {shopProfile.currency}{item.price} each
                  </span>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center space-x-1 mr-3">
                  <button
                    onClick={() => updateItemQty(index, -1)}
                    className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold text-slate-800 text-xs">{item.quantity}</span>
                  <button
                    onClick={() => updateItemQty(index, 1)}
                    className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>

                <div className="text-right">
                  <span className="block font-bold text-slate-900">
                    {shopProfile.currency}{item.lineTotal?.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="text-[10px] text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bill Calculation Totals */}
        {cartItems.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{shopProfile.currency}{subtotal.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-slate-500">
              <span>Discount ({shopProfile.currency})</span>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-20 text-right text-xs bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 outline-none font-medium"
              />
            </div>

            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total</span>
              <span className="text-indigo-600 text-base">
                {shopProfile.currency}{grandTotal.toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleCompleteSale}
              className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              Record Sale ({shopProfile.currency}{grandTotal.toLocaleString()})
            </button>
          </div>
        )}
      </div>

      {/* Success Modal / Receipt Preview */}
      {isSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Sale Logged Successfully!</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Invoice #{isSuccessModal.invoiceNumber}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Customer:</span>
                <span className="font-semibold text-slate-800">{isSuccessModal.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Payment:</span>
                <span className="font-semibold text-slate-800">{isSuccessModal.paymentMode}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Items:</span>
                <span className="font-semibold text-slate-800">
                  {isSuccessModal.items?.reduce((a, b) => a + b.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Amount Paid:</span>
                <span className="text-emerald-600 text-sm">{shopProfile.currency}{isSuccessModal.grandTotal}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={resetForm}
                className="py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Bill
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
