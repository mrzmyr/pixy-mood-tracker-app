import Alert from "@/lib/Alert";
import { askToRemove } from "../prompts";

const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

const lastCall = () => {
  const call = alertSpy.mock.lastCall;
  return { buttons: call?.[2] ?? [], options: call?.[3] };
};

describe("askToRemove", () => {
  beforeEach(() => alertSpy.mockClear());

  it("puts cancel before the destructive button", () => {
    askToRemove().catch(() => {});
    expect(lastCall().buttons.map((b) => b.style)).toEqual([
      "cancel",
      "destructive",
    ]);
  });

  it("resolves when the destructive button is pressed", async () => {
    const result = askToRemove();
    lastCall().buttons[1].onPress?.();
    await expect(result).resolves.toEqual({});
  });

  it("rejects with prompt_cancelled when cancel is pressed", async () => {
    const result = askToRemove();
    lastCall().buttons[0].onPress?.();
    await expect(result).rejects.toMatchObject({ status: "prompt_cancelled" });
  });

  it("rejects with prompt_cancelled on a tap outside the dialog", async () => {
    const result = askToRemove();
    const { options } = lastCall();
    expect(options?.cancelable).toBe(true);
    options?.onDismiss?.();
    await expect(result).rejects.toMatchObject({
      status: "prompt_cancelled",
      why: expect.any(String),
      fix: expect.any(String),
    });
  });
});
