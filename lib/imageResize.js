'use client';

// Produces a small PNG version of an uploaded logo (whatever format it was — PNG/JPEG/WEBP/SVG) for
// embedding in generated documents (receipts, invoices, and anything else that just needs a compact
// logo) — capped to a small pixel footprint regardless of how large the original branding upload was,
// and kept as PNG (not JPEG) so any transparency in the source is preserved rather than flattened.
export async function resizeImageToPng(file, maxDim = 200) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read that image'));
      el.src = objectUrl;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('Could not read image dimensions');

    const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not encode the resized image');
    return new File([blob], 'logo-small.png', { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
