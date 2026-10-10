import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";
import { ensureLocationAccess, getLocationAccess } from "../access";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-location is a native module; each test picks the system state.
jest.mock("expo-location", () => ({
  PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
  hasServicesEnabledAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));

const mockServices = jest.mocked(Location.hasServicesEnabledAsync);
const mockPermission = jest.mocked(Location.getForegroundPermissionsAsync);
const mockRequest = jest.mocked(Location.requestForegroundPermissionsAsync);

const permission = (
  granted: boolean,
  canAskAgain: boolean
): Location.LocationPermissionResponse => ({
  status: granted
    ? Location.PermissionStatus.GRANTED
    : Location.PermissionStatus.DENIED,
  expires: "never",
  granted,
  canAskAgain,
});

const setSystem = ({
  services,
  granted,
  canAskAgain,
}: {
  services: boolean;
  granted: boolean;
  canAskAgain: boolean;
}) => {
  mockServices.mockResolvedValue(services);
  mockPermission.mockResolvedValue(permission(granted, canAskAgain));
};

/** Runs the last alert button, the one that opens a settings screen. */
const pressSettingsButton = () => {
  const buttons = jest.mocked(Alert.alert).mock.calls[0]?.[2] ?? [];
  buttons.at(-1)?.onPress?.();
};

const setPlatform = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
};

describe("location access", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Linking, "openSettings").mockResolvedValue();
    jest.spyOn(Linking, "sendIntent").mockResolvedValue();
    mockRequest.mockResolvedValue(permission(true, true));
  });

  afterEach(() => {
    setPlatform(originalOS);
  });

  describe("getLocationAccess()", () => {
    test("reports services off even when Pixy is allowed", async () => {
      setSystem({ services: false, granted: true, canAskAgain: true });
      await expect(getLocationAccess()).resolves.toBe("services_off");
    });

    test("reports denied when the system will not ask again", async () => {
      setSystem({ services: true, granted: false, canAskAgain: false });
      await expect(getLocationAccess()).resolves.toBe("denied");
    });

    test("reports can ask when the prompt can still show", async () => {
      setSystem({ services: true, granted: false, canAskAgain: true });
      await expect(getLocationAccess()).resolves.toBe("can_ask");
    });

    test("reports granted when Pixy may read the location", async () => {
      setSystem({ services: true, granted: true, canAskAgain: true });
      await expect(getLocationAccess()).resolves.toBe("granted");
    });

    test("falls back to the permission when the services check fails", async () => {
      setSystem({ services: true, granted: true, canAskAgain: true });
      mockServices.mockRejectedValue(new Error("unavailable"));
      await expect(getLocationAccess()).resolves.toBe("granted");
    });
  });

  describe("ensureLocationAccess()", () => {
    test("services off: explains, never asks for permission", async () => {
      setSystem({ services: false, granted: false, canAskAgain: true });

      await expect(ensureLocationAccess()).resolves.toBe(false);

      expect(mockRequest).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledTimes(1);
    });

    test("services off on iOS: action opens the app settings page", async () => {
      setPlatform("ios");
      setSystem({ services: false, granted: false, canAskAgain: true });

      await ensureLocationAccess();
      pressSettingsButton();

      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
      expect(Linking.sendIntent).not.toHaveBeenCalled();
    });

    test("services off on Android: action opens the location screen", async () => {
      setPlatform("android");
      setSystem({ services: false, granted: false, canAskAgain: true });

      await ensureLocationAccess();
      pressSettingsButton();

      expect(Linking.sendIntent).toHaveBeenCalledWith(
        "android.settings.LOCATION_SOURCE_SETTINGS"
      );
      expect(Linking.openSettings).not.toHaveBeenCalled();
    });

    test("services off on Android: opens app settings when the intent fails", async () => {
      setPlatform("android");
      setSystem({ services: false, granted: false, canAskAgain: true });
      jest
        .mocked(Linking.sendIntent)
        .mockRejectedValue(new Error("no handler"));

      await ensureLocationAccess();
      pressSettingsButton();
      await Promise.resolve();
      await Promise.resolve();

      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });

    test("denied for good: explains, opens app settings, never asks", async () => {
      setSystem({ services: true, granted: false, canAskAgain: false });

      await expect(ensureLocationAccess()).resolves.toBe(false);
      pressSettingsButton();

      expect(mockRequest).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledTimes(1);
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });

    test("can ask: shows the system prompt and allows on yes", async () => {
      setSystem({ services: true, granted: false, canAskAgain: true });

      await expect(ensureLocationAccess()).resolves.toBe(true);

      expect(mockRequest).toHaveBeenCalledTimes(1);
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    test("can ask: explains denial after the user refuses the prompt", async () => {
      setSystem({ services: true, granted: false, canAskAgain: true });
      mockRequest.mockResolvedValue(permission(false, false));

      await expect(ensureLocationAccess()).resolves.toBe(false);

      expect(Alert.alert).toHaveBeenCalledTimes(1);
    });

    test("granted: allows without prompt or alert", async () => {
      setSystem({ services: true, granted: true, canAskAgain: true });

      await expect(ensureLocationAccess()).resolves.toBe(true);

      expect(mockRequest).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });
});
