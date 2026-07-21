const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

async function paystackFetch(path, options = {}) {
  if (!PAYSTACK_SECRET_KEY) throw new Error('Paystack is not configured (missing PAYSTACK_SECRET_KEY)');
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message || 'Paystack request failed');
  return json.data;
}

// amountNaira is converted to kobo (Paystack's smallest-unit requirement) here, once, so callers
// always work in plain Naira.
export function initializeTransaction({ email, amountNaira, callbackUrl, metadata }) {
  return paystackFetch('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({ email, amount: Math.round(amountNaira * 100), callback_url: callbackUrl, metadata }),
  });
}

export function verifyTransaction(reference) {
  return paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
}
