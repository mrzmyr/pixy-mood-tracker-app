import { clampZoomOffset, getContainSize, getFocalOffset } from "../viewerZoom";

const view = { width: 400, height: 800 };

describe("viewer zoom", () => {
  test("portrait photo fills the view height, landscape the width", () => {
    expect(
      getContainSize({ view, photo: { width: 1000, height: 4000 } })
    ).toEqual({ width: 200, height: 800 });
    expect(
      getContainSize({ view, photo: { width: 4000, height: 2000 } })
    ).toEqual({ width: 400, height: 200 });
  });

  test("unknown photo size fills the view", () => {
    expect(getContainSize({ view })).toEqual(view);
    expect(getContainSize({ view, photo: { width: 0, height: 0 } })).toEqual(
      view
    );
  });

  test("zoomed photo pans until its edge meets the view edge", () => {
    const photo = { width: 400, height: 200 };
    // At 2x the photo is 800 x 400: 200 points to each side, none up or down.
    expect(
      clampZoomOffset({ offset: { x: 500, y: 300 }, zoom: 2, view, photo })
    ).toEqual({ x: 200, y: 0 });
    expect(
      clampZoomOffset({ offset: { x: -500, y: -300 }, zoom: 2, view, photo })
    ).toEqual({ x: -200, y: 0 });
    expect(
      clampZoomOffset({ offset: { x: 50, y: 0 }, zoom: 2, view, photo })
    ).toEqual({ x: 50, y: 0 });
  });

  test("photo at fit size stays centered", () => {
    expect(
      clampZoomOffset({ offset: { x: 80, y: -80 }, zoom: 1, view, photo: view })
    ).toEqual({ x: 0, y: 0 });
  });

  test("point under the fingers stays in place while zooming", () => {
    const focal = { x: 100, y: -50 };
    const startOffset = { x: 20, y: 10 };
    const offset = getFocalOffset({
      focal,
      startOffset,
      startZoom: 1.5,
      zoom: 3,
    });
    // Photo point under the focal, in photo coordinates at zoom 1.
    const before = {
      x: (focal.x - startOffset.x) / 1.5,
      y: (focal.y - startOffset.y) / 1.5,
    };
    const after = {
      x: (focal.x - offset.x) / 3,
      y: (focal.y - offset.y) / 3,
    };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});
