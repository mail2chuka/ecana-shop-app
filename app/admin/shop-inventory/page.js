'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader, PageHeader, Card } from '@/components/ui';
import { formatNaira } from '@/lib/format';

export default function ShopInventoryPage() {
  const [atcs, setAtcs] = useState([]);
  const [aggregate, setAggregate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get shop customer ID
        const shopRes = await fetch('/api/customers?search=Shop');
        const shopData = await shopRes.json();
        const shop = shopData.data?.find(c => c.name.toLowerCase().includes('shop'));
        if (shop) setShopId(shop._id);

        // Load ATCs assigned to shop
        const atcRes = await fetch(`/api/atcs?availableForSale=true`);
        const atcData = await atcRes.json();
        if (atcData.success) {
          const shopAtcs = atcData.data.filter(a => a.assignedTruck); // ATCs at shop
          setAtcs(shopAtcs);
        }

        // Load aggregate products
        const dustRes = await fetch('/api/stonedust');
        const dustData = await dustRes.json();
        if (dustData.success) setAggregate(dustData.data);
      } catch (err) {
        console.error('Error loading inventory:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const cementBagsAvailable = atcs.reduce((sum, a) => sum + a.bagsRemaining, 0);
  const cementBagsTotal = atcs.reduce((sum, a) => sum + a.bagsPaidFor, 0);

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader
        title="Shop Inventory"
        subtitle="Track cement and aggregate available for walk-in customers"
        action={
          <Link href="/admin/sales/walk-in" className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
            + Walk-in Sale
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-gray-500 font-medium">Cement Bags (Available)</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{cementBagsAvailable}</p>
          <p className="text-xs text-gray-500 mt-1">of {cementBagsTotal} total</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 font-medium">ATCs in Stock</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{atcs.length}</p>
          <p className="text-xs text-gray-500 mt-1">cement batches</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 font-medium">Aggregate Products</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{aggregate.length}</p>
          <p className="text-xs text-gray-500 mt-1">available</p>
        </Card>
      </div>

      {/* Cement ATCs */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3">Cement ATCs (Bags)</h2>
        <Card className="overflow-hidden">
          {atcs.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No cement ATCs in stock</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ATC #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Brand</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Remaining</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">% Available</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {atcs.map(atc => {
                  const percentAvailable = Math.round((atc.bagsRemaining / atc.bagsPaidFor) * 100);
                  return (
                    <tr key={atc._id} className={percentAvailable === 0 ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 font-medium">{atc.atcNumber}</td>
                      <td className="px-4 py-3">{atc.cementBrandName}</td>
                      <td className="px-4 py-3 text-right">{atc.bagsPaidFor}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">{atc.bagsRemaining}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          percentAvailable === 0 ? 'bg-red-100 text-red-700' :
                          percentAvailable < 25 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {percentAvailable}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Aggregate */}
      <div>
        <h2 className="text-lg font-bold mb-3">Aggregate (Tonnes)</h2>
        <Card className="overflow-hidden">
          {aggregate.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No aggregate products available</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Size</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Quarry</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Price/Tonne</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {aggregate.map(sd => (
                  <tr key={sd._id}>
                    <td className="px-4 py-3 font-medium">{sd.name}</td>
                    <td className="px-4 py-3">{sd.size}</td>
                    <td className="px-4 py-3 text-gray-600">{sd.quarryName}</td>
                    <td className="px-4 py-3 text-right">{formatNaira(sd.currentPrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        sd.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {sd.isActive ? 'Available' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
