// Drop-in replacement for `fetch(url, opts).then(r => r.json())` used throughout the admin/customer
// UI. Never throws and never lets `res.json()` run on a body that might be empty or non-JSON — that's
// exactly what produces the browser's "Failed to execute 'json' on 'Response': Unexpected end of JSON
// input", surfaced to the user as a cryptic crash instead of a readable message. Every failure mode
// (network error, empty body, malformed body, non-2xx status) instead resolves to the same shape the
// app's API routes already return on error: `{ error: string }`, so existing `if (data.success) ...
// else toast.error(data.error)` call sites keep working unchanged.
export async function apiFetch(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }

  const text = await res.text();
  if (!text) {
    return res.ok ? { success: true } : { error: `Request failed (status ${res.status}). Please try again.` };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: `Server returned an unexpected response (status ${res.status}). Please try again.` };
  }

  if (!res.ok && !data.error) {
    return { ...data, error: `Request failed (status ${res.status}).` };
  }
  return data;
}
