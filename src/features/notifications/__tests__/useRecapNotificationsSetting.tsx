import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { useRecapNotificationsSetting } from "../useRecapNotificationsSetting";
import type { RecapNotificationsSettingResult } from "../useRecapNotificationsSetting";

const createPermission = ({
  granted = false,
  grantOnRequest = true,
}: {
  granted?: boolean;
  grantOnRequest?: boolean;
}) => {
  let isGranted = granted;
  return {
    hasPermission: () => Promise.resolve(isGranted),
    requestPermission: () => {
      isGranted ||= grantOnRequest;
      return Promise.resolve(isGranted);
    },
  };
};

const renderSetting = async (
  permission: ReturnType<typeof createPermission>
) => {
  const hook = await renderHook(
    () => ({
      recaps: useRecapNotificationsSetting(permission),
      load: useSettingsLoad(),
    }),
    { wrapper: SettingsProvider }
  );
  await waitFor(() => {
    expect(hook.result.current.load.status).toBe("ready");
  });
  return hook;
};

describe("useRecapNotificationsSetting()", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("turns on after permission is granted", async () => {
    const hook = await renderSetting(createPermission({}));

    let result: RecapNotificationsSettingResult = {};
    await act(async () => {
      result = await hook.result.current.recaps.setEnabled(true);
    });

    expect(result.permissionGranted).toBe(true);
    expect(hook.result.current.recaps.enabled).toBe(true);
  });

  test("stays off when permission is denied", async () => {
    const hook = await renderSetting(
      createPermission({ grantOnRequest: false })
    );

    let result: RecapNotificationsSettingResult = {};
    await act(async () => {
      result = await hook.result.current.recaps.setEnabled(true);
    });

    expect(result.permissionGranted).toBe(false);
    expect(hook.result.current.recaps.enabled).toBe(false);
  });

  test("turns off without asking for permission", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, recapNotificationsEnabled: true })
    );
    const permission = createPermission({ granted: true });
    const hasPermission = jest.spyOn(permission, "hasPermission");
    const requestPermission = jest.spyOn(permission, "requestPermission");
    const hook = await renderSetting(permission);

    await act(async () => {
      await hook.result.current.recaps.setEnabled(false);
    });

    expect(hook.result.current.recaps.enabled).toBe(false);
    expect(hasPermission).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
  });
});
