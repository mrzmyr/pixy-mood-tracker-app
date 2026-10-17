import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import { useNotificationPermissionDenied } from "../useNotificationPermissionDenied";

describe("useNotificationPermissionDenied()", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("reports denied permission", async () => {
    const read = jest.fn().mockResolvedValue(true);
    const hook = await renderHook(() => useNotificationPermissionDenied(read));

    await waitFor(() => expect(hook.result.current.denied).toBe(true));
  });

  test("reports no denial when permission is granted", async () => {
    const read = jest.fn().mockResolvedValue(false);
    const hook = await renderHook(() => useNotificationPermissionDenied(read));

    await waitFor(() => expect(read).toHaveBeenCalled());
    expect(hook.result.current.denied).toBe(false);
  });

  test("clears the denial when the app returns to the foreground after the user allowed notifications", async () => {
    const addListener = jest
      .spyOn(AppState, "addEventListener")
      .mockReturnValue({ remove: jest.fn() });
    const read = jest.fn().mockResolvedValue(true);
    const hook = await renderHook(() => useNotificationPermissionDenied(read));
    await waitFor(() => expect(hook.result.current.denied).toBe(true));

    read.mockResolvedValue(false);
    // Strict mode mounts twice; the last listener belongs to the live effect.
    const [, onChange] = addListener.mock.calls.at(-1) ?? [];
    await act(async () => {
      onChange?.("active");
      await Promise.resolve();
    });

    await waitFor(() => expect(hook.result.current.denied).toBe(false));
  });

  test("refresh reads the permission again", async () => {
    const read = jest.fn().mockResolvedValue(false);
    const hook = await renderHook(() => useNotificationPermissionDenied(read));
    await waitFor(() => expect(hook.result.current.denied).toBe(false));

    read.mockResolvedValue(true);
    await act(async () => {
      await hook.result.current.refresh();
    });

    expect(hook.result.current.denied).toBe(true);
  });
});
