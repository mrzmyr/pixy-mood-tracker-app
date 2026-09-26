// Gradle prints its failure summary as a header followed by an indented
// cause tree, ending at a blank line:
//
//   * What went wrong:
//   Execution failed for task ':app:compileReleaseKotlin'.
//   > Could not resolve all files for configuration ...
//      > Execution failed for ...
//         > Metaspace
//
// The header alone says nothing, so errors show the first line and the
// deepest cause of the first branch.
const GRADLE_FAILURE_HEADER = "* What went wrong:";

const indentOf = (line: string) => line.length - line.trimStart().length;

const causeText = (line: string) => line.trim().replace(/^> /u, "");

/** One-line summary of the lines between "* What went wrong:" and the blank line after it. */
const summarizeGradleFailure = (lines: string[]) => {
  const block = lines.filter((line) => line.trim() !== "");
  const [what, ...causes] = block;
  if (what === undefined) {
    return null;
  }
  const leaf = causes.find(
    (line, index) =>
      index === causes.length - 1 ||
      indentOf(causes[index + 1]) <= indentOf(line)
  );
  return leaf === undefined
    ? causeText(what)
    : `${causeText(what)} Cause: ${causeText(leaf)}`;
};

export { GRADLE_FAILURE_HEADER, summarizeGradleFailure };
