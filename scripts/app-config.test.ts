import { describe, expect, test } from "bun:test";
import appJson from "../app.json";

const findPlugin = (name: string) =>
  appJson.expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === name
  );

describe("app config", () => {
  // `microphonePermission: false` makes expo-image-picker block
  // RECORD_AUDIO in the Android manifest, which breaks voice input.
  test("image picker keeps the microphone for voice input", () => {
    expect(findPlugin("expo-speech-transcriber")).toBeDefined();
    expect(findPlugin("expo-image-picker")).toEqual([
      "expo-image-picker",
      expect.objectContaining({ microphonePermission: expect.any(String) }),
    ]);
  });
});
