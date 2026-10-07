/**
 * Pure mapping from anything that can enter the app from outside (custom
 * scheme URL, universal link, push payload) to a store href. The project
 * prefix is mandatory — the launcher owns the root.
 */
export const STORE_PREFIX = "/projects/store";

/** Store routes a signed-out user may open without being bounced to sign-in. */
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot", "/onboarding"];

const PRODUCT_ID = /^\d+$/;
const ORDER_ID = /^[A-Za-z0-9-]+$/;

/**
 * Universal-link path → store href. `/p/42` → product, `/order/10482` → order.
 * Also used by the root `src/app/+native-intent.tsx`, via `rewriteStoreSystemPath`.
 */
export function storeHrefFromWebPath(path: string): string | null {
  const [pathname] = path.split(/[?#]/);
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "p" && segments[1] && PRODUCT_ID.test(segments[1])) {
    return `${STORE_PREFIX}/product/${segments[1]}`;
  }
  if (segments[0] === "order" && segments[1] && ORDER_ID.test(segments[1])) {
    return `${STORE_PREFIX}/order/${segments[1]}`;
  }
  return null;
}

/**
 * Any incoming URL → store href, or null when the URL isn't the store's.
 * Handles `whynotreactnative://projects/store/...`, `https://<domain>/p/42`
 * and bare paths.
 */
export function storeHrefFromUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  let path = url;
  const schemeMatch = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)(.*)$/i.exec(url);
  if (schemeMatch) {
    const [, host, rest] = schemeMatch;
    const isWeb = /^https?:/i.test(url);
    // Custom schemes put the first path segment in the "host" slot.
    path = isWeb ? rest || "/" : `/${host}${rest}`;
  }
  const [pathname] = path.split(/[?#]/);
  if (pathname.startsWith(`${STORE_PREFIX}/`) || pathname === STORE_PREFIX) {
    return pathname.replace(/\/+$/, "") || STORE_PREFIX;
  }
  return storeHrefFromWebPath(pathname);
}

/** True for store hrefs that sit behind the signed-in guard. */
export function isProtectedStoreHref(href: string): boolean {
  if (!href.startsWith(STORE_PREFIX)) return false;
  const rest = href.slice(STORE_PREFIX.length) || "/";
  if (rest === "/") return false;
  return !PUBLIC_PATHS.some((p) => rest === p || rest.startsWith(`${p}/`));
}

/** Routes a guest may not open: they need an account (checkout, orders). */
const ACCOUNT_PATHS = ["/checkout", "/orders", "/order"];

export function requiresAccount(href: string): boolean {
  if (!href.startsWith(STORE_PREFIX)) return false;
  const [rest] = href.slice(STORE_PREFIX.length).split("?");
  return ACCOUNT_PATHS.some((p) => rest === p || rest.startsWith(`${p}/`));
}

/**
 * System-URL rewrite for the root `src/app/+native-intent.tsx`: universal
 * links on our own domain (`https://<linkDomain>/p/42`, `/order/10482`) →
 * store routes. Other hosts and every non-web URL return null so the router
 * (or another project's rewriter) handles them.
 */
export function rewriteStoreSystemPath(
  path: string,
  linkDomain: string,
): string | null {
  const match = /^https?:\/\/([^/?#]+)(\/[^?#]*)?/i.exec(path);
  if (!match) return null;
  if (match[1].toLowerCase() !== linkDomain.toLowerCase()) return null;
  return storeHrefFromWebPath(match[2] ?? "/");
}
