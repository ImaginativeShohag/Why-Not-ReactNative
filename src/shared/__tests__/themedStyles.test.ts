import { useThemedStyles } from "@/src/shared/hooks/use-themed-styles";

type Colors = { text: string };

describe("useThemedStyles", () => {
  const light: Colors = { text: "#000" };
  const dark: Colors = { text: "#fff" };

  it("builds once per factory and palette, and shares the result", () => {
    const factory = jest.fn((c: Colors) => ({ color: c.text }));
    const first = useThemedStyles(light, factory);
    const second = useThemedStyles(light, factory);
    expect(second).toBe(first);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("keeps a separate result for each palette", () => {
    const factory = jest.fn((c: Colors) => ({ color: c.text }));
    expect(useThemedStyles(light, factory)).toEqual({ color: "#000" });
    expect(useThemedStyles(dark, factory)).toEqual({ color: "#fff" });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("does not share results between different factories", () => {
    const a = useThemedStyles(light, (c: Colors) => ({ a: c.text }));
    const b = useThemedStyles(light, (c: Colors) => ({ b: c.text }));
    expect(a).not.toBe(b);
  });
});
