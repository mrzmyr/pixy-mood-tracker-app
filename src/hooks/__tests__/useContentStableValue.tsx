import { renderHook } from "@testing-library/react-native";
import { useContentStableValue } from "@/hooks/useContentStableValue";

describe("useContentStableValue()", () => {
  test("keeps the previous reference for equal content", async () => {
    const first = { items: [1, 2] };
    const hook = await renderHook(({ value }) => useContentStableValue(value), {
      initialProps: { value: first },
    });

    await hook.rerender({ value: { items: [1, 2] } });

    expect(hook.result.current).toBe(first);
  });

  test("returns the new value when content changes", async () => {
    const hook = await renderHook(({ value }) => useContentStableValue(value), {
      initialProps: { value: { items: [1, 2] } },
    });

    const next = { items: [1, 2, 3] };
    await hook.rerender({ value: next });

    expect(hook.result.current).toBe(next);

    await hook.rerender({ value: { items: [1, 2, 3] } });

    expect(hook.result.current).toBe(next);
  });
});
