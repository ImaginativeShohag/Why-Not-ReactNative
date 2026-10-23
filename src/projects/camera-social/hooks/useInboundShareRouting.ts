import { usePathname, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect, useRef } from "react";

import { SHARE_INBOUND_ROUTE } from "@/src/projects/camera-social/utils/linkRewrite";

/**
 * Land on the inbound screen whenever the OS hands us shared media, from
 * anywhere in the app. Mounted at the root (inside the root
 * ShareIntentProvider) because a share can arrive while the user is in the
 * launcher or another project — and on Android it's an intent, not a URL, so
 * +native-intent never sees it.
 *
 * Each intent is routed once. Swiping the inbound screen away doesn't reset
 * the intent, so keying on "has files" alone would push it straight back.
 * expo-share-intent creates a new `shareIntent` object per share, so object
 * identity tells a new share from the one already shown.
 */
export function useInboundShareRouting() {
  const { hasShareIntent, shareIntent } = useShareIntentContext();
  const pathname = usePathname();
  const router = useRouter();
  const hasFiles = (shareIntent.files?.length ?? 0) > 0;
  const routed = useRef<object | null>(null);

  useEffect(() => {
    if (!hasShareIntent || !hasFiles) return;
    if (routed.current === shareIntent) return;
    routed.current = shareIntent;
    if (pathname === SHARE_INBOUND_ROUTE) return;
    router.push(SHARE_INBOUND_ROUTE);
  }, [hasShareIntent, hasFiles, pathname, router, shareIntent]);
}
