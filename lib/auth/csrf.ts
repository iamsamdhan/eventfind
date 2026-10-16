/**
 * CSRF & Origin Validation Utilities for EventFind
 * 
 * Protects cookie-authenticated state-changing operations against
 * Cross-Site Request Forgery by strictly verifying the request Origin/Referer.
 */

export function verifyRequestOrigin(request: Request): { valid: boolean; reason?: string } {
  // Safe methods (GET, HEAD, OPTIONS) do not alter state
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { valid: true };
  }

  const originHeader = request.headers.get("origin");
  const hostHeader = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const refererHeader = request.headers.get("referer");

  const expectedHost = forwardedHost || hostHeader;

  // 1. Verify Origin header (standard in modern browser state-changing requests)
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);

      if (expectedHost && originUrl.host.toLowerCase() === expectedHost.toLowerCase()) {
        return { valid: true };
      }

      if (process.env.NEXT_PUBLIC_APP_URL) {
        const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
        if (originUrl.host.toLowerCase() === appUrl.host.toLowerCase()) {
          return { valid: true };
        }
      }

      return {
        valid: false,
        reason: `Cross-site origin rejected: "${originHeader}" does not match target host "${expectedHost}".`,
      };
    } catch {
      return { valid: false, reason: `Malformed Origin header: "${originHeader}".` };
    }
  }

  // 2. Fallback to Referer header if Origin is not supplied
  if (refererHeader) {
    try {
      const refererUrl = new URL(refererHeader);

      if (expectedHost && refererUrl.host.toLowerCase() === expectedHost.toLowerCase()) {
        return { valid: true };
      }

      if (process.env.NEXT_PUBLIC_APP_URL) {
        const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
        if (refererUrl.host.toLowerCase() === appUrl.host.toLowerCase()) {
          return { valid: true };
        }
      }

      return {
        valid: false,
        reason: `Cross-site referer rejected: "${refererHeader}" does not match target host "${expectedHost}".`,
      };
    } catch {
      return { valid: false, reason: `Malformed Referer header: "${refererHeader}".` };
    }
  }

  // 3. If neither Origin nor Referer is present:
  // In production, state-changing requests with ambient cookies must be rejected if unverified.
  if (process.env.NODE_ENV === "production") {
    return {
      valid: false,
      reason: "Missing Origin and Referer headers on state-changing request in production.",
    };
  }

  // In test / development without headers (e.g. direct curl or internal test requests), permit
  return { valid: true };
}

