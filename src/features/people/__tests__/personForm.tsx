import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";
import { userEvent, waitFor } from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Pressable, Text } from "react-native";
import { LogsProvider } from "@/features/logs";
import Alert from "@/lib/Alert";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import {
  PeopleProvider,
  STORAGE_KEY,
  usePeopleLoad,
  usePeopleState,
} from "../PeopleProvider";
import type { Person } from "../PeopleProvider";
import { PersonEdit } from "../screens/PersonForm";
import { setPeopleSourcesOverride } from "../sources";
import type { PeopleSources } from "../sources";

const sam: Person = {
  id: "4b4b4b4b-0000-4000-8000-000000000001",
  name: "Sam",
  avatar: "people/4b4b4b4b-0000-4000-8000-000000000001.jpg",
  contactId: "contact-sam",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const sources = (overrides: Partial<PeopleSources>): PeopleSources => ({
  listContacts: () => Promise.resolve({ contacts: [], isLimited: false }),
  getContactImage: () => Promise.resolve(null),
  getContactThumbnail: () => Promise.resolve(null),
  shareMoreContacts: () => Promise.resolve(),
  pickImage: () => Promise.resolve(null),
  ...overrides,
});

/** Opens the editor once the store is loaded, like the People list does. */
const PeopleScreen = () => {
  const router = useRouter();
  const load = usePeopleLoad();
  const { people } = usePeopleState();
  if (load.status !== "ready") {
    return null;
  }
  return (
    <>
      <Pressable onPress={() => router.push(`/people/${sam.id}`)}>
        <Text>Open Sam</Text>
      </Pressable>
      <Text>{people.map((person) => person.name).join(",")}</Text>
    </>
  );
};

const openEditor = async () => {
  await renderRouter(
    {
      _layout: () => (
        <SettingsProvider>
          <AnalyticsProvider>
            <LogsProvider>
              <PeopleProvider>
                <Stack />
              </PeopleProvider>
            </LogsProvider>
          </AnalyticsProvider>
        </SettingsProvider>
      ),
      people: PeopleScreen,
      "people/[id]": PersonEdit,
    },
    { initialUrl: "/people" }
  );
  jest.useRealTimers();
  const user = userEvent.setup();
  await user.press(await screen.findByText("Open Sam"));
  await screen.findByText("Edit Person");
  return user;
};

describe("PersonEdit", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ people: [sam] }));
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "getInfoAsync").mockResolvedValue({
      exists: false,
      isDirectory: false,
      uri: "",
    });
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    setPeopleSourcesOverride(null);
    jest.restoreAllMocks();
  });

  test("save with an empty name shows an inline error and keeps the screen", async () => {
    const user = await openEditor();

    await user.clear(screen.getByTestId("person-name"));
    await user.press(screen.getByTestId("person-save"));

    expect(await screen.findByText("Enter a name.")).toBeTruthy();
    expect(screen.getByText("Edit Person")).toBeTruthy();

    await user.type(screen.getByTestId("person-name"), "Sammy");
    await waitFor(() => expect(screen.queryByText("Enter a name.")).toBeNull());
  });

  test("contact photo: alerts when the contact has no photo", async () => {
    setPeopleSourcesOverride(sources({}));
    const user = await openEditor();

    await user.press(screen.getByLabelText("Use Contact Photo"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "No Contact Photo",
        "This contact has no photo. Choose a photo from your library instead."
      )
    );
  });

  test("contact photo: alerts when contacts access is denied", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    setPeopleSourcesOverride(
      sources({
        getContactImage: () => Promise.reject(new Error("denied")),
      })
    );
    const user = await openEditor();

    await user.press(screen.getByLabelText("Use Contact Photo"));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Contacts Access Needed",
        "Allow Contacts for Pixy in the system settings to use the contact photo."
      )
    );
  });

  test("remove photo switches the button to Add Photo", async () => {
    const user = await openEditor();
    expect(screen.queryByLabelText("Add Photo")).toBeNull();

    await user.press(screen.getByLabelText("Remove Photo"));

    expect(await screen.findByLabelText("Add Photo")).toBeTruthy();
  });

  test("delete row names the entry count before the confirm", async () => {
    await openEditor();

    expect(screen.getByText("Delete Person")).toBeTruthy();
    expect(screen.getByText("Sam is on no entry yet.")).toBeTruthy();
  });
});
