import { EMOTIONS } from "../config";

describe("EMOTIONS", () => {
  it("should have unique labels for each emotion", () => {
    const labels = EMOTIONS.map((emotion) => emotion.label);
    const uniqueLabels = new Set(labels);

    const duplicates: string[] = [];
    const seen = new Set<string>();

    for (const label of labels) {
      if (seen.has(label)) {
        duplicates.push(label);
      }
      seen.add(label);
    }

    if (duplicates.length > 0) {
      const duplicateDetails = duplicates.map((label) => {
        const emotionsWithLabel = EMOTIONS.filter((e) => e.label === label);
        return `  "${label}" used by: ${emotionsWithLabel.map((e) => e.key).join(", ")}`;
      });

      throw new Error(
        `Found ${duplicates.length} duplicate emotion label(s):\n${duplicateDetails.join("\n")}`
      );
    }

    expect(uniqueLabels.size).toBe(labels.length);
  });

  it("should have unique keys for each emotion", () => {
    const keys = EMOTIONS.map((emotion) => emotion.key);
    const uniqueKeys = new Set(keys);

    expect(uniqueKeys.size).toBe(keys.length);
  });
});
