import { createImageGate } from "../story/image-gate";

describe("share image gate", () => {
  test("waits for the layout and every image, then calls once", () => {
    const ready = jest.fn();
    const gate = createImageGate(ready);
    gate.add();
    gate.add();
    gate.laidOut();
    gate.done();
    expect(ready).not.toHaveBeenCalled();
    gate.done();
    expect(ready).toHaveBeenCalledTimes(1);
    gate.laidOut();
    expect(ready).toHaveBeenCalledTimes(1);
  });

  test("starts on layout when the frame has no images", () => {
    const ready = jest.fn();
    createImageGate(ready).laidOut();
    expect(ready).toHaveBeenCalledTimes(1);
  });
});
