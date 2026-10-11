import { Alert } from "react-native";
import { defaultReminderScheduler } from "../reminderScheduler";

// oxlint-disable-next-line anti-slop/no-module-mocking -- device check is native; Jest needs a simulator-like device.
jest.mock("expo-device", () => ({ __esModule: true, isDevice: false }));
// oxlint-disable-next-line anti-slop/no-module-mocking -- native notification module is unavailable in Jest.
jest.mock("expo-notifications", () => ({
  __esModule: true,
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

describe("defaultReminderScheduler on a simulator", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  test.each(["hasPermission", "requestPermission"] as const)(
    "%s denies and explains with a titled alert",
    async (method) => {
      await expect(defaultReminderScheduler[method]()).resolves.toBe(false);

      const [title, message] = jest.mocked(Alert.alert).mock.lastCall ?? [];
      expect(title).toBeTruthy();
      expect(title).not.toBe("Alert");
      expect(message).toBeTruthy();
    }
  );
});
