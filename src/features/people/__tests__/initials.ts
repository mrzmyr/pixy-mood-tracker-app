import { getInitials } from "../initials";

describe("getInitials", () => {
  test("uses first and last word", () => {
    expect(getInitials("Maximilian Mustermann")).toBe("MM");
    expect(getInitials("Anna Maria Schmidt")).toBe("AS");
  });

  test("uses one character for one word", () => {
    expect(getInitials("Mom")).toBe("M");
  });

  test("ignores extra whitespace and upper-cases", () => {
    expect(getInitials("  lena   weber ")).toBe("LW");
  });

  test("keeps characters outside the basic multilingual plane whole", () => {
    expect(getInitials("𝒜lex")).toBe("𝒜");
  });

  test("returns empty string for blank names", () => {
    expect(getInitials("")).toBe("");
    expect(getInitials("   ")).toBe("");
  });
});
