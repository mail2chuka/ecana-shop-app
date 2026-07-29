export function isSameCalendarDay(a, b) {
  if (!a || !b) return false;
  return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
}

// Forms that let a date be backdated (payments, aggregate sales) send a date-ONLY string
// ("2026-07-27"), which parses to midnight UTC — losing time-of-day even when the entry is really
// happening right now. That makes same-day transactions sort out of real sequence on the customer
// statement (a midnight-stamped entry looks earliest, even though it was actually recorded last).
// If the picked date is today, use the real current timestamp instead of midnight; a genuinely
// backdated date keeps its parsed (midnight) value, same as before.
export function resolveDate(dateInput) {
  if (!dateInput) return new Date();
  const parsed = new Date(dateInput);
  return isSameCalendarDay(parsed, new Date()) ? new Date() : parsed;
}
