import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { LogsProvider } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { useContactImport } from "../hooks/useContactImport";
import { PeopleProvider } from "../PeopleProvider";
import { setPeopleSourcesOverride } from "../sources";
import type { PeopleSources } from "../sources";

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider>
      <LogsProvider>
        <PeopleProvider>{children}</PeopleProvider>
      </LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

const fakeSources = (
  listContacts: PeopleSources["listContacts"]
): PeopleSources => ({
  listContacts,
  getContactImage: () => Promise.resolve(null),
  getContactThumbnail: () => Promise.resolve(null),
  shareMoreContacts: () => Promise.resolve(),
  pickImage: () => Promise.resolve(null),
});

describe("useContactImport()", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    setPeopleSourcesOverride(null);
    jest.restoreAllMocks();
  });

  it("exposes a structured error when reading contacts fails, and Retry loads them", async () => {
    const listContacts = jest
      .fn<ReturnType<PeopleSources["listContacts"]>, []>()
      .mockRejectedValueOnce(new Error("CNErrorDomain 100"))
      .mockResolvedValueOnce({
        contacts: [{ contactId: "c1", name: "Sam" }],
        isLimited: false,
      });
    setPeopleSourcesOverride(fakeSources(listContacts));

    const hook = await renderHook(() => useContactImport(), { wrapper });

    await waitFor(() => expect(hook.result.current.error).not.toBeNull());
    expect(hook.result.current.isLoading).toBe(false);
    expect(hook.result.current.rows).toEqual([]);
    expect(hook.result.current.error).toMatchObject({
      status: "contacts_read_failed",
      message: "Contacts could not be read",
      why: "CNErrorDomain 100",
      fix: expect.any(String),
    });

    await act(() => hook.result.current.retry());

    await waitFor(() => expect(hook.result.current.rows).toHaveLength(1));
    expect(hook.result.current.error).toBeNull();
    expect(listContacts).toHaveBeenCalledTimes(2);
  });
});
