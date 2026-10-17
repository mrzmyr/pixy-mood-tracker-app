import { Platform } from "react-native";
import type { HostInstance } from "react-native";
import { readMeasuredSize } from "../useMeasuredSize";

const fabricNode = ({
  rect,
  offset,
}: {
  rect: { width: number; height: number };
  offset: { width: number; height: number };
}) =>
  // SAFETY: readMeasuredSize only reads these three members.
  ({
    getBoundingClientRect: () => ({ x: 0, y: 0, ...rect }),
    offsetWidth: offset.width,
    offsetHeight: offset.height,
  }) as HostInstance;

describe("readMeasuredSize()", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it("reads the exact layout size of an untransformed view", () => {
    Platform.OS = "ios";
    const node = fabricNode({
      rect: { width: 343.5, height: 120.25 },
      offset: { width: 344, height: 120 },
    });

    expect(readMeasuredSize(node)).toEqual({ width: 343.5, height: 120.25 });
  });

  it("waits for onLayout while a transform scales the view", () => {
    Platform.OS = "ios";
    // Enter animation at 90% scale: the rect is smaller than the layout.
    const node = fabricNode({
      rect: { width: 309, height: 108 },
      offset: { width: 343, height: 120 },
    });

    expect(readMeasuredSize(node)).toBeNull();
  });

  it("reads offset sizes on web, like react-native-web onLayout", () => {
    Platform.OS = "web";
    const node = fabricNode({
      rect: { width: 309, height: 108 },
      offset: { width: 343, height: 120 },
    });

    expect(readMeasuredSize(node)).toEqual({ width: 343, height: 120 });
  });

  it("waits for onLayout when the ref has no DOM methods", () => {
    // SAFETY: the Jest test renderer gives refs like this one.
    const testRendererRef = {} as HostInstance;

    expect(readMeasuredSize(testRendererRef)).toBeNull();
    expect(readMeasuredSize(null)).toBeNull();
  });
});
