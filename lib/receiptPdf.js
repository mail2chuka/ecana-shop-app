'use client';

// Real, drawn PDFs (text/lines, not a screenshot) — a few KB instead of the multi-MB files a
// html2canvas raster capture produced, and the text stays crisp and selectable at any zoom.
// jsPDF is dynamically imported so it only loads when a receipt is actually shared, not bundled
// into every page's initial JS.

const MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 in points
export const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;
export const PAGE_CENTER = PAGE_WIDTH / 2;

async function loadImageAsDataUrl(url) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null; // logo just gets skipped — never fatal to the rest of the receipt
  }
}

export async function newReceiptPdf() {
  const { jsPDF } = await import('jspdf');
  return new jsPDF({ unit: 'pt', format: 'a4' });
}

// Logo, org name/address/phone on the left; ref number/date on the right; the receipt's own title
// centered on its own line beneath both — mirrors the on-screen ReceiptHeader component.
export async function drawReceiptHeader(pdf, { org, refNumber, date, title }) {
  let y = MARGIN;
  let textX = MARGIN;

  if (org?.logoUrl) {
    const dataUrl = await loadImageAsDataUrl(org.logoUrl);
    if (dataUrl) {
      try {
        pdf.addImage(dataUrl, dataUrl.includes('image/png') ? 'PNG' : 'JPEG', MARGIN, y, 36, 36);
        textX = MARGIN + 46;
      } catch {
        // Unsupported image format for jsPDF — skip the logo, keep going.
      }
    }
  }

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(20);
  pdf.text(org?.name || '', textX, y + 12);

  let leftY = y + 26;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(110);
  if (org?.address) { pdf.text(org.address, textX, leftY); leftY += 12; }
  if (org?.phone) { pdf.text(org.phone, textX, leftY); leftY += 12; }

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(20);
  pdf.text(String(refNumber || ''), CONTENT_RIGHT, y + 12, { align: 'right' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(110);
  pdf.text(String(date || ''), CONTENT_RIGHT, y + 26, { align: 'right' });

  y = Math.max(leftY, y + 26) + 14;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(20);
  pdf.text(String(title || '').toUpperCase(), PAGE_WIDTH / 2, y, { align: 'center', charSpace: 0.5 });
  y += 12;
  pdf.setDrawColor(30); pdf.setLineWidth(1);
  pdf.line(MARGIN, y, CONTENT_RIGHT, y);
  return y + 22;
}

// The "BILL TO" / "RECEIVED FROM" style two-column block right under the header.
export function drawTwoColumnInfo(pdf, y, left, right) {
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(130);
  pdf.text(left.label.toUpperCase(), MARGIN, y);
  pdf.text(right.label.toUpperCase(), CONTENT_RIGHT, y, { align: 'right' });
  y += 14;

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(20);
  pdf.text(left.lines[0] || '', MARGIN, y);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5);
  pdf.text(right.lines[0] || '', CONTENT_RIGHT, y, { align: 'right' });

  let leftY = y, rightY = y;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(90);
  for (let i = 1; i < left.lines.length; i++) { leftY += 13; pdf.text(left.lines[i], MARGIN, leftY); }
  for (let i = 1; i < right.lines.length; i++) { rightY += 13; pdf.text(right.lines[i], CONTENT_RIGHT, rightY, { align: 'right' }); }

  return Math.max(leftY, rightY) + 24;
}

// A single "label ............ value" row with a faint divider under it (Method, Reason, Balance...).
export function drawKeyValueRow(pdf, y, label, value) {
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(110);
  pdf.text(label, MARGIN, y);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(20);
  const lines = pdf.splitTextToSize(String(value ?? ''), 320);
  pdf.text(lines, CONTENT_RIGHT, y, { align: 'right' });
  const rowHeight = 16 + (lines.length - 1) * 12;
  pdf.setDrawColor(225); pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y + 6, CONTENT_RIGHT, y + 6);
  return y + rowHeight;
}

// The bold total line (TOTAL / AMOUNT RECEIVED / SURCHARGE / REFUND), right-aligned under a divider.
export function drawTotalRow(pdf, y, label, value, color) {
  pdf.setDrawColor(20); pdf.setLineWidth(1.2);
  pdf.line(PAGE_WIDTH / 2, y, CONTENT_RIGHT, y);
  y += 18;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
  if (color) pdf.setTextColor(...color); else pdf.setTextColor(20);
  pdf.text(label, PAGE_WIDTH / 2, y);
  pdf.text(String(value), CONTENT_RIGHT, y, { align: 'right' });
  pdf.setTextColor(20);
  return y + 22;
}

// Items table for the sale invoice — the only receipt with a variable-length line list.
export function drawItemsTable(pdf, y, items) {
  const colQty = MARGIN + 300, colPrice = MARGIN + 400;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(20);
  pdf.text('DESCRIPTION', MARGIN, y);
  pdf.text('QTY', colQty, y, { align: 'right' });
  pdf.text('UNIT PRICE', colPrice, y, { align: 'right' });
  pdf.text('AMOUNT', CONTENT_RIGHT, y, { align: 'right' });
  y += 6;
  pdf.setDrawColor(20); pdf.setLineWidth(1.2);
  pdf.line(MARGIN, y, CONTENT_RIGHT, y);
  y += 16;

  for (const item of items) {
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(20);
    const titleLines = pdf.splitTextToSize(item.title, 260);
    pdf.text(titleLines, MARGIN, y);
    if (item.subtitle) {
      pdf.setFontSize(8); pdf.setTextColor(120);
      pdf.text(item.subtitle, MARGIN, y + titleLines.length * 11);
    }
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(20);
    pdf.text(item.qty, colQty, y, { align: 'right' });
    pdf.text(item.price, colPrice, y, { align: 'right' });
    pdf.text(item.amount, CONTENT_RIGHT, y, { align: 'right' });

    y += Math.max(titleLines.length * 11, 11) + (item.subtitle ? 11 : 0) + 10;
    pdf.setDrawColor(230); pdf.setLineWidth(0.5);
    pdf.line(MARGIN, y - 6, CONTENT_RIGHT, y - 6);
  }
  return y + 6;
}

// Bank account block (if set) + the invoiceFooter thank-you line — mirrors ReceiptFooter.
export function drawReceiptFooter(pdf, y, org) {
  pdf.setDrawColor(200); pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y, CONTENT_RIGHT, y);
  y += 18;

  const hasBankInfo = org?.bankName || org?.accountNumber || org?.accountName;
  if (hasBankInfo) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(90);
    pdf.text('Payment Details', MARGIN, y);
    y += 13;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(60);
    pdf.text([org.bankName, org.accountNumber, org.accountName].filter(Boolean).join(' — '), MARGIN, y);
    y += 20;
  }

  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(9); pdf.setTextColor(150);
  pdf.text(org?.invoiceFooter || 'Thank you for your business.', PAGE_WIDTH / 2, y, { align: 'center' });
  return y;
}

// Small free-text block (Notes, "Recorded by", "Applied by", cancellation warnings).
export function drawNotesBlock(pdf, y, lines) {
  pdf.setDrawColor(225); pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y, CONTENT_RIGHT, y);
  y += 16;
  for (const line of lines) {
    if (!line) continue;
    pdf.setFont('helvetica', line.bold ? 'bold' : 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...(line.color || [90, 90, 90]));
    const wrapped = pdf.splitTextToSize(line.text, PAGE_WIDTH - MARGIN * 2);
    pdf.text(wrapped, MARGIN, y);
    y += wrapped.length * 12 + 4;
  }
  pdf.setTextColor(20);
  return y;
}

// Hands the finished PDF to the OS share sheet (WhatsApp, email, etc. via the Web Share API) when the
// browser supports sharing files; falls back to a plain download otherwise.
export async function presentPdf(pdf, filename, title) {
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: title || filename });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // user closed the share sheet — not a failure
    }
  }
  pdf.save(filename);
}
