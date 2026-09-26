import { summarizeGradleFailure } from "../gradle-error";

describe("summarizeGradleFailure", () => {
  it("shows the task and the deepest cause of the first branch", () => {
    expect(
      summarizeGradleFailure([
        "Execution failed for task ':react-native-gesture-handler:compileReleaseKotlin'.",
        "> Could not resolve all files for configuration ':react-native-gesture-handler:detachedConfiguration8'.",
        "   > Failed to transform classes.jar to match attributes {artifactType=classpath-entry-snapshot}.",
        "      > Execution failed for BuildToolsApiClasspathEntrySnapshotTransform: react-native-reanimated/classes.jar.",
        "         > Metaspace",
        "   > Failed to transform classes.jar to match attributes {artifactType=classpath-entry-snapshot}.",
        "      > Execution failed for BuildToolsApiClasspathEntrySnapshotTransform: react-native-svg/classes.jar.",
        "         > Metaspace",
      ])
    ).toBe(
      "Execution failed for task ':react-native-gesture-handler:compileReleaseKotlin'. Cause: Metaspace"
    );
  });

  it("uses a single cause line", () => {
    expect(
      summarizeGradleFailure([
        "Execution failed for task ':app:compileReleaseKotlin'.",
        "> Compilation error. See log for more details",
      ])
    ).toBe(
      "Execution failed for task ':app:compileReleaseKotlin'. Cause: Compilation error. See log for more details"
    );
  });

  it("uses the first line when there is no cause", () => {
    expect(
      summarizeGradleFailure([
        "Could not determine the dependencies of task ':app:assembleRelease'.",
      ])
    ).toBe(
      "Could not determine the dependencies of task ':app:assembleRelease'."
    );
  });

  it("returns null for an empty block", () => {
    expect(summarizeGradleFailure(["", "  "])).toBeNull();
  });
});
