'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader, PageHeader, Card, EmptyRow, StatusPill, btnPrimaryCls, theadCls, tableScrollCls } from '@/components/ui';
import { formatNaira, formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

const statusColor = { trialing: 'blue', active: 'green', past_due: 'amber', canceled: 'gray' };

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch('/api/subscription');
    const d = await r.json();
    if (d.success) setData(d.data);
    else toast.error(d.error || 'Failed to load');
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference) return;
    setVerifying(true);
    fetch(`/api/subscription/paystack/verify?reference=${encodeURIComponent(reference)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) toast.success(d.data.alreadyProcessed ? 'Payment already recorded' : 'Payment confirmed — subscription extended');
        else toast.error(d.error || 'Could not confirm payment');
      })
      .finally(() => {
        setVerifying(false);
        router.replace('/admin/subscription');
        load();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const pay = async (plan) => {
    setPaying(plan);
    try {
      const r = await fetch('/api/subscription/paystack/initialize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }),
      });
      const d = await r.json();
      if (d.success) window.location.href = d.data.authorizationUrl;
      else { toast.error(d.error); setPaying(null); }
    } catch (err) {
      toast.error(err.message || 'Something went wrong, please try again');
      setPaying(null);
    }
  };

  if (loading || verifying || !data) return <Loader />;

  const { org, history } = data;
  const endDate = org.subscriptionEndsAt || org.trialEndsAt;
  const endLabel = org.subscriptionEndsAt ? 'Renews / expires' : 'Trial ends';

  return (
    <div>
      <PageHeader title="Subscription" subtitle="Your organization's plan and billing" />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Status</p>
          <div className="mt-1">
            {org.freeForever
              ? <StatusPill status="Free forever" color="green" />
              : <StatusPill status={org.subscriptionStatus} color={statusColor[org.subscriptionStatus] || 'gray'} />}
          </div>
        </Card>
        {!org.freeForever && endDate && (
          <Card className="p-4">
            <p className="text-xs text-gray-500">{endLabel}</p>
            <p className="text-lg font-bold mt-1">{formatDate(endDate)}</p>
          </Card>
        )}
      </div>

      {!org.freeForever && (
        <Card className="p-5 mb-6">
          <h3 className="font-semibold text-sm mb-4">Extend your subscription</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Monthly</p>
              <p className="text-2xl font-bold mt-1">{formatNaira(org.monthlyPrice)}</p>
              <button
                onClick={() => pay('monthly')}
                disabled={!org.monthlyPrice || paying === 'monthly'}
                className={`mt-3 w-full ${btnPrimaryCls}`}
              >
                {paying === 'monthly' ? 'Redirecting...' : 'Pay Monthly'}
              </button>
              {!org.monthlyPrice && <p className="text-xs text-gray-400 mt-2">Pricing not set yet — contact the platform owner.</p>}
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">Yearly</p>
              <p className="text-2xl font-bold mt-1">{formatNaira(org.yearlyPrice)}</p>
              <button
                onClick={() => pay('yearly')}
                disabled={!org.yearlyPrice || paying === 'yearly'}
                className={`mt-3 w-full ${btnPrimaryCls}`}
              >
                {paying === 'yearly' ? 'Redirecting...' : 'Pay Yearly'}
              </button>
              {!org.yearlyPrice && <p className="text-xs text-gray-400 mt-2">Pricing not set yet — contact the platform owner.</p>}
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b"><h3 className="font-semibold text-sm">Payment History</h3></div>
        <div className={tableScrollCls}>
          <table className="w-full text-sm">
            <thead className={theadCls}>
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">Method</th>
                <th className="px-4 py-3 text-left font-medium">Covers</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.length === 0 && <EmptyRow colSpan={5} text="No payments yet" />}
              {history.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 capitalize">{p.plan}</td>
                  <td className="px-4 py-3 capitalize">{p.method === 'paystack' ? 'Card (Paystack)' : 'Manual (platform)'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(p.periodStart)} — {formatDate(p.periodEnd)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatNaira(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
