import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { PhotoGrid } from "../components/PhotoGrid";

const renderGrid = () => {
  const renderCells = jest.fn((cellSize: number) => (
    <Text>{`cell ${cellSize}`}</Text>
  ));
  return {
    view: render(<PhotoGrid testID="grid">{renderCells}</PhotoGrid>),
    renderCells,
  };
};

describe("PhotoGrid", () => {
  test("renders cells only after its width is known", async () => {
    const { view, renderCells } = renderGrid();
    await view;

    expect(renderCells).not.toHaveBeenCalled();
  });

  test("three cells and two gaps fit one row", async () => {
    const { view } = renderGrid();
    await view;

    await fireEvent(screen.getByTestId("grid"), "layout", {
      nativeEvent: { layout: { width: 350, height: 350 } },
    });

    // (350 - 2 * 8) / 3 = 111.33, floored so the row never wraps early.
    expect(screen.getByText("cell 111")).toBeTruthy();
  });
});
