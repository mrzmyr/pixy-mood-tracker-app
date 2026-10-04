import { buildPlan, PLAN_TIPS_MAX } from "../screens/OnboardingSurvey/plan";

describe("Survey plan", () => {
  test("skipped questions keep today's defaults", () => {
    expect(buildPlan({})).toEqual({
      reminderTime: null,
      steps: null,
      tags: [],
      tips: ["pixel_calendar"],
      isCaring: false,
    });
  });

  test("reminder slot becomes a daily reminder time", () => {
    expect(buildPlan({ reminder: "evening" }).reminderTime).toBe("20:00");
    expect(buildPlan({ reminder: "none" }).reminderTime).toBeNull();
  });

  test("check-in length decides the logger steps", () => {
    expect(buildPlan({ depth: "quick" }).steps).toEqual(["rating"]);
    expect(buildPlan({ depth: "minute" }).steps).toEqual([
      "rating",
      "tags",
      "emotions",
      "feedback",
    ]);
    expect(buildPlan({ depth: "write" }).steps).toEqual([
      "rating",
      "tags",
      "emotions",
      "message",
      "feedback",
    ]);
  });

  test("quick check-ins keep the steps the other answers need", () => {
    expect(
      buildPlan({
        depth: "quick",
        goals: ["understand"],
        influences: ["sleep"],
        experience: "journal",
      }).steps
    ).toEqual(["rating", "tags", "emotions", "message"]);
  });

  test("hard days get the caring line and the emotions tip first", () => {
    const plan = buildPlan({ goals: ["stress", "patterns"] });
    expect(plan.isCaring).toBe(true);
    expect(plan.tips[0]).toBe("emotions");
  });

  test("returning Pixy users learn about import first", () => {
    expect(buildPlan({ experience: "pixy", goals: ["therapy"] }).tips).toEqual([
      "import",
      "export",
    ]);
  });

  test("shows at most three tips", () => {
    const plan = buildPlan({
      experience: "pixy",
      goals: ["stress", "patterns", "therapy", "habit"],
      frequency: "several",
      depth: "write",
    });
    expect(plan.tips).toHaveLength(PLAN_TIPS_MAX);
  });
});
