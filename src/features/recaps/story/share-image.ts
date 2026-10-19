import * as Sharing from "expo-sharing";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { createStructuredError } from "@/lib/errors";
import type { StructuredError } from "@/lib/errors";
import { reportError } from "@/lib/report-error";

/** view-shot returns a bare path; the share sheet wants a file URI. */
const toFileUri = (uri: string) =>
  uri.startsWith("file://") ? uri : `file://${uri}`;

const describeCause = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

const report = (error: StructuredError) => {
  console.error(error);
  reportError(error);
};

/**
 * Captures the share card and opens the share sheet. `onCaptured` runs once
 * the capture settles, `onShared` when the sheet finished without error.
 * Module level: a `try` inside a component stops React Compiler.
 */
export const shareStoryCard = async ({
  view,
  dialogTitle,
  onCaptured,
  onShared,
}: {
  view: View | null;
  dialogTitle: string;
  onCaptured: () => void;
  onShared: () => void;
}) => {
  if (!view) {
    onCaptured();
    report(
      createStructuredError({
        status: "recap_story_share_card_missing",
        message: "Recap story share card is not mounted",
        why: "No share card view when the capture started",
        fix: "Tap Share again",
      })
    );
    return;
  }
  let uri: string;
  try {
    uri = toFileUri(await captureRef(view));
  } catch (cause) {
    report(
      createStructuredError({
        status: "recap_story_capture_failed",
        message: "Recap story share card could not be captured",
        why: `react-native-view-shot failed: ${describeCause(cause)}`,
        fix: "Tap Share again. If it fails again, restart Pixy",
      })
    );
    return;
  } finally {
    onCaptured();
  }
  try {
    await Sharing.shareAsync(uri, { dialogTitle });
  } catch (cause) {
    report(
      createStructuredError({
        status: "recap_story_share_failed",
        message: "Recap story share sheet failed",
        why: `expo-sharing failed: ${describeCause(cause)}`,
        fix: "Tap Share again. If it fails again, restart Pixy",
      })
    );
    return;
  }
  onShared();
};
