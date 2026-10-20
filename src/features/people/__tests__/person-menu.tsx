import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Pressable, Text } from "react-native";
import { LogsProvider } from "@/features/logs";
import Alert from "@/lib/alert";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider } from "@/state/settings";
import { usePersonMenu } from "../hooks/use-person-menu";
import type { PersonMenuActionId } from "../hooks/use-person-menu";
import {
  PeopleProvider,
  STORAGE_KEY,
  usePeopleLoad,
  usePeopleState,
} from "../people-provider";
import type { Person } from "../people-provider";

const sam: Person = {
  id: "4b4b4b4b-0000-4000-8000-000000000001",
  name: "Sam",
  avatar: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

interface Callbacks {
  onEdit: () => void;
  onArchived: () => void;
  onDeleted: () => void;
}

/** The stored Sam with one button per menu row, like a tile's menu. */
const Tile = (callbacks: Callbacks) => {
  const load = usePeopleLoad();
  const { people } = usePeopleState();
  const runAction = usePersonMenu();
  const person = people.find((item) => item.id === sam.id);
  if (load.status !== "ready") {
    return null;
  }
  if (!person) {
    return <Text>No Sam</Text>;
  }
  const actionIds: PersonMenuActionId[] = ["edit", "archive", "delete"];
  return (
    <>
      <Text>{person.isArchived ? "Sam archived" : "Sam active"}</Text>
      {actionIds.map((actionId) => (
        <Pressable
          key={actionId}
          onPress={() => runAction(person, actionId, callbacks)}
        >
          <Text>{`pick ${actionId}`}</Text>
        </Pressable>
      ))}
    </>
  );
};

const renderTile = async ({
  onEdit = jest.fn(),
  onArchived = jest.fn(),
  onDeleted = jest.fn(),
}: Partial<Callbacks> = {}) => {
  await render(
    <SettingsProvider>
      <AnalyticsProvider>
        <LogsProvider>
          <PeopleProvider>
            <Tile
              onEdit={onEdit}
              onArchived={onArchived}
              onDeleted={onDeleted}
            />
          </PeopleProvider>
        </LogsProvider>
      </AnalyticsProvider>
    </SettingsProvider>
  );
  await screen.findByText("Sam active");
  return userEvent.setup();
};

describe("usePersonMenu", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ people: [sam] }));
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens the editor from Edit", async () => {
    const onEdit = jest.fn();
    const user = await renderTile({ onEdit });

    await user.press(screen.getByText("pick edit"));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("archives at once and reports it, unarchives without reporting", async () => {
    const onArchived = jest.fn();
    const user = await renderTile({ onArchived });

    await user.press(screen.getByText("pick archive"));
    await screen.findByText("Sam archived");
    expect(onArchived).toHaveBeenCalledTimes(1);

    await user.press(screen.getByText("pick archive"));
    await screen.findByText("Sam active");
    expect(onArchived).toHaveBeenCalledTimes(1);
  });

  it("deletes the person only after the confirmation", async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const onDeleted = jest.fn();
    const user = await renderTile({ onDeleted });

    await user.press(screen.getByText("pick delete"));

    expect(screen.getByText("Sam active")).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
    const buttons = jest.mocked(Alert.alert).mock.calls[0][2] ?? [];
    buttons.find((button) => button.style === "destructive")?.onPress?.();

    await waitFor(() => expect(screen.getByText("No Sam")).toBeTruthy());
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
