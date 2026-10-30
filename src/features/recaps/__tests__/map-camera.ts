import { fitCamera } from "../story/map-camera";

const frame = {
  width: 390,
  height: 844,
  top: 180,
  bottom: 320,
  left: 56,
  right: 56,
};

const inside = ({ x, y }: { x: number; y: number }) =>
  x >= frame.left - 0.5 &&
  x <= frame.width - frame.right + 0.5 &&
  y >= frame.top - 0.5 &&
  y <= frame.height - frame.bottom + 0.5;

describe("map camera", () => {
  test("keeps every place inside the frame", () => {
    const places = [
      { latitude: 53.57, longitude: 9.95 },
      { latitude: 53.55, longitude: 9.93 },
      { latitude: 53.54, longitude: 10 },
      { latitude: 53.59, longitude: 9.99 },
    ];
    const camera = fitCamera(places, frame, 14);

    expect(places.map((place) => inside(camera.project(place)))).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  test("keeps home and a far trip inside the frame", () => {
    const home = { latitude: 53.57, longitude: 9.95 };
    const trip = { latitude: 55.68, longitude: 12.57 };
    const camera = fitCamera([home, trip], frame, 9);

    expect(inside(camera.project(home))).toBe(true);
    expect(inside(camera.project(trip))).toBe(true);
  });

  test("puts a single place in the middle of the frame at the closest zoom", () => {
    const place = { latitude: 53.57, longitude: 9.95 };
    const camera = fitCamera([place], frame, 14);
    const point = camera.project(place);

    expect(camera.zoom).toBeCloseTo(14);
    expect(point.x).toBeCloseTo(frame.width / 2);
    expect(point.y).toBeCloseTo(
      frame.top + (frame.height - frame.top - frame.bottom) / 2
    );
  });
});
