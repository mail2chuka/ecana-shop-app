'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, PageHeader, Card, EmptyRow, Modal, FormButtons, Field, inputCls, CurrencyInput, StatusPill } from '@/components/ui';
import { formatNaira, formatDate, formatCustomerLabel } from '@/lib/format';
import toast from 'react-hot-toast';

const blankProductForm = { name: '', unit: 'unit', price: '', stockQuantity: 0, cementBrand: '' };

export default function ShopPage() {
  const [tab, setTab] = useState('inventory');
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [atcs, setAtcs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);

  // Manage Products modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(blankProductForm);
  const [submitting, setSubmitting] = useState(false);

  // Receive Stock modal
  const [restockModal, setRestockModal] = useState(null);
  const [restockSource, setRestockSource] = useState('manual');
  const [restockAtc, setRestockAtc] = useState('');
  const [restockQty, setRestockQty] = useState('');

  // Record Sale state
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartProduct, setCartProduct] = useState('');
  const [cartQty, setCartQty] = useState('');
  const [cartPrice, setCartPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const load = async () => {
    setLoading(true);
    const [p, a, c, s] = await Promise.all([
      fetch('/api/shop-products').then(r => r.json()),
      fetch('/api/atcs?availableForSale=true').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/sales?type=shop').then(r => r.json()),
    ]);
    if (p.success) setProducts(p.data);
    if (a.success) setAtcs(a.data);
    if (c.success) {
      setCustomers(c.data);
      setSelectedCustomer(prev => prev || c.data.find(x => x.name.toLowerCase() === 'walk-in customer') || null);
    }
    if (s.success) setSales(s.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (customerSearch) {
      setFilteredCustomers(
        customers.filter(c =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch) ||
          (c.businessName || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
          (c.customerId || '').includes(customerSearch)
        )
      );
      setShowCustomerDrop(true);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, customers]);

  // --- Manage Products ---
  const openCreateProduct = () => { setEditingProduct(null); setProductForm(blankProductForm); setShowProductModal(true); };
  const openEditProduct = (p) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, unit: p.unit, price: p.price, stockQuantity: p.stockQuantity, cementBrand: p.cementBrand || '' });
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingProduct ? `/api/shop-products/${editingProduct._id}` : '/api/shop-products';
      const method = editingProduct ? 'PUT' : 'POST';
      const body = { ...productForm, price: Number(productForm.price), stockQuantity: Number(productForm.stockQuantity) || 0 };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { toast.success(editingProduct ? 'Updated' : 'Product added'); setShowProductModal(false); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateProduct = async (p) => {
    if (!confirm(`Deactivate ${p.name}?`)) return;
    const r = await fetch(`/api/shop-products/${p._id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.success) { toast.success('Deactivated'); load(); }
    else toast.error(d.error);
  };

  // --- Receive Stock ---
  const openRestock = (p) => {
    setRestockModal(p);
    setRestockSource(p.cementBrand ? 'atc' : 'manual');
    setRestockAtc('');
    setRestockQty('');
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!restockQty || restockQty <= 0) return toast.error('Enter a valid quantity');
    if (restockSource === 'atc' && !restockAtc) return toast.error('Select an ATC');
    setSubmitting(true);
    try {
      const body = { quantity: Number(restockQty), atcId: restockSource === 'atc' ? restockAtc : undefined };
      const r = await fetch(`/api/shop-products/${restockModal._id}/restock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) { toast.success('Stock received'); setRestockModal(null); load(); }
      else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Record Sale ---
  const addToCart = () => {
    const product = products.find(p => p._id === cartProduct);
    if (!product) return toast.error('Select a product');
    const qty = parseFloat(cartQty);
    if (!qty || qty <= 0) return toast.error('Enter a valid quantity');
    if (qty > product.stockQuantity) return toast.error(`Only ${product.stockQuantity} ${product.unit}(s) in stock`);
    const price = parseFloat(cartPrice) || product.price;

    setCart(prev => [...prev, {
      id: Date.now(),
      productId: product._id,
      name: product.name,
      unit: product.unit,
      qty,
      price,
      total: qty * price,
    }]);
    setCartProduct(''); setCartQty(''); setCartPrice('');
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(c => c.id !== id));
  const cartTotal = cart.reduce((s, c) => s + c.total, 0);

  const submitSale = async () => {
    if (!selectedCustomer) return toast.error('Select a customer');
    if (cart.length === 0) return toast.error('Add at least one item');
    setSubmitting(true);
    try {
      const items = cart.map(c => ({
        itemType: 'shop',
        shopProduct: c.productId,
        billQuantity: c.qty,
        unitPrice: c.price,
      }));
      const r = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleType: 'shop',
          customer: selectedCustomer._id,
          date: new Date(),
          items,
          discount: 0,
          transportFee: 0,
          paymentMethod,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Sale ${d.data.saleNumber} recorded`);
        setCart([]); setSelectedCustomer(null); setCustomerSearch('');
        load();
        setTab('history');
      } else toast.error(d.error);
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSale = async (sale) => {
    const reason = prompt(`Delete sale ${sale.saleNumber}? This permanently removes it and restores stock. Reason:`);
    if (!reason) return;
    const r = await fetch(`/api/sales/${sale._id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const d = await r.json();
    if (d.success) { toast.success('Sale deleted, stock restored'); load(); }
    else toast.error(d.error);
  };

  const tabs = [
    { id: 'inventory', label: 'Inventory' },
    { id: 'sell', label: 'Record Sale' },
    { id: 'history', label: 'Sales History' },
    { id: 'manage', label: 'Manage Products' },
  ];

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader title="Shop" subtitle="Retail counter — its own products, stock, and walk-in sales" />

      <div className="mb-6 flex gap-2 border-b">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id ? 'border-green-800 text-green-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* INVENTORY TAB */}
      {tab === 'inventory' && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Unit</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Price</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">In Stock</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.length === 0 && <EmptyRow colSpan={5} text="No shop products yet — add one under Manage Products" />}
              {products.map(p => (
                <tr key={p._id} className={p.stockQuantity === 0 ? 'bg-amber-50' : ''}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-3 text-right">{formatNaira(p.price)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${p.stockQuantity === 0 ? 'text-amber-700' : 'text-green-600'}`}>{p.stockQuantity}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openRestock(p)} className="text-sm text-green-800 hover:text-green-900">Receive Stock</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* RECORD SALE TAB */}
      {tab === 'sell' && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-4">
            <label className="block text-sm font-medium mb-2">Customer</label>
            {selectedCustomer ? (
              <div className="flex justify-between items-center bg-gray-50 border rounded px-3 py-2">
                <div>
                  <p className="font-medium text-sm">{formatCustomerLabel(selectedCustomer)}</p>
                  {selectedCustomer.phone && <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>}
                </div>
                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-xs text-amber-700">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" placeholder="Search customer by name, phone, or ID..." value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDrop(true); }}
                  onFocus={() => setShowCustomerDrop(true)}
                  className={inputCls} />
                {showCustomerDrop && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button key={c._id} type="button"
                        onClick={() => { setSelectedCustomer(c); setShowCustomerDrop(false); setCustomerSearch(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0">
                        <p className="font-medium">{formatCustomerLabel(c)}</p>
                        <p className="text-xs text-gray-500">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputCls}>
              <option value="cash">Cash</option>
              <option value="transfer">Bank Transfer</option>
              <option value="pos">POS</option>
              <option value="cheque">Cheque</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Shop sales are paid for immediately — no balance is added to the customer's account.</p>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="font-medium text-sm">Add Item</h3>
            <div className="grid grid-cols-3 gap-3">
              <select value={cartProduct} onChange={e => {
                setCartProduct(e.target.value);
                const p = products.find(x => x._id === e.target.value);
                if (p) setCartPrice(String(p.price));
              }} className={inputCls}>
                <option value="">Choose product...</option>
                {products.filter(p => p.stockQuantity > 0).map(p => (
                  <option key={p._id} value={p._id}>{p.name} ({p.stockQuantity} {p.unit} left)</option>
                ))}
              </select>
              <input type="number" min="0.01" step="0.01" placeholder="Qty" value={cartQty} onChange={e => setCartQty(e.target.value)} className={inputCls} />
              <CurrencyInput value={cartPrice} onChange={setCartPrice} placeholder="Price" className={inputCls} />
            </div>
            <button type="button" onClick={addToCart} className="w-full py-2 bg-green-800 text-neutral-100 rounded text-sm hover:bg-green-900 font-medium">
              Add to Sale
            </button>
          </Card>

          {cart.length > 0 && (
            <Card className="p-4 space-y-2">
              <h3 className="font-medium text-sm mb-2">Cart</h3>
              {cart.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.qty} {c.unit} × {formatNaira(c.price)} = {formatNaira(c.total)}</p>
                  </div>
                  <button onClick={() => removeFromCart(c.id)} className="text-amber-700 text-xs hover:underline">Remove</button>
                </div>
              ))}
              <div className="border-t pt-2 text-right font-bold">Total: {formatNaira(cartTotal)}</div>
            </Card>
          )}

          <button
            onClick={submitSale}
            disabled={submitting || cart.length === 0}
            className="w-full py-3 bg-green-800 text-neutral-100 rounded text-sm font-bold hover:bg-green-900 disabled:opacity-50"
          >
            {submitting ? 'Recording...' : 'Record Sale'}
          </button>
        </div>
      )}

      {/* SALES HISTORY TAB */}
      {tab === 'history' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Sale #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.length === 0 && <EmptyRow colSpan={6} text="No shop sales yet" />}
                {sales.map(s => (
                  <tr key={s._id}>
                    <td className="px-4 py-3 font-medium">
                      {s.saleNumber}
                      {s.editedAt && (
                        <p className="text-xs text-amber-600 font-normal" title={formatDate(s.editedAt)}>Edited by {s.editedByName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDate(s.date)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${s.customer}`} className="hover:underline">{s.customerName}</Link>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatNaira(s.grandTotal)}</td>
                    <td className="px-4 py-3"><StatusPill status={s.status} color={s.status === 'active' ? 'green' : 'red'} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/sales/${s._id}/invoice`} className="text-sm text-green-800 hover:text-green-900 mr-3">Invoice</Link>
                      {s.status === 'active' && (
                        <button onClick={() => deleteSale(s)} className="text-sm text-amber-700 hover:text-amber-800">Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MANAGE PRODUCTS TAB */}
      {tab === 'manage' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openCreateProduct} className="px-4 py-2 bg-green-800 text-neutral-100 rounded text-sm hover:bg-green-900">Add Product</button>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Unit</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Price</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.length === 0 && <EmptyRow colSpan={5} text="No products yet" />}
                {products.map(p => (
                  <tr key={p._id}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                    <td className="px-4 py-3 text-right">{formatNaira(p.price)}</td>
                    <td className="px-4 py-3 text-right">{p.stockQuantity}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditProduct(p)} className="text-sm text-green-800 hover:text-green-900 mr-3">Edit</button>
                      <button onClick={() => handleDeactivateProduct(p)} className="text-sm text-amber-700 hover:text-amber-800">Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <Modal open={showProductModal} onClose={() => setShowProductModal(false)} title={editingProduct ? 'Edit Product' : 'Add Shop Product'}>
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <Field label="Name" required>
            <input type="text" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className={inputCls} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit" required>
              <input type="text" value={productForm.unit} onChange={e => setProductForm({ ...productForm, unit: e.target.value })} className={inputCls} placeholder="bag, piece, tonne..." required />
            </Field>
            <Field label="Price (₦)" required>
              <CurrencyInput value={productForm.price} onChange={val => setProductForm({ ...productForm, price: val })} className={inputCls} required />
            </Field>
          </div>
          {!editingProduct && (
            <Field label="Opening Stock">
              <input type="number" min="0" value={productForm.stockQuantity} onChange={e => setProductForm({ ...productForm, stockQuantity: e.target.value })} className={inputCls} />
            </Field>
          )}
          <FormButtons onCancel={() => setShowProductModal(false)} submitting={submitting} />
        </form>
      </Modal>

      {/* Receive Stock Modal */}
      <Modal open={!!restockModal} onClose={() => setRestockModal(null)} title="Receive Stock">
        {restockModal && (
          <form onSubmit={handleRestock} className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p><span className="text-gray-500">Product:</span> <span className="font-medium">{restockModal.name}</span></p>
              <p><span className="text-gray-500">Current Stock:</span> <span className="font-medium">{restockModal.stockQuantity} {restockModal.unit}</span></p>
            </div>
            <Field label="Source">
              <select value={restockSource} onChange={e => setRestockSource(e.target.value)} className={inputCls}>
                <option value="manual">Manual (direct restock)</option>
                <option value="atc">From ATC (cement delivered to shop)</option>
              </select>
            </Field>
            {restockSource === 'atc' && (
              <Field label="ATC" required>
                <select value={restockAtc} onChange={e => setRestockAtc(e.target.value)} className={inputCls} required>
                  <option value="">— Select ATC —</option>
                  {atcs.map(a => <option key={a._id} value={a._id}>{a.atcNumber} — {a.cementBrandName} ({a.bagsRemaining} bags left)</option>)}
                </select>
              </Field>
            )}
            <Field label="Quantity" required>
              <input type="number" min="0.01" step="0.01" value={restockQty} onChange={e => setRestockQty(e.target.value)} className={inputCls} required />
            </Field>
            <FormButtons onCancel={() => setRestockModal(null)} submitting={submitting} submitLabel="Receive" />
          </form>
        )}
      </Modal>
    </div>
  );
}
