// Builds and opens tools/devices-menu-bar, a macOS menu bar app for phone reservations.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CliError, note, tryRun } from "./shared.ts";

const NAME = "pixy-mood-tracker-devices";
const SOURCE = path.resolve(
  import.meta.dir,
  "../../tools/devices-menu-bar/main.swift"
);
const APP = path.join(
  os.homedir(),
  ".cache",
  "pixy-mood-tracker",
  "tools",
  `${NAME}.app`
);
const HASH_FILE = path.join(APP, "Contents", "source.sha256");

const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>${NAME}</string>
  <key>CFBundleIdentifier</key><string>com.devmood.${NAME}</string>
  <key>CFBundleName</key><string>${NAME}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
`;

const build = (hash: string) => {
  fs.rmSync(APP, { recursive: true, force: true });
  const binary = path.join(APP, "Contents", "MacOS", NAME);
  fs.mkdirSync(path.dirname(binary), { recursive: true });
  fs.writeFileSync(path.join(APP, "Contents", "Info.plist"), INFO_PLIST);
  note(`Building ${NAME}`);
  try {
    execFileSync(
      "xcrun",
      ["swiftc", "-O", "-parse-as-library", SOURCE, "-o", binary],
      { stdio: ["ignore", "ignore", "pipe"], timeout: 300_000 }
    );
  } catch (error) {
    fs.rmSync(APP, { recursive: true, force: true });
    throw new CliError({
      status: "menu_bar_build_failed",
      message: `Could not build ${NAME}`,
      why:
        error instanceof Error && "stderr" in error
          ? String(error.stderr).trim()
          : String(error),
      fix: "Install Xcode command line tools with `xcode-select --install`, then retry.",
    });
  }
  fs.writeFileSync(HASH_FILE, hash);
};

/** Build the app when its source changed, then (re)start it. */
export const openMenuBar = () => {
  const hash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(SOURCE))
    .digest("hex");
  const isCurrent =
    fs.existsSync(HASH_FILE) && fs.readFileSync(HASH_FILE, "utf-8") === hash;
  if (!isCurrent) {
    build(hash);
    // A running old build keeps its menu bar item. Replace it.
    tryRun("pkill", ["-x", NAME]);
  }
  execFileSync("open", [APP]);
  console.log(APP);
};
