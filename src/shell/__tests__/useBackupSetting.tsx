import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import * as backup from "@/lib/backup";
import { SettingsProvider, STORAGE_KEY, useSettings } from "@/state/settings";
import { useBackupSetting } from "../useBackupSetting";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

describe("useBackupSetting()", () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  test("applies the stored switch after load and every change", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...INITIAL_STATE, backupEnabled: false })
    );
    const apply = jest.spyOn(backup, "applyBackupEnabled");

    const hook = await renderHook(
      () => {
        useBackupSetting();
        return useSettings();
      },
      { wrapper }
    );

    await waitFor(() => expect(apply).toHaveBeenLastCalledWith(false));
    expect(apply).not.toHaveBeenCalledWith(true);

    await act(() => {
      hook.result.current.setSettings((current) => ({
        ...current,
        backupEnabled: true,
      }));
    });

    await waitFor(() => expect(apply).toHaveBeenLastCalledWith(true));
  });

  test("defaults to on for settings stored before the switch existed", async () => {
    const { backupEnabled: _removed, ...legacy } = INITIAL_STATE;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const apply = jest.spyOn(backup, "applyBackupEnabled");

    await renderHook(() => useBackupSetting(), { wrapper });

    await waitFor(() => expect(apply).toHaveBeenCalledWith(true));
  });
});
