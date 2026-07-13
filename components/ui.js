'use client';

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

// Buttons OUTSIDE tables: solid deep green (primary) or solid gold (destructive), light neutral text.
export const btnPrimaryCls = 'px-4 py-2 bg-green-800 text-neutral-100 rounded text-sm font-medium hover:bg-green-900 disabled:opacity-50';
export const btnDangerCls = 'px-4 py-2 bg-amber-700 text-neutral-100 rounded text-sm font-medium hover:bg-amber-800 disabled:opacity-50';

// Buttons/links INSIDE table rows: no background of their own, just colored text on the table's own background.
export const tableActionCls = 'text-sm font-medium text-green-800 hover:text-green-900';
export const tableDangerActionCls = 'text-sm font-medium text-amber-700 hover:text-amber-800';

// Table head: deep green, sticky so it acts as a frozen pane while the body scrolls.
export const theadCls = 'bg-green-800 text-neutral-100 sticky top-0 z-10';
// Wrap the <table> in a div with this class to make the sticky thead actually freeze on scroll.
export const tableScrollCls = 'overflow-auto max-h-[70vh]';

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
    red: 'bg-amber-100 text-amber-800',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded ${colors[color] || colors.gray}`}>
      {status}
    </span>
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
          <h2 className="text-lg font-bold mb-4">{title}</h2>
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
