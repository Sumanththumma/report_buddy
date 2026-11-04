import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Package, 
  Check, 
  X, 
  Tag, 
  Boxes, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';

export const ProductsTab = () => {
  const { products, addProduct, updateProduct, deleteProduct, shopProfile, setActiveTab } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  // Dynamic categories computed from user's authentic products
  const categoryList = Array.from(new Set(products.map(p => (p.category || 'General').trim()).filter(Boolean)));
  const availableCategories = ['ALL', ...categoryList];

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    hsnCode: '',
    price: '',
    costPrice: '',
    taxRate: 18,
    unit: 'pcs',
    category: 'General',
    stock: 25
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      hsnCode: '',
      price: '',
      costPrice: '',
      taxRate: 18,
      unit: 'pcs',
      category: 'General',
      stock: 20
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      hsnCode: prod.hsnCode || '',
      price: prod.price || '',
      costPrice: prod.costPrice || '',
      taxRate: prod.taxRate ?? 18,
      unit: prod.unit || 'pcs',
      category: prod.category || 'General',
      stock: prod.stock ?? 20
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, formData);
    } else {
      addProduct(formData);
    }

    setIsModalOpen(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.hsnCode && p.hsnCode.includes(search));
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Header and Add Button */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-rust-600 dark:text-rust-400 stroke-[2]" />
                Products Catalog
              </h2>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                Holy Grail Master
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-zinc-400 font-medium mt-0.5">
              {products.length} registered item{products.length === 1 ? '' : 's'} • Authoritative reference for HSN, GST & variety merges
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="py-1.5 px-3 rounded-full bg-gradient-to-r from-rust-700 to-copper-600 text-white font-display font-bold text-xs flex items-center gap-1 shadow-spray-rust hover:opacity-95 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or HSN code..."
            className="w-full text-xs bg-neutral-50 dark:bg-zinc-850 border border-neutral-200 dark:border-zinc-800 rounded-xl px-3 py-2 pl-8 outline-none focus:border-neutral-500 text-neutral-900 dark:text-zinc-100 placeholder:text-neutral-500 dark:placeholder:text-zinc-500"
          />
          <Search className="w-3.5 h-3.5 text-neutral-500 dark:text-zinc-400 absolute left-2.5 top-2.5" />
        </div>

        {/* Dynamic Category Pills based on store's actual products */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-display font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-rust-700 to-copper-600 text-white shadow-spray-rust'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-200'
              }`}
            >
              {cat === 'ALL' ? 'All Items' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-2.5">
        {products.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-neutral-200/80 dark:border-zinc-800/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rust-50 dark:bg-rust-950/60 border border-rust-200 dark:border-rust-800/60 flex items-center justify-center mx-auto text-rust-600 dark:text-rust-400 shadow-spray-rust">
              <Package className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-neutral-800 dark:text-zinc-200">Catalog is Empty</p>
              <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                Scan your daily Z-Report to discover items and assign their categories, or add products manually.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setActiveTab('ai_scan')}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-rust-700 to-copper-600 text-white font-display font-bold text-xs shadow-spray-rust flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Scan Z-Report
              </button>
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-neutral-800 dark:text-zinc-200 font-display font-semibold text-xs border border-neutral-200 dark:border-zinc-700 transition-all active:scale-95"
              >
                + Add Product
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-neutral-200/80 dark:border-zinc-800/80 text-center text-neutral-400 dark:text-zinc-500">
            <Package className="w-9 h-9 mx-auto text-neutral-300 dark:text-zinc-700 mb-2 stroke-1" />
            <p className="font-display font-bold text-xs text-neutral-700 dark:text-zinc-300">No matching products found</p>
            <p className="text-[11px] text-neutral-400 dark:text-zinc-500 mt-0.5">Try searching another keyword or clearing category filters.</p>
          </div>
        ) : (
          filteredProducts.map(product => {
            const margin = product.price && product.costPrice 
              ? Math.round(((product.price - product.costPrice) / product.price) * 100) 
              : null;

            return (
              <div 
                key={product.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-zinc-800/80 shadow-2xs hover:border-neutral-300 dark:hover:border-zinc-700 transition-all space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100">
                        {product.name}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 border border-neutral-200 dark:border-zinc-700/60">
                        HSN: {product.hsnCode || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-neutral-600 dark:text-zinc-400 mt-1 font-medium">
                      <span>{product.category || 'General'}</span>
                      <span>•</span>
                      <span>Unit: {product.unit || 'pcs'}</span>
                      <span>•</span>
                      <span>GST: {product.taxRate ?? 18}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-zinc-100 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Edit Product"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductToDelete(product)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price and Stock Row */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-zinc-800/80 text-xs">
                  <div className="flex items-baseline space-x-2">
                    <span className="font-display font-extrabold text-sm text-neutral-900 dark:text-neutral-100">
                      {shopProfile.currency}{product.price?.toLocaleString()}
                    </span>
                    {product.costPrice > 0 && (
                      <span className="text-[10px] text-neutral-600 dark:text-zinc-400 font-display">
                        Cost: {shopProfile.currency}{product.costPrice}
                      </span>
                    )}
                    {margin !== null && (
                      <span className="text-[9px] font-display font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">
                        +{margin}%
                      </span>
                    )}
                  </div>

                  <div>
                    <span className={`text-[10px] font-display font-semibold px-2 py-0.5 rounded-full ${
                      (product.stock || 0) < 10
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {product.stock ?? 0} {product.unit || 'pcs'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-neutral-200/80 dark:border-zinc-800/80 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-800">
              <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-neutral-700 dark:text-zinc-300" />
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* Product Name */}
              <div>
                <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cotton Polo T-Shirt"
                  className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-zinc-100 outline-none focus:border-neutral-500 font-semibold"
                />
              </div>

              {/* HSN Code & Category */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    HSN Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    placeholder="e.g. 61091000"
                    className="w-full font-mono bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-zinc-100 font-bold outline-none focus:border-neutral-500"
                  />
                  <span className="text-[9px] text-neutral-400 dark:text-zinc-500 mt-0.5 block">GST classification</span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    list="product-category-suggestions"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Sarees & Fabrics, Blouse Materials..."
                    className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-zinc-100 font-semibold text-xs outline-none focus:border-rust-500"
                  />
                  <datalist id="product-category-suggestions">
                    {categoryList.map(c => <option key={c} value={c} />)}
                    <option value="Sarees & Fabrics" />
                    <option value="Blouse Materials" />
                    <option value="Ethnic Wear" />
                    <option value="Apparel" />
                    <option value="Groceries" />
                    <option value="Electronics" />
                    <option value="General Retail" />
                  </datalist>
                  <span className="text-[9px] text-neutral-400 dark:text-zinc-500 mt-0.5 block">Type custom or pick above</span>
                </div>
              </div>

              {/* Selling Price & Cost Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    Selling Price ({shopProfile.currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-zinc-100 font-display font-bold outline-none focus:border-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    Cost Price ({shopProfile.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-zinc-100 font-display outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              {/* Unit, Tax Rate & Stock */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-neutral-900 dark:text-zinc-100 outline-none"
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="g">gram</option>
                    <option value="box">box</option>
                    <option value="pack">pack</option>
                    <option value="jar">jar</option>
                    <option value="mtr">mtr</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    GST Rate %
                  </label>
                  <select
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-neutral-900 dark:text-zinc-100 outline-none"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-500 dark:text-zinc-400 uppercase mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-2 py-2 text-center text-neutral-900 dark:text-zinc-100 font-display font-bold outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 font-display font-semibold text-xs hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-rust-700 via-rust-600 to-copper-600 hover:from-rust-600 hover:to-copper-500 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-spray-rust transition-all active:scale-[0.98]"
                >
                  <Check className="w-4 h-4 stroke-[2]" />
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom 2-Step Confirmation Modal for Product Delete */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Delete Product from Catalog?
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-zinc-400 mt-0.5">
                  Are you sure you want to permanently delete this product?
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-zinc-850/80 border border-neutral-100 dark:border-zinc-800 text-xs space-y-1.5">
              <div className="flex justify-between text-neutral-600 dark:text-zinc-400">
                <span>Product Name:</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">{productToDelete.name}</span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-zinc-400">
                <span>Category:</span>
                <span className="text-neutral-900 dark:text-neutral-100">{productToDelete.category || 'General'}</span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-zinc-400">
                <span>HSN Code:</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">{productToDelete.hsnCode || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-zinc-400">
                <span>Selling Price:</span>
                <span className="font-display font-bold text-neutral-900 dark:text-neutral-100">
                  {shopProfile.currency}{productToDelete.price?.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 dark:text-zinc-400">
              Past Z-Reports and daily journal entries that recorded sales of this product will keep their historical records intact.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-neutral-800 dark:text-zinc-200 font-display font-semibold text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
