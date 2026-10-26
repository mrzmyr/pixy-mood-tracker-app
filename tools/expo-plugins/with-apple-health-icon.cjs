// Expo config plugin, CommonJS: app.json loads plugins without TypeScript.
const { execFileSync, execSync } = require("node:child_process");
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

/** Asset catalog name. The app loads it with `{ uri: "AppleHealthIcon" }`. */
const IMAGE_NAME = "AppleHealthIcon";
/** Local copy, gitignored: Apple's artwork license forbids redistribution. */
const LOCAL_ICON = "assets/third-party/apple-health/AppleHealthIcon.png";
const DMG_URL =
  "https://devimages-cdn.apple.com/design/resources/download/Icon-Apple-Health.dmg";
const DMG_ICON = "Apple Health Icon/Icon - Apple Health.png";
/** 3x of the largest size the app shows (29 pt). */
const ICON_PIXELS = 87;

/** @param {string} why Cause, shown in the warning. */
const warn = (why) => {
  console.warn(
    [
      "[apple_health_icon_missing] Apple Health icon not added to the iOS app",
      `why: ${why}`,
      `fix: Download ${DMG_URL}, copy "${DMG_ICON}" to ${LOCAL_ICON}, then prebuild again`,
    ].join("\n")
  );
};

/**
 * Downloads Apple's Health icon into `LOCAL_ICON`. macOS only: the icon
 * ships in a disk image. Opening it accepts Apple's HealthKit artwork
 * license, which allows the icon only in the UI of iOS apps.
 */
/** @param {string} target Path for the downloaded PNG. */
const downloadIcon = (target) => {
  const dir = mkdtempSync(path.join(tmpdir(), "apple-health-icon-"));
  const dmg = path.join(dir, "icon.dmg");
  const mount = path.join(dir, "mount");
  try {
    execFileSync("curl", ["-fsSL", "-o", dmg, DMG_URL]);
    // The disk image asks to accept the license; `yes` answers it.
    execSync(
      `yes | hdiutil attach -readonly -nobrowse -noverify -mountpoint "${mount}" "${dmg}"`,
      { stdio: "ignore" }
    );
    try {
      mkdirSync(path.join(target, ".."), { recursive: true });
      copyFileSync(path.join(mount, DMG_ICON), target);
      // Only scales the icon; Apple's rules forbid any other change.
      execFileSync("sips", ["-Z", String(ICON_PIXELS), target], {
        stdio: "ignore",
      });
    } finally {
      execFileSync("hdiutil", ["detach", mount, "-quiet"]);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * Adds Apple's Health icon to the iOS asset catalog. The repository never
 * holds the icon: prebuild takes `LOCAL_ICON`, or downloads it from Apple on
 * macOS. Without the icon the build continues and the app shows no icon.
 */
/** @param {import("@expo/config").ExpoConfig} config App config. */
const withAppleHealthIcon = (config) =>
  withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const { projectRoot, platformProjectRoot, projectName } =
        modConfig.modRequest;
      const icon = path.join(projectRoot, LOCAL_ICON);
      if (!existsSync(icon)) {
        if (process.platform !== "darwin") {
          warn("The icon ships in a macOS disk image; this host is not macOS");
          return modConfig;
        }
        try {
          downloadIcon(icon);
        } catch (error) {
          warn(error instanceof Error ? error.message : String(error));
          return modConfig;
        }
      }
      const imageset = path.join(
        platformProjectRoot,
        projectName ?? "",
        "Images.xcassets",
        `${IMAGE_NAME}.imageset`
      );
      mkdirSync(imageset, { recursive: true });
      copyFileSync(icon, path.join(imageset, `${IMAGE_NAME}.png`));
      writeFileSync(
        path.join(imageset, "Contents.json"),
        `${JSON.stringify(
          {
            images: [
              {
                idiom: "universal",
                filename: `${IMAGE_NAME}.png`,
                scale: "3x",
              },
            ],
            info: { author: "xcode", version: 1 },
          },
          null,
          2
        )}\n`
      );
      return modConfig;
    },
  ]);

module.exports = withAppleHealthIcon;
