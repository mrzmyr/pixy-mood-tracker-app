import { sortForColumns } from "../sort-for-columns";

describe("sortForColumns", () => {
  it("handles empty array", () => {
    expect(sortForColumns([], 2)).toEqual([]);
  });

  it("handles single column", () => {
    const input = ["A", "B", "C"];
    expect(sortForColumns(input, 1)).toEqual(["A", "B", "C"]);
  });

  it("rearranges for 2 columns with even count", () => {
    const input = ["A", "B", "C", "D", "E", "F"];
    // Expected layout when displayed:
    // A D
    // B E
    // C F
    // Reading column-by-column: A, B, C, D, E, F ✓
    expect(sortForColumns(input, 2)).toEqual(["A", "D", "B", "E", "C", "F"]);
  });

  it("rearranges for 2 columns with odd count", () => {
    const input = ["A", "B", "C", "D", "E"];
    // Expected layout when displayed:
    // A D
    // B E
    // C
    // Reading column-by-column: A, B, C, D, E ✓
    expect(sortForColumns(input, 2)).toEqual(["A", "D", "B", "E", "C"]);
  });

  it("rearranges for 3 columns", () => {
    const input = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    // Expected layout when displayed:
    // A D G
    // B E H
    // C F I
    // Reading column-by-column: A, B, C, D, E, F, G, H, I ✓
    expect(sortForColumns(input, 3)).toEqual([
      "A",
      "D",
      "G",
      "B",
      "E",
      "H",
      "C",
      "F",
      "I",
    ]);
  });

  it("handles German umlauts with locale-aware sorting", () => {
    // Assuming input is already sorted with localeCompare
    const input = ["Ängstlich", "Besorgt", "Deprimiert", "Einsam"];
    // Expected layout for 2 columns:
    // Ängstlich Deprimiert
    // Besorgt   Einsam
    expect(sortForColumns(input, 2)).toEqual([
      "Ängstlich",
      "Deprimiert",
      "Besorgt",
      "Einsam",
    ]);
  });

  it("preserves objects", () => {
    const input = [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
      { key: "c", label: "C" },
      { key: "d", label: "D" },
    ];
    const result = sortForColumns(input, 2);
    expect(result).toEqual([
      { key: "a", label: "A" },
      { key: "c", label: "C" },
      { key: "b", label: "B" },
      { key: "d", label: "D" },
    ]);
  });
});
