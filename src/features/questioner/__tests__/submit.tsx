import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { usePostHog as getPostHogTestClient } from "posthog-react-native";
import { INITIAL_STATE } from "@/constants/settings";
import { LogsProvider } from "@/features/logs";
import { AnalyticsProvider } from "@/state/analytics";
import {
  SettingsProvider,
  STORAGE_KEY,
  useSettingsLoad,
} from "@/state/settings";
import { useQuestioner } from "../questioner";
import type { IQuestion } from "../questioner";

const QUESTION: IQuestion = {
  id: "q23",
  appVersion: ">= 1.60.0",
  type: "single",
  text: { en: "Question" },
  answers: [
    {
      id: 4,
      emoji: "❌",
      text: { en: "Answer" },
    },
  ],
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>
    <AnalyticsProvider options={{ enabled: true }}>
      <LogsProvider>{children}</LogsProvider>
    </AnalyticsProvider>
  </SettingsProvider>
);

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...INITIAL_STATE, analyticsEnabled: true })
  );
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
  });
  jest.clearAllMocks();
});

test("submit sends the questions-feed answer id", async () => {
  const hook = await renderHook(
    () => ({
      questioner: useQuestioner(),
      settingsLoad: useSettingsLoad(),
    }),
    { wrapper }
  );

  await waitFor(() => {
    expect(hook.result.current.settingsLoad.status).toBe("ready");
  });

  await act(() => {
    hook.result.current.questioner.submit(QUESTION, QUESTION.answers);
  });

  const capture = getPostHogTestClient()?.capture;
  expect(capture).toHaveBeenCalledWith(
    "feedback:question_answered",
    expect.objectContaining({
      question_id: "q23",
      answer_ids: [4],
    })
  );
  if (!capture) {
    return;
  }

  const properties = jest
    .mocked(capture)
    .mock.calls.find(([name]) => name === "feedback:question_answered")?.[1];
  expect(properties).not.toHaveProperty("answer_texts");
  expect(properties).not.toHaveProperty("question_text");
  expect(properties).not.toHaveProperty("question");
});
