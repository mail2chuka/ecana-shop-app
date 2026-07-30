'use client';

// Renderer-agnostic receipt layout: every draw* function below takes a small adapter ("ctx") instead
// of a jsPDF instance directly, so the exact same layout code can target either a real PDF (jsPDF) or
// a flattened JPEG (Canvas 2D) — one definition of what a receipt looks like, two output formats.
// Both libraries are dynamically imported so they only load once a share button is actually clicked.

const MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
export const CONTENT_RIGHT = PAGE_WIDTH - MARGIN;
export const PAGE_CENTER = PAGE_WIDTH / 2;

// --- Logo loading -----------------------------------------------------------------------------
// Normalizes WHATEVER the org uploaded (PNG/JPEG/WEBP/SVG, up to 2MB) down to a small, compact JPEG
// before it ever gets embedded — fixes two real problems at once: embedding the original file's full
// bytes was what actually made past receipts huge (display size and embedded-data size are different
// things), and jsPDF can only embed PNG/JPEG — feeding it a WEBP or SVG data URL under a guessed
// format silently produced a broken image. Drawing everything onto a canvas first sidesteps both:
// canvas can rasterize any image format, and we control the final encoded size ourselves.
async function loadLogoAsset(url, maxDim = 96) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);
    if (!img.naturalWidth || !img.naturalHeight) return null;

    const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const c2d = canvas.getContext('2d');
    c2d.fillStyle = '#ffffff';
    c2d.fillRect(0, 0, w, h);
    c2d.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const normalized = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });
    return { dataUrl, img: normalized, width: w, height: h };
  } catch {
    return null; // logo just gets skipped — never fatal to the rest of the receipt
  }
}

// --- Renderer adapters -------------------------------------------------------------------------

export async function createPdfRenderer() {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const ctx = {
    setFont: (style) => pdf.setFont('helvetica', style),
    setSize: (pt) => pdf.setFontSize(pt),
    setColor: (r, g = r, b = r) => pdf.setTextColor(r, g, b),
    text: (str, x, y, opts) => pdf.text(str, x, y, opts),
    hline: (x1, x2, y, { gray = 200, width = 0.5 } = {}) => { pdf.setDrawColor(gray); pdf.setLineWidth(width); pdf.line(x1, y, x2, y); },
    rect: (x, y, w, h, { gray = 200, width = 0.75 } = {}) => { pdf.setDrawColor(gray); pdf.setLineWidth(width); pdf.rect(x, y, w, h); },
    splitText: (str, maxWidth) => pdf.splitTextToSize(String(str ?? ''), maxWidth),
    image: (asset, x, y, w, h) => { if (asset) { try { pdf.addImage(asset.dataUrl, 'JPEG', x, y, w, h); } catch {} } },
  };
  return { pdf, ctx };
}

function wrapCanvasText(c2d, text, maxWidthPx) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (cur && c2d.measureText(test).width > maxWidthPx) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function createImageRenderer(scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PAGE_WIDTH * scale);
  canvas.height = Math.round(PAGE_HEIGHT * scale);
  const c2d = canvas.getContext('2d');
  c2d.fillStyle = '#ffffff';
  c2d.fillRect(0, 0, canvas.width, canvas.height);

  let style = 'normal', size = 10;
  const applyFont = () => {
    const weight = style === 'bold' ? 'bold ' : '';
    const italic = style === 'italic' ? 'italic ' : '';
    c2d.font = `${italic}${weight}${size * scale}px Helvetica, Arial, sans-serif`;
  };
  applyFont();

  const ctx = {
    setFont: (s) => { style = s; applyFont(); },
    setSize: (pt) => { size = pt; applyFont(); },
    setColor: (r, g = r, b = r) => { c2d.fillStyle = `rgb(${r},${g},${b})`; },
    text: (str, x, y, opts) => {
      c2d.textAlign = opts?.align || 'left';
      c2d.textBaseline = 'alphabetic';
      const lines = Array.isArray(str) ? str : [str];
      lines.forEach((line, i) => c2d.fillText(line, x * scale, (y + i * size * 1.15) * scale));
    },
    hline: (x1, x2, y, { gray = 200, width = 0.5 } = {}) => {
      c2d.strokeStyle = `rgb(${gray},${gray},${gray})`;
      c2d.lineWidth = width * scale;
      c2d.beginPath(); c2d.moveTo(x1 * scale, y * scale); c2d.lineTo(x2 * scale, y * scale); c2d.stroke();
    },
    rect: (x, y, w, h, { gray = 200, width = 0.75 } = {}) => {
      c2d.strokeStyle = `rgb(${gray},${gray},${gray})`;
      c2d.lineWidth = width * scale;
      c2d.strokeRect(x * scale, y * scale, w * scale, h * scale);
    },
    splitText: (str, maxWidth) => wrapCanvasText(c2d, str, maxWidth * scale),
    image: (asset, x, y, w, h) => { if (asset?.img) c2d.drawImage(asset.img, x * scale, y * scale, w * scale, h * scale); },
  };
  return { canvas, ctx };
}

// --- Shared layout pieces -----------------------------------------------------------------------

// Logo, org name/address/phone on the left; ref number/date on the right; the receipt's own title
// centered on its own line beneath both — mirrors the on-screen ReceiptHeader component.
export async function drawReceiptHeader(ctx, { org, refNumber, date, title }) {
  let y = MARGIN;
  let textX = MARGIN;

  if (org?.logoUrl) {
    const asset = await loadLogoAsset(org.logoUrl);
    if (asset) {
      const boxMax = 36;
      const ratio = asset.width / asset.height;
      const w = ratio >= 1 ? boxMax : boxMax * ratio;
      const h = ratio >= 1 ? boxMax / ratio : boxMax;
      ctx.image(asset, MARGIN, y, w, h);
      textX = MARGIN + boxMax + 10;
    }
  }

  ctx.setFont('bold'); ctx.setSize(16); ctx.setColor(20);
  ctx.text(org?.name || '', textX, y + 12);

  let leftY = y + 26;
  ctx.setFont('normal'); ctx.setSize(9); ctx.setColor(110);
  if (org?.address) { ctx.text(org.address, textX, leftY); leftY += 12; }
  if (org?.phone) { ctx.text(org.phone, textX, leftY); leftY += 12; }

  ctx.setFont('bold'); ctx.setSize(13); ctx.setColor(20);
  ctx.text(String(refNumber || ''), CONTENT_RIGHT, y + 12, { align: 'right' });
  ctx.setFont('normal'); ctx.setSize(9.5); ctx.setColor(110);
  ctx.text(String(date || ''), CONTENT_RIGHT, y + 26, { align: 'right' });

  y = Math.max(leftY, y + 26) + 14;
  ctx.setFont('bold'); ctx.setSize(11); ctx.setColor(20);
  ctx.text(String(title || '').toUpperCase(), PAGE_CENTER, y, { align: 'center' });
  y += 12;
  ctx.hline(MARGIN, CONTENT_RIGHT, y, { gray: 30, width: 1 });
  return y + 22;
}

// The "BILL TO" / "RECEIVED FROM" style two-column block.
export function drawTwoColumnInfo(ctx, y, left, right) {
  ctx.setFont('normal'); ctx.setSize(8.5); ctx.setColor(130);
  ctx.text(left.label.toUpperCase(), MARGIN, y);
  ctx.text(right.label.toUpperCase(), CONTENT_RIGHT, y, { align: 'right' });
  y += 14;

  ctx.setFont('bold'); ctx.setSize(12); ctx.setColor(20);
  ctx.text(left.lines[0] || '', MARGIN, y);
  ctx.setFont('normal'); ctx.setSize(9.5);
  ctx.text(right.lines[0] || '', CONTENT_RIGHT, y, { align: 'right' });

  let leftY = y, rightY = y;
  ctx.setFont('normal'); ctx.setSize(9); ctx.setColor(90);
  for (let i = 1; i < left.lines.length; i++) { leftY += 13; ctx.text(left.lines[i], MARGIN, leftY); }
  for (let i = 1; i < right.lines.length; i++) { rightY += 13; ctx.text(right.lines[i], CONTENT_RIGHT, rightY, { align: 'right' }); }

  return Math.max(leftY, rightY) + 24;
}

// A single "label ............ value" row with a faint divider under it (Method, Reason, Balance...).
export function drawKeyValueRow(ctx, y, label, value) {
  ctx.setFont('normal'); ctx.setSize(9.5); ctx.setColor(110);
  ctx.text(label, MARGIN, y);
  ctx.setColor(20);
  const lines = ctx.splitText(value, 320);
  ctx.text(lines, CONTENT_RIGHT, y, { align: 'right' });
  const rowHeight = 16 + (lines.length - 1) * 12;
  ctx.hline(MARGIN, CONTENT_RIGHT, y + 6, { gray: 225, width: 0.5 });
  return y + rowHeight;
}

// The bold total line (TOTAL / AMOUNT RECEIVED / SURCHARGE / REFUND).
export function drawTotalRow(ctx, y, label, value, color) {
  ctx.hline(PAGE_CENTER, CONTENT_RIGHT, y, { gray: 20, width: 1.2 });
  y += 18;
  ctx.setFont('bold'); ctx.setSize(12);
  if (color) ctx.setColor(...color); else ctx.setColor(20);
  ctx.text(label, PAGE_CENTER, y);
  ctx.text(String(value), CONTENT_RIGHT, y, { align: 'right' });
  ctx.setColor(20);
  return y + 22;
}

// Items table for the sale invoice — the only receipt with a variable-length line list.
export function drawItemsTable(ctx, y, items) {
  const colQty = MARGIN + 300, colPrice = MARGIN + 400;
  ctx.setFont('bold'); ctx.setSize(8.5); ctx.setColor(20);
  ctx.text('DESCRIPTION', MARGIN, y);
  ctx.text('QTY', colQty, y, { align: 'right' });
  ctx.text('UNIT PRICE', colPrice, y, { align: 'right' });
  ctx.text('AMOUNT', CONTENT_RIGHT, y, { align: 'right' });
  y += 6;
  ctx.hline(MARGIN, CONTENT_RIGHT, y, { gray: 20, width: 1.2 });
  y += 16;

  for (const item of items) {
    ctx.setFont('normal'); ctx.setSize(9.5); ctx.setColor(20);
    const titleLines = ctx.splitText(item.title, 260);
    ctx.text(titleLines, MARGIN, y);
    if (item.subtitle) {
      ctx.setSize(8); ctx.setColor(120);
      ctx.text(item.subtitle, MARGIN, y + titleLines.length * 11);
    }
    ctx.setFont('normal'); ctx.setSize(9.5); ctx.setColor(20);
    ctx.text(item.qty, colQty, y, { align: 'right' });
    ctx.text(item.price, colPrice, y, { align: 'right' });
    ctx.text(item.amount, CONTENT_RIGHT, y, { align: 'right' });

    y += Math.max(titleLines.length * 11, 11) + (item.subtitle ? 11 : 0) + 10;
    ctx.hline(MARGIN, CONTENT_RIGHT, y - 6, { gray: 230, width: 0.5 });
  }
  return y + 6;
}

// The org's bank account, boxed with one field per row (Bank Name / Account Number / Account Name).
// Returns y unchanged if the org hasn't set any bank details yet.
export function drawPaymentDetailsBox(ctx, y, org) {
  const rows = [
    org?.bankName && ['Bank Name', org.bankName],
    org?.accountNumber && ['Account Number', org.accountNumber],
    org?.accountName && ['Account Name', org.accountName],
  ].filter(Boolean);
  if (rows.length === 0) return y;

  const boxTop = y;
  const rowHeight = 16;
  const boxHeight = 20 + rows.length * rowHeight;
  ctx.rect(MARGIN, boxTop, CONTENT_RIGHT - MARGIN, boxHeight, { gray: 210, width: 0.75 });

  let rowY = boxTop + 18;
  ctx.setFont('bold'); ctx.setSize(9); ctx.setColor(90);
  ctx.text('Payment Details', MARGIN + 10, rowY);
  rowY += rowHeight;

  for (const [label, value] of rows) {
    ctx.setFont('normal'); ctx.setSize(9); ctx.setColor(110);
    ctx.text(label, MARGIN + 10, rowY);
    ctx.setFont('bold'); ctx.setColor(30);
    ctx.text(String(value), CONTENT_RIGHT - 10, rowY, { align: 'right' });
    rowY += rowHeight;
  }
  return boxTop + boxHeight + 22;
}

// The closing thank-you/invoiceFooter line.
export function drawReceiptFooter(ctx, y, org) {
  ctx.hline(MARGIN, CONTENT_RIGHT, y, { gray: 200, width: 0.5 });
  y += 18;
  ctx.setFont('italic'); ctx.setSize(9); ctx.setColor(150);
  ctx.text(org?.invoiceFooter || 'Thank you for your business.', PAGE_CENTER, y, { align: 'center' });
  return y;
}

// Small free-text block (Notes, "Recorded by", "Applied by", cancellation warnings).
export function drawNotesBlock(ctx, y, lines) {
  ctx.hline(MARGIN, CONTENT_RIGHT, y, { gray: 225, width: 0.5 });
  y += 16;
  for (const line of lines) {
    if (!line) continue;
    ctx.setFont(line.bold ? 'bold' : 'normal');
    ctx.setSize(9);
    ctx.setColor(...(line.color || [90, 90, 90]));
    const wrapped = ctx.splitText(line.text, PAGE_WIDTH - MARGIN * 2);
    ctx.text(wrapped, MARGIN, y);
    y += wrapped.length * 12 + 4;
  }
  ctx.setColor(20);
  return y;
}

// --- Present (share-or-download) ----------------------------------------------------------------

// Hands the finished file to the OS share sheet (WhatsApp, email, etc. via the Web Share API) when
// the browser supports sharing files; falls back to a plain download otherwise.
async function shareOrDownload(file, blob, filename, title, saveFallback) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: title || filename });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // user closed the share sheet — not a failure
    }
  }
  saveFallback();
}

export async function presentPdf(pdf, filename, title) {
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  await shareOrDownload(file, blob, filename, title, () => pdf.save(filename));
}

export async function presentImage(canvas, filename, title, quality = 0.85) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  const file = new File([blob], filename, { type: 'image/jpeg' });
  await shareOrDownload(file, blob, filename, title, () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
