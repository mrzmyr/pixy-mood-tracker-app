import { describe, expect, test } from "bun:test";
import { listsPackage } from "../adb.ts";

describe("listsPackage", () => {
  test("finds exact package", () => {
    expect(
      listsPackage(
        "package:com.devmood.pixymoodtracker.preview\n",
        "com.devmood.pixymoodtracker.preview"
      )
    ).toBe(true);
  });
  test("ignores packages that only contain the ID", () => {
    expect(
      listsPackage(
        "package:com.devmood.pixymoodtracker.preview\npackage:com.devmood.pixymoodtracker.dev\n",
        "com.devmood.pixymoodtracker"
      )
    ).toBe(false);
  });
  test("reports missing package on empty output", () => {
    expect(listsPackage("", "com.devmood.pixymoodtracker.preview")).toBe(false);
  });
  test("accepts CRLF output from older adb", () => {
    expect(
      listsPackage(
        "package:com.devmood.pixymoodtracker.preview\r\n",
        "com.devmood.pixymoodtracker.preview"
      )
    ).toBe(true);
  });
});
