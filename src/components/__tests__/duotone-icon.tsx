import Sad01Icon from "@hugeicons/core-free-icons/Sad01Icon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import { render } from "@testing-library/react-native";
import { DuotoneIcon } from "../duotone-icon";

describe("DuotoneIcon", () => {
  // Both icons start with a circle keyed "0". Reusing it kept the tag
  // circle's transform on the native side and drew the sad face off canvas.
  test("a new icon mounts a new Svg, so no shape props carry over", async () => {
    const screen = await render(
      <DuotoneIcon icon={Tag01Icon} stroke="#000" tint="#000" />
    );
    const before = screen.root;

    await screen.rerender(
      <DuotoneIcon icon={Sad01Icon} stroke="#000" tint="#000" />
    );

    expect(screen.root).not.toBe(before);
  });

  test("the same icon keeps its Svg", async () => {
    const screen = await render(
      <DuotoneIcon icon={Tag01Icon} stroke="#000" tint="#000" />
    );
    const before = screen.root;

    await screen.rerender(
      <DuotoneIcon icon={Tag01Icon} stroke="#111" tint="#111" />
    );

    expect(screen.root).toBe(before);
  });
});
