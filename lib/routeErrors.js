// Next.js signals its own internal control flow (redirect(), notFound(), the static-vs-dynamic
// render probe during `next build`) by throwing specially-tagged errors that must propagate
// uncaught — a generic catch-all around a route handler has to let these through, or it can break
// that mechanism (e.g. a route silently getting pre-rendered as static instead of per-request).
const NEXT_INTERNAL_DIGESTS = ['DYNAMIC_SERVER_USAGE', 'NEXT_NOT_FOUND'];

export function rethrowIfNextInternal(e) {
  const digest = e?.digest;
  if (typeof digest !== 'string') return;
  if (NEXT_INTERNAL_DIGESTS.includes(digest) || digest.startsWith('NEXT_REDIRECT')) {
    throw e;
  }
}
