// High-grade session policy: auth cookies are SESSION cookies (no maxAge /
// expires) so the browser clears them when it fully closes. Personal data +
// admin access → we do not want a 400-day persistent login (the @supabase/ssr
// default).
//
// A cookie is only downgraded to session-scope when it is being SET. Deletions
// (empty value, or maxAge <= 0) are passed through untouched so sign-out and
// chunked-cookie cleanup still clear cookies immediately.

export function toSessionCookie<T extends { maxAge?: number; expires?: Date }>(
  value: string,
  options: T,
): T {
  const isDeletion = !value || (options.maxAge != null && options.maxAge <= 0);
  if (isDeletion) return options;
  const next = { ...options };
  delete next.maxAge;
  delete next.expires;
  return next;
}
