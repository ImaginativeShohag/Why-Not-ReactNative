import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "../api/errors";
import {
  fetchWishlist,
  updateWishlist,
  type WishlistOwner,
} from "../api/wishlist.api";
import { useSession } from "../auth/useSession";
import { track } from "../utils/analytics";
import { queryKeys } from "../utils/queryKeys";

const useOwner = (): WishlistOwner => {
  const { user } = useSession();
  return user?.id ?? "guest";
};

export function useWishlistIds() {
  const owner = useOwner();
  return useQuery({
    queryKey: queryKeys.wishlist.ids(owner),
    queryFn: () => fetchWishlist(owner),
  });
}

/**
 * Optimistic toggle with rollback:
 *   onMutate  → cancel in-flight reads, snapshot, write the expected state
 *   onError   → restore the snapshot (the UI must not keep lying)
 *   onSettled → refetch so we converge on the server's truth either way
 */
function useToggleWishlist(
  options: { onError?: (message: string) => void } = {},
) {
  const owner = useOwner();
  const queryClient = useQueryClient();
  const key = queryKeys.wishlist.ids(owner);

  return useMutation({
    mutationFn: ({
      productId,
      wishlisted,
    }: {
      productId: number;
      wishlisted: boolean;
    }) => updateWishlist(owner, productId, wishlisted),
    onMutate: async ({ productId, wishlisted }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<number[]>(key);
      queryClient.setQueryData<number[]>(key, (ids = []) =>
        wishlisted
          ? [...new Set([...ids, productId])]
          : ids.filter((id) => id !== productId),
      );
      track("wishlist_toggle", { product_id: productId, added: wishlisted });
      return { previous };
    },
    onError: (error, _vars, context) => {
      queryClient.setQueryData(key, context?.previous);
      options.onError?.(
        getErrorMessage(error) ?? "Couldn't update your wishlist.",
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

/** Convenience for lists: the id set plus a toggle that reports failures. */
export function useWishlist(onError?: (message: string) => void) {
  const { data: ids = [] } = useWishlistIds();
  const toggle = useToggleWishlist({ onError });
  const set = new Set(ids);
  return {
    ids: set,
    isWishlisted: (productId: number) => set.has(productId),
    toggle: (productId: number) =>
      toggle.mutate({ productId, wishlisted: !set.has(productId) }),
  };
}
