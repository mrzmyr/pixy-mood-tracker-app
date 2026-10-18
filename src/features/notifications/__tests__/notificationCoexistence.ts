import type { NotificationRequest } from "expo-notifications";
import {
  defaultRecapScheduler,
  defaultReminderScheduler,
} from "../reminderScheduler";

// In-memory schedule, shared by the fake module below.
const mockScheduled: NotificationRequest[] = [];

// oxlint-disable-next-line anti-slop/no-module-mocking -- native notification module is unavailable in Jest; the fake keeps the schedule in memory.
jest.mock("expo-notifications", () => {
  let id = 0;
  return {
    __esModule: true,
    setNotificationHandler: jest.fn(),
    SchedulableTriggerInputTypes: { DATE: "date", DAILY: "daily" },
    getAllScheduledNotificationsAsync: () =>
      Promise.resolve([...mockScheduled]),
    cancelScheduledNotificationAsync: (identifier: string) => {
      const index = mockScheduled.findIndex(
        (request) => request.identifier === identifier
      );
      if (index !== -1) {
        mockScheduled.splice(index, 1);
      }
      return Promise.resolve();
    },
    scheduleNotificationAsync: ({
      content,
      trigger,
    }: Pick<NotificationRequest, "content" | "trigger">) => {
      id += 1;
      mockScheduled.push({ identifier: `n${id}`, content, trigger });
      return Promise.resolve(`n${id}`);
    },
  };
});

const types = () =>
  mockScheduled.map(({ content }) => content.data?.type ?? content.data?.kind);

const recap = (day: number) => ({
  at: new Date(2026, 9, day, 20),
  title: "Title",
  body: "Body",
  data: { kind: "week", date: `2026-10-${day}` },
});

describe("reminder and recap notifications", () => {
  beforeEach(() => {
    mockScheduled.length = 0;
  });

  test("reminder changes keep recap notifications", async () => {
    await defaultRecapScheduler.replace([recap(11), recap(18)]);
    await defaultReminderScheduler.replace([new Date(2026, 9, 8, 20)]);

    expect(types()).toEqual(["recap", "recap", "reminder"]);

    await defaultReminderScheduler.cancelAll();

    expect(types()).toEqual(["recap", "recap"]);
  });

  test("recap changes keep reminders", async () => {
    await defaultReminderScheduler.replace([
      new Date(2026, 9, 8, 20),
      new Date(2026, 9, 9, 20),
    ]);
    await defaultRecapScheduler.replace([recap(11)]);
    await defaultRecapScheduler.replace([recap(18)]);

    expect(types()).toEqual(["reminder", "reminder", "recap"]);
    expect(mockScheduled[2]?.content.data).toEqual({
      type: "recap",
      kind: "week",
      date: "2026-10-18",
    });

    await defaultRecapScheduler.cancelAll();

    expect(types()).toEqual(["reminder", "reminder"]);
  });

  test("reminder changes replace the repeating reminder of older versions", async () => {
    mockScheduled.push({
      identifier: "legacy",
      content: {
        title: "Title",
        subtitle: null,
        body: "Body",
        data: {},
        categoryIdentifier: null,
        sound: null,
        threadIdentifier: null,
      },
      // SAFETY: the fake module reads only `type`; the daily trigger shape of older versions.
      trigger: { type: "daily", hour: 20, minute: 0 } as never,
    });
    await defaultRecapScheduler.replace([recap(11)]);

    await defaultReminderScheduler.replace([new Date(2026, 9, 8, 20)]);

    expect(mockScheduled.map(({ identifier }) => identifier)).not.toContain(
      "legacy"
    );
    expect(types()).toEqual(["recap", "reminder"]);
  });

  test("overlapping changes run one at a time", async () => {
    await Promise.all([
      defaultReminderScheduler.replace([new Date(2026, 9, 8, 20)]),
      defaultRecapScheduler.replace([recap(11)]),
      defaultReminderScheduler.replace([new Date(2026, 9, 9, 20)]),
      defaultRecapScheduler.replace([recap(18)]),
    ]);

    expect([...types()].sort()).toEqual(["recap", "reminder"]);
  });
});
