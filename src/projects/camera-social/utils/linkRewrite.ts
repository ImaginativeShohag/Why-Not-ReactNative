/**
 * System-URL rewrites for Camera & Social, consumed by the root
 * `src/app/+native-intent.tsx` before expo-router resolves a route. Pure so
 * the URL shapes are unit-tested rather than discovered on a device.
 */

export const SHARE_INBOUND_ROUTE = "/projects/camera-social/share-inbound";

const POST_ID = /^[A-Za-z0-9_-]+$/;

/**
 * - expo-share-intent opens the app with `<scheme>://dataUrl=<scheme>ShareKey…`
 *   (iOS share extension). That is not a route — send it to the inbound
 *   screen, whose provider then reads the payload from the native module.
 * - Universal links `https://<linkDomain>/post/<id>` map onto the namespaced
 *   route `/projects/camera-social/post/<id>`; the custom scheme form
 *   `whynotreactnative://projects/camera-social/post/<id>` already matches.
 *
 * Returns null when the path isn't ours, so the caller can try other projects.
 */
export function rewriteCameraSocialPath(
  path: string,
  linkDomain: string,
): string | null {
  if (path.includes("dataUrl=")) return SHARE_INBOUND_ROUTE;

  let pathname = path;
  const match = /^https?:\/\/([^/?#]+)(\/[^?#]*)?/i.exec(path);
  if (match) {
    if (match[1].toLowerCase() !== linkDomain.toLowerCase()) return null;
    pathname = match[2] ?? "/";
  }

  const post = /^\/?post\/([^/?#]+)\/?$/.exec(pathname);
  if (post && POST_ID.test(post[1])) {
    return `/projects/camera-social/post/${post[1]}`;
  }
  return null;
}
