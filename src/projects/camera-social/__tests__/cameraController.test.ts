import { act, renderHook } from "@testing-library/react-native";

import { useCameraController } from "../hooks/useCameraController";

// Keep native animation scheduling outside these hardware-selection tests.
jest.mock("react-native-reanimated", () => ({
  useSharedValue: function useSharedValue(initial: number) {
    const { useRef } = jest.requireActual<typeof import("react")>("react");
    const value = useRef(initial);
    return {
      get: () => value.current,
      set: (next: number) => {
        value.current = next;
      },
    };
  },
  withTiming: (value: number) => value,
}));

it("switches lenses by device type even when their names are localized", async () => {
  const { result } = await renderHook(() => useCameraController());
  const ultraWide = "AVCaptureDeviceTypeBuiltInUltraWideCamera";
  const wide = "AVCaptureDeviceTypeBuiltInWideAngleCamera";

  await act(() => {
    result.current.setLenses([
      { deviceType: ultraWide, localizedName: "超広角カメラ" },
      { deviceType: wide, localizedName: "広角カメラ" },
    ]);
  });
  expect(result.current.hasUltraWide).toBe(true);

  await act(() => result.current.setZoomFactor(0.5));
  expect(result.current.selectedLens).toBe(ultraWide);
  expect(result.current.isUltraWide).toBe(true);

  await act(() => result.current.setZoomFactor(1));
  expect(result.current.selectedLens).toBe(wide);
  expect(result.current.isUltraWide).toBe(false);

  await act(() => result.current.flip());
  expect(result.current.facing).toBe("front");
  expect(result.current.selectedLens).toBeUndefined();
  expect(result.current.hasUltraWide).toBe(false);
});

it("ignores the ultra-wide preset when the device has no ultra-wide lens", async () => {
  const { result } = await renderHook(() => useCameraController());
  await act(() => result.current.setZoomFactor(0.5));
  expect(result.current.selectedLens).toBeUndefined();
  expect(result.current.hasUltraWide).toBe(false);
});
