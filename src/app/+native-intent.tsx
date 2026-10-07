import { rewriteCameraSocialPath } from "@/src/projects/camera-social/utils/linkRewrite";
import { rewriteStoreSystemPath } from "@/src/projects/store/navigation/linkRoutes";
import { env } from "@/src/shared/constants/env";

/**
 * Rewrites system URLs (universal links, share-extension callbacks) into
 * routes before expo-router resolves them. The launcher owns the root, so
 * every project's external URL shapes are mapped onto `/projects/<slug>/…`
 * here. Each project supplies a pure rewriter; the first match wins.
 */
const REWRITERS: ((path: string) => string | null)[] = [
  (path) => rewriteCameraSocialPath(path, env.linkDomain),
  (path) => rewriteStoreSystemPath(path, env.linkDomain),
];

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    for (const rewrite of REWRITERS) {
      const route = rewrite(path);
      if (route) return route;
    }
  } catch {
    // Never crash on a malformed URL — fall through to the router's own match.
  }
  return path;
}
