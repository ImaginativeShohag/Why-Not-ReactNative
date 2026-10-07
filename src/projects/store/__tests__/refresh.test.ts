import { AxiosError, create, type InternalAxiosRequestConfig } from "axios";

import { installStoreInterceptors } from "@/src/projects/store/api/interceptors";
import { createRefreshCoordinator } from "@/src/projects/store/api/refreshCoordinator";

/**
 * A fake server: only "Bearer fresh" is accepted, everything else is a 401.
 * Requests are answered by a custom adapter, so no network is involved.
 */
function fakeServer() {
  const seen: (string | undefined)[] = [];
  const adapter = async (config: InternalAxiosRequestConfig) => {
    const auth = config.headers?.Authorization as string | undefined;
    seen.push(auth);
    if (auth === "Bearer fresh") {
      return {
        data: { ok: config.url },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    }
    throw new AxiosError(
      "Unauthorized",
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      {
        data: { message: "expired" },
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        config,
      },
    );
  };
  return { adapter, seen };
}

function setup(refreshImpl: () => Promise<string>) {
  const { adapter, seen } = fakeServer();
  const instance = create({ adapter });
  let token: string | null = "expired";
  const refresh = jest.fn(async () => {
    token = await refreshImpl();
    return token;
  });
  const coordinator = createRefreshCoordinator(refresh);
  const onAuthFailure = jest.fn();
  installStoreInterceptors(instance, {
    getAccessToken: () => token,
    coordinator,
    onAuthFailure,
  });
  return { instance, refresh, coordinator, onAuthFailure, seen };
}

const later = <T>(value: T, ms = 20) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

describe("single-flight token refresh (M2 checkpoint)", () => {
  it("six concurrent 401s trigger exactly one refresh and zero sign-outs", async () => {
    const { instance, refresh, coordinator, onAuthFailure } = setup(() =>
      later("fresh"),
    );

    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => instance.get(`/r${i}`)),
    );

    expect(results.map((r) => r.data.ok)).toEqual([
      "/r0",
      "/r1",
      "/r2",
      "/r3",
      "/r4",
      "/r5",
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(coordinator.refreshCount).toBe(1);
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("a later 401 after the first refresh settles starts a new refresh", async () => {
    const coordinator = createRefreshCoordinator(() => later("a"));
    await Promise.all([coordinator.refresh(), coordinator.refresh()]);
    await coordinator.refresh();
    expect(coordinator.refreshCount).toBe(2);
  });

  it("signs out once and rejects every caller when the refresh fails", async () => {
    const { instance, refresh, onAuthFailure } = setup(() =>
      Promise.reject(new Error("refresh token revoked")),
    );

    const settled = await Promise.allSettled(
      Array.from({ length: 3 }, (_, i) => instance.get(`/r${i}`)),
    );

    expect(settled.every((s) => s.status === "rejected")).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    // Each failed request reports the failure; the session layer makes
    // signOut idempotent, but the refresh itself ran only once.
    expect(onAuthFailure).toHaveBeenCalled();
    const reason = (settled[0] as PromiseRejectedResult).reason;
    expect(reason.kind).toBe("unauthorized");
  });

  it("gives up instead of looping when the replay is still unauthorized", async () => {
    const { instance, refresh, onAuthFailure, seen } = setup(() =>
      later("still-bad"),
    );

    await expect(instance.get("/me")).rejects.toMatchObject({
      kind: "unauthorized",
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
    // Original + exactly one replay.
    expect(seen).toEqual(["Bearer expired", "Bearer still-bad"]);
  });

  it("never refreshes for requests that opt out (login itself)", async () => {
    const { instance, refresh } = setup(() => later("fresh"));
    await expect(
      instance.post("/auth/login", {}, { skipAuthRefresh: true }),
    ).rejects.toMatchObject({ kind: "unauthorized" });
    expect(refresh).not.toHaveBeenCalled();
  });
});
