'use client';

import { FiX } from 'react-icons/fi';

export function Logo({ className = 'h-8 w-8' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="none" stroke="#ffffff" strokeWidth="3"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="#b3e5fc" strokeWidth="6"/>
      <circle cx="50" cy="50" r="28" fill="none" stroke="#ffffff" strokeWidth="3"/>
      <circle cx="50" cy="50" r="12" fill="#90ee90"/>
      <line x1="50" y1="10" x2="50" y2="30" stroke="#ffffff" strokeWidth="3"/>
      <line x1="50" y1="70" x2="50" y2="90" stroke="#ffffff" strokeWidth="3"/>
      <line x1="10" y1="50" x2="30" y2="50" stroke="#ffffff" strokeWidth="3"/>
      <line x1="70" y1="50" x2="90" y2="50" stroke="#ffffff" strokeWidth="3"/>
    </svg>
  );
}

// Buttons OUTSIDE tables: solid brand green (primary) or solid red (destructive), light neutral text.
export const btnPrimaryCls = 'px-4 py-2 bg-brand-800 text-neutral-100 rounded text-sm font-medium hover:bg-brand-900 disabled:opacity-50';
export const btnDangerCls = 'px-4 py-2 bg-danger-700 text-neutral-100 rounded text-sm font-medium hover:bg-danger-800 disabled:opacity-50';

// Buttons/links INSIDE table rows: no background of their own, just colored text on the table's own background.
export const tableActionCls = 'text-sm font-medium text-brand-800 hover:text-brand-900';
export const tableDangerActionCls = 'text-sm font-medium text-danger-700 hover:text-danger-800';

// Table head: brand green, sticky so it acts as a frozen pane while the body scrolls.
export const theadCls = 'bg-brand-800 text-neutral-100 sticky top-0 z-10';
// Wrap the <table> in a div with this class to make the sticky thead actually freeze on scroll.
// The 70vh cap is a screen-only convenience — print doesn't scroll, so anything past it would
// just be silently clipped rather than flowing onto further pages. Print always sees everything.
export const tableScrollCls = 'overflow-auto max-h-[70vh] print:overflow-visible print:max-h-none';

export function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin h-8 w-8 border-4 border-gray-800 border-t-transparent rounded-full"></div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`bg-white border rounded-lg ${className}`}>{children}</div>;
}

export function StatusPill({ status, color }) {
  const colors = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-danger-100 text-danger-800',
    amber: 'bg-warning-100 text-warning-800',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded ${colors[color] || colors.gray}`}>
      {status}
    </span>
  );
}

// Shared header for every printable receipt (invoice, payment, surcharge, refund) — logo, org name,
// address, phone on the left; ref number and date on the right; the receipt's own title centered
// beneath both, on its own line, so every receipt type reads consistently regardless of what it is.
export function ReceiptHeader({ org, refNumber, date, title }) {
  const logoSrc = org?.logoUrlSmall || org?.logoUrl;
  return (
    <div className="border-b pb-6 mb-6">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          {logoSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt={org.name} className="h-14 w-14 object-contain rounded" />
          )}
          <div>
            <h2 className="text-2xl font-bold">{org?.name || ''}</h2>
            {org?.address && <p className="text-xs text-gray-500 mt-1">{org.address}</p>}
            {org?.phone && <p className="text-xs text-gray-500">{org.phone}</p>}
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-xl">{refNumber}</p>
          <p className="text-gray-600">{date}</p>
        </div>
      </div>
      <p className="text-center text-sm font-bold uppercase tracking-widest mt-4">{title}</p>
    </div>
  );
}

// The org's bank account (per-org, set on the Receipt Settings page) — boxed, one field per row, so
// a customer knows exactly where to pay. Placed high up (right under the header, before the rest of
// the receipt body) rather than buried at the bottom, since it's what someone paying off a debit
// actually needs to act on. Omitted entirely if the org hasn't set any bank details yet, rather than
// showing empty fields.
export function PaymentDetailsBox({ org }) {
  const rows = [
    org?.bankName && ['Bank Name', org.bankName],
    org?.accountNumber && ['Account Number', org.accountNumber],
    org?.accountName && ['Account Name', org.accountName],
  ].filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <div className="mb-6 border rounded-md p-3 text-xs text-gray-600">
      <p className="font-medium text-gray-700 mb-2">Payment Details</p>
      <div className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Shared footer — just the thank-you/invoiceFooter line now; the bank account moved up into
// PaymentDetailsBox, near the top of the receipt instead of at the very bottom.
export function ReceiptFooter({ org }) {
  return (
    <div className="mt-6 pt-4 text-center text-xs text-gray-400">
      {org?.invoiceFooter || 'Thank you for your business.'}
    </div>
  );
}

export function EmptyRow({ colSpan, text = 'No data' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-8 text-gray-500">{text}</td>
    </tr>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', '2xl': 'max-w-4xl' };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex justify-between items-start gap-4 mb-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600" aria-label="Close">
              <FiX size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormButtons({ onCancel, submitLabel = 'Save', submitting }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border rounded hover:bg-gray-50">
        Cancel
      </button>
      <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-green-800 text-neutral-100 rounded hover:bg-green-900 disabled:opacity-50">
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

export function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500';

export function CurrencyInput({ value, onChange, className = inputCls, placeholder, required, disabled, allowNegative = false, id }) {
  const formatDisplay = (val) => {
    if (val === '' || val === null || val === undefined) return '';
    const str = String(val);
    const negative = allowNegative && str.trim().startsWith('-');
    const [intPart, decPart] = str.replace('-', '').split('.');
    const formattedInt = intPart.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
    return negative ? `-${formatted}` : formatted;
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (raw === '' || raw === '-' || pattern.test(raw)) {
      onChange(raw);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={formatDisplay(value)}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      id={id}
    />
  );
}
