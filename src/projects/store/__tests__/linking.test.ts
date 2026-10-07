import {
  isProtectedStoreHref,
  requiresAccount,
  rewriteStoreSystemPath,
  storeHrefFromUrl,
} from "@/src/projects/store/navigation/linkRoutes";
import {
  hrefFromNotification,
  NOTIFICATION_ACTIONS,
  parseNotificationData,
} from "@/src/projects/store/notifications/routeFromNotification";

const DOMAIN = "whynotreactnative.example.com";

describe("deep and universal links", () => {
  it("maps universal links on our domain only", () => {
    expect(rewriteStoreSystemPath(`https://${DOMAIN}/p/42`, DOMAIN)).toBe(
      "/projects/store/product/42",
    );
    expect(
      rewriteStoreSystemPath(`https://${DOMAIN}/order/10482?utm=x`, DOMAIN),
    ).toBe("/projects/store/order/10482");
    expect(
      rewriteStoreSystemPath("https://evil.example/p/42", DOMAIN),
    ).toBeNull();
    expect(
      rewriteStoreSystemPath(`https://${DOMAIN}/p/abc`, DOMAIN),
    ).toBeNull();
    expect(
      rewriteStoreSystemPath("whynotreactnative://projects/store/bag", DOMAIN),
    ).toBeNull();
  });

  it("parses custom-scheme URLs into namespaced hrefs", () => {
    expect(storeHrefFromUrl("whynotreactnative://projects/store/order/7")).toBe(
      "/projects/store/order/7",
    );
    expect(
      storeHrefFromUrl("whynotreactnative://projects/tic-tac-toe"),
    ).toBeNull();
  });

  it("knows which destinations need a session or an account", () => {
    expect(isProtectedStoreHref("/projects/store/order/7")).toBe(true);
    expect(isProtectedStoreHref("/projects/store/sign-in")).toBe(false);
    expect(isProtectedStoreHref("/projects/store")).toBe(false);
    expect(requiresAccount("/projects/store/checkout/address")).toBe(true);
    expect(requiresAccount("/projects/store/product/1")).toBe(false);
  });
});

describe("push payload routing", () => {
  it("ignores other projects' notifications", () => {
    expect(
      parseNotificationData({ url: "/projects/offline-journal/entry/compose" }),
    ).toBeNull();
    expect(
      hrefFromNotification({ project: "journal", type: "order", orderId: "1" }),
    ).toBeNull();
  });

  it("routes taps and action buttons", () => {
    const data = { project: "store", type: "order", orderId: "10482" };
    expect(hrefFromNotification(data)).toBe("/projects/store/order/10482");
    expect(hrefFromNotification(data, NOTIFICATION_ACTIONS.reorder)).toBe(
      "/projects/store/order/10482?reorder=1",
    );
    expect(
      hrefFromNotification({
        project: "store",
        type: "product",
        productId: "42",
      }),
    ).toBe("/projects/store/product/42");
  });

  it("rejects ids that could smuggle a path", () => {
    expect(
      hrefFromNotification({
        project: "store",
        type: "order",
        orderId: "../../x",
      }),
    ).toBeNull();
    expect(
      hrefFromNotification({
        project: "store",
        type: "product",
        productId: -1,
      }),
    ).toBeNull();
  });
});
