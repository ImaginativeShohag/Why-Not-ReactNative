import { usePathname, useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect } from "react";

import { SHARE_INBOUND_ROUTE } from "@/src/projects/camera-social/utils/linkRewrite";

/**
 * Land on the inbound screen whenever the OS hands us shared media, from
 * anywhere in the app. Mounted at the root (inside the root
 * ShareIntentProvider) because a share can arrive while the user is in the
 * launcher or another project — and on Android it's an intent, not a URL, so
 * +native-intent never sees it.
 */
export function useInboundShareRouting() {
  const { hasShareIntent, shareIntent } = useShareIntentContext();
  const pathname = usePathname();
  const router = useRouter();
  const hasFiles = (shareIntent.files?.length ?? 0) > 0;

  useEffect(() => {
    if (!hasShareIntent || !hasFiles) return;
    if (pathname === SHARE_INBOUND_ROUTE) return;
    router.push(SHARE_INBOUND_ROUTE);
  }, [hasShareIntent, hasFiles, pathname, router]);
}
