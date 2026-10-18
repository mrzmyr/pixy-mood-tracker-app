import { act, render } from "@testing-library/react-native";
import { DEFAULT_ACTION_IDENTIFIER } from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useNotificationTaps } from "../useNotificationTaps";
import type {
  NotificationResponseSource,
  NotificationTap,
} from "../useNotificationTaps";

const createResponse = (kind: string, date = 1): NotificationResponse => ({
  actionIdentifier: DEFAULT_ACTION_IDENTIFIER,
  notification: {
    date,
    request: {
      identifier: `${kind}-id`,
      content: {
        title: "Title",
        subtitle: null,
        body: "Body",
        data: { kind },
        categoryIdentifier: null,
        sound: null,
      },
      trigger: null,
    },
  },
});

const createSource = (launchResponse: NotificationResponse | null) => {
  let last = launchResponse;
  const listeners = new Set<(response: NotificationResponse) => void>();
  const source: NotificationResponseSource = {
    getLastResponse: () => last,
    clearLastResponse: () => {
      last = null;
    },
    addResponseListener: (listener) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  const tap = async (response: NotificationResponse) => {
    await act(() => {
      for (const listener of listeners) {
        listener(response);
      }
    });
  };
  return { source, tap };
};

const Taps = ({
  kind,
  isReady,
  onTaps,
  source,
}: {
  kind: string;
  isReady: boolean;
  onTaps: (taps: NotificationTap<string>[]) => void;
  source: NotificationResponseSource;
}) => {
  useNotificationTaps({
    select: (response) =>
      response.notification.request.content.data?.kind === kind ? kind : null,
    isReady,
    onTaps,
    source,
  });
  return null;
};

describe("useNotificationTaps()", () => {
  test("keeps the launch response for the hook that selects it", async () => {
    const { source } = createSource(createResponse("recap"));
    const onReminder = jest.fn();
    const onRecap = jest.fn();

    await render(
      <>
        <Taps kind="reminder" isReady onTaps={onReminder} source={source} />
        <Taps kind="recap" isReady onTaps={onRecap} source={source} />
      </>
    );

    expect(onReminder).not.toHaveBeenCalled();
    expect(onRecap).toHaveBeenCalledWith([
      expect.objectContaining({ value: "recap", coldStart: true }),
    ]);
    expect(source.getLastResponse()).toBeNull();
  });

  test("holds taps until ready, then hands them over once", async () => {
    const launch = createResponse("reminder");
    const { source, tap } = createSource(launch);
    const onTaps = jest.fn();
    const props = { kind: "reminder", onTaps, source };

    const screen = await render(<Taps {...props} isReady={false} />);
    // The listener can report the launch response again.
    await tap(launch);
    await tap(createResponse("reminder", 2));
    expect(onTaps).not.toHaveBeenCalled();

    await screen.rerender(<Taps {...props} isReady />);
    await tap(launch);

    expect(onTaps).toHaveBeenCalledTimes(1);
    expect(
      onTaps.mock.calls[0]?.[0].map(
        ({ coldStart }: NotificationTap<string>) => coldStart
      )
    ).toEqual([true, false]);
  });
});
