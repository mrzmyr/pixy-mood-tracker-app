import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { INITIAL_STATE } from "@/constants/Settings";
import { AnalyticsProvider } from "@/state/analytics";
import { SettingsProvider, STORAGE_KEY, useSettings } from "@/state/settings";
import { useFlowTracking } from "../screens/Flow/useFlowTracking";

// jest.setup.js replaces posthog-react-native with one shared fake client.
const { capture: mockCapture } = getPostHogTestClient();

const SettingsLoaded = ({ children }) =>
  useSettings().settings.loaded ? children : null;

const wrapper = ({ children }) => (
  <SettingsProvider>
    <AnalyticsProvider options={{ enabled: true }}>
      <SettingsLoaded>{children}</SettingsLoaded>
    </AnalyticsProvider>
  </SettingsProvider>
);

const renderTracking = async () => {
  const hook = await renderHook(
    () =>
      useFlowTracking({
        id: "worry_check",
        surface: "calendar",
        session: "s1",
      }),
    { wrapper }
  );
  await waitFor(() => expect(hook.result.current).not.toBeNull());
  return hook;
};

const sent = (event: string) =>
  jest.mocked(mockCapture).mock.calls.filter(([name]) => name === event);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
  );
});

describe("useFlowTracking()", () => {
  test("system back during a step counts as abandoned at that step", async () => {
    const hook = await renderTracking();
    await act(() => {
      hook.result.current.started();
      hook.result.current.stepViewed(2);
    });

    await act(() => hook.unmount());

    expect(sent("interventions:flow_abandoned")).toEqual([
      [
        "interventions:flow_abandoned",
        expect.objectContaining({
          intervention_session_id: "s1",
          how: "close",
          last_step: 2,
        }),
      ],
    ]);
  });

  test("end early sends one abandoned event, also after unmount", async () => {
    const hook = await renderTracking();
    await act(() => hook.result.current.abandoned("end_early"));
    await act(() => hook.unmount());

    expect(sent("interventions:flow_abandoned")).toHaveLength(1);
    expect(sent("interventions:flow_abandoned")[0][1]).toMatchObject({
      how: "end_early",
      last_step: "intro",
    });
  });

  test("closing the end check without an answer counts as feedback skipped", async () => {
    const hook = await renderTracking();
    await act(() => {
      hook.result.current.started();
      hook.result.current.completed();
    });
    await act(() => hook.unmount());

    expect(sent("interventions:flow_abandoned")).toHaveLength(0);
    expect(sent("interventions:feedback_skipped")).toHaveLength(1);
  });

  test("an answer is sent once and suppresses the skip", async () => {
    const hook = await renderTracking();
    await act(() => {
      hook.result.current.completed();
      hook.result.current.feedback("better");
      hook.result.current.feedback("worse");
    });
    await act(() => hook.unmount());

    expect(sent("interventions:feedback_answered")).toEqual([
      [
        "interventions:feedback_answered",
        expect.objectContaining({ answer: "better" }),
      ],
    ]);
    expect(sent("interventions:feedback_skipped")).toHaveLength(0);
  });
});
