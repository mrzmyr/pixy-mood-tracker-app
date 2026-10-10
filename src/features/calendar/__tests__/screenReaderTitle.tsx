import { render } from "@testing-library/react-native";
import { CalendarScreenReaderTitle } from "../ScreenReaderTitle";

describe("CalendarScreenReaderTitle", () => {
  it("exposes the screen name as a heading to screen readers", async () => {
    const screen = await render(<CalendarScreenReaderTitle />);

    expect(screen.getByRole("header", { name: "Calendar" })).toBeTruthy();
  });
});
