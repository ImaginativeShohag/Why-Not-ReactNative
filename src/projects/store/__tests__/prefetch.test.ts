import { QueryClient } from "@tanstack/react-query";

import { fetchProductDetails } from "@/src/projects/store/api/product.api";
import { usePrefetchProduct } from "@/src/projects/store/hooks/useProduct";
import type { Product } from "@/src/projects/store/models/Product";
import { queryKeys } from "@/src/projects/store/utils/queryKeys";

// A real QueryClient; only the hook's lookup of it and the network are faked.
const mockClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: Infinity } },
});

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => mockClient,
}));
jest.mock("@/src/projects/store/api/product.api", () => ({
  fetchProductDetails: jest.fn(),
}));

const fetchMock = jest.mocked(fetchProductDetails);

const LIST_ITEM: Product = {
  id: 7,
  title: "From the list",
  price: 10,
  description: "",
  category: "misc",
  image: "",
  rating: { rate: 4, count: 1 },
};

describe("usePrefetchProduct", () => {
  beforeEach(() => {
    mockClient.clear();
    // The store's real default: 60s staleTime on every ["store", …] key.
    mockClient.setQueryDefaults(queryKeys.all, { staleTime: 60 * 1000 });
    fetchMock.mockReset();
  });

  it("seeds the cache for an instant paint but still runs the detail request", async () => {
    let resolve!: (p: Product) => void;
    fetchMock.mockReturnValue(new Promise<Product>((r) => (resolve = r)));

    usePrefetchProduct()(LIST_ITEM);
    const key = queryKeys.products.detail(LIST_ITEM.id);

    // The seed is readable straight away, and already stale.
    expect(mockClient.getQueryData(key)).toEqual(LIST_ITEM);
    expect(mockClient.getQueryState(key)?.dataUpdatedAt).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolve({ ...LIST_ITEM, title: "From the detail endpoint" });
    await mockClient.getQueryCache().find({ queryKey: key })?.promise;
    expect(mockClient.getQueryData<Product>(key)?.title).toBe(
      "From the detail endpoint",
    );
    expect(mockClient.getQueryState(key)?.dataUpdatedAt).toBeGreaterThan(0);
  });

  it("does not refetch real detail data that is still fresh", async () => {
    fetchMock.mockResolvedValue(LIST_ITEM);
    const prefetch = usePrefetchProduct();
    prefetch(LIST_ITEM);
    await mockClient
      .getQueryCache()
      .find({ queryKey: queryKeys.products.detail(LIST_ITEM.id) })?.promise;

    prefetch(LIST_ITEM);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
