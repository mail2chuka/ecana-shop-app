'use client';

// Captures the actual on-screen receipt (styled HTML/CSS — fonts, spacing, colors, logo, everything)
// as an image via html2canvas, so the shared file looks exactly like what's rendered on screen. This
// trades a larger file size for looking right, which is the tradeoff that's actually wanted here —
// stays in sync with the on-screen layout automatically, since it's a capture of that same DOM rather
// than a hand-maintained parallel drawing routine. html2canvas/jsPDF are dynamically imported so they
// only load once a share button is actually clicked.

async function captureElement(elementId) {
  const html2canvas = (await import('html2canvas')).default;
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Nothing to export');
  // useCORS: the org logo is served from Vercel Blob — a different origin than the app — so without
  // this, html2canvas silently fails to draw it instead of just omitting it.
  return html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
}

async function shareOrDownload(file, filename, title, saveFallback) {
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

export async function shareReceiptAsPdf(elementId, filename, title) {
  const canvas = await captureElement(elementId);
  const { jsPDF } = await import('jspdf');
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  await shareOrDownload(file, filename, title, () => pdf.save(filename));
}

export async function shareReceiptAsJpg(elementId, filename, title) {
  const canvas = await captureElement(elementId);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  const file = new File([blob], filename, { type: 'image/jpeg' });
  await shareOrDownload(file, filename, title, () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
