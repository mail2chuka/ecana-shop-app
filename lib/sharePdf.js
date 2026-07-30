'use client';

// Renders the given element to a single-page PDF matching its own content size, then hands it to the
// OS share sheet (Web Share API — WhatsApp, email, etc. can pick it up directly) when the browser
// supports sharing files; otherwise falls back to a plain download so the user can share it manually.
// jsPDF/html2canvas are dynamically imported so they don't add weight to every page's JS bundle —
// only pages with a share button ever load them, and only once actually clicked.
export async function sharePdf({ elementId, filename, title }) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const el = document.getElementById(elementId);
  if (!el) throw new Error('Nothing to export');

  // useCORS: the org logo is served from Vercel Blob — a different origin than the app — so without
  // this, html2canvas silently fails to draw it (or throws on export) instead of just omitting it.
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: title || filename });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // user closed the share sheet — not a failure
      // Any other error (e.g. share target rejected the file): fall through to a plain download.
    }
  }
  pdf.save(filename);
}
