import { render, screen } from "@testing-library/react-native";
import Lock from "lucide-react-native/icons/lock";
import CircleCheck from "lucide-react-native/icons/circle-check";

import Icon from "@/components/Icon.ios";

// oxlint-disable-next-line anti-slop/no-module-mocking -- SymbolView is a native view with no Jest renderer; the stand-in keeps the props the native side reads.
jest.mock("expo-symbols", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    SymbolView: (props) => <View testID="symbol" {...props} />,
  };
});

describe("iOS Icon", () => {
  test("stays out of the accessibility tree without a label", async () => {
    await render(<Icon sf="lock" fallback={Lock} size={18} color="#000" />);

    expect(screen.queryByLabelText("lock")).toBeNull();
    expect(
      screen.getByTestId("symbol", { includeHiddenElements: true })
    ).toBeTruthy();
    expect(screen.queryByTestId("symbol")).toBeNull();
  });

  test("reaches the accessibility tree with a label", async () => {
    await render(
      <Icon
        sf="lock"
        fallback={Lock}
        size={18}
        color="#000"
        accessibilityLabel="Locked"
      />
    );

    expect(screen.getByLabelText("Locked")).toBeTruthy();
  });

  test("draws a filled symbol in two colors, not one tint", async () => {
    await render(
      <Icon
        sf="checkmark.circle.fill"
        fallback={CircleCheck}
        size={24}
        color="#fff"
        fill="#00f"
      />
    );

    const symbol = screen.getByTestId("symbol", {
      includeHiddenElements: true,
    });
    expect(symbol.props.type).toBe("palette");
    expect(symbol.props.colors).toEqual(["#fff", "#00f"]);
    expect(symbol.props.tintColor).toBeUndefined();
  });
});
