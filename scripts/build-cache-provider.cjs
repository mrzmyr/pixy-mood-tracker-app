// Local build cache shared by every checkout and git worktree of this repo.
// Follows the layout of `expo/local-build-cache-provider`, with two changes:
// - builds live in one directory outside the project, so worktrees reuse them
// - release builds embed the JS bundle, which the native fingerprint ignores,
//   so their key also covers the app source tree and `EXPO_PUBLIC_*` values
// Each build `<key>.app|.apk` has a `<key>.json` next to it with its source
// branch, commit, and last use, read by `bun builds`.
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DEFAULT_CACHE_DIR = path.join(
  os.homedir(),
  ".cache",
  "pixy-mood-tracker",
  "build-cache"
);

// Paths that never end up in the app bundle. Changing them keeps the cache.
// Metro only reaches files imported from App.tsx, so repo tooling, docs, and
// agent config are safe to skip. Never list anything `src` can import.
const NON_APP_PATHS = [
  ".agents",
  ".github",
  ".gplay",
  "docs",
  "e2e",
  "scripts",
  "tools",
  "crowdin.yml",
  "jest.setup.js",
  "oxfmt.config.ts",
  "oxlint.config.ts",
  ":(glob)**/*.md",
];

const resolveCacheDir = () =>
  process.env.PIXY_MOOD_TRACKER_BUILD_CACHE_DIR || DEFAULT_CACHE_DIR;

const getBuildVariant = (runOptions) =>
  runOptions.variant ?? runOptions.configuration ?? "unknown";

// iOS reports `unknown` when no configuration is passed, which means Debug.
// Debug builds load JS from Metro, so the native fingerprint is enough.
const isDebugVariant = (variant) =>
  ["debug", "unknown"].includes(variant.toLowerCase());

const git = (projectRoot, args, env = process.env) =>
  execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf-8",
    env,
  }).trim();

// Hashes the working tree, including uncommitted and untracked files, without
// touching the real index. Starts from a copy of it so unchanged files are not
// re-read.
const getSourceTreeHash = (projectRoot) => {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "pixy-mood-tracker-build-cache-")
  );
  const index = path.join(tmpDir, "index");
  const realIndex = path.resolve(
    projectRoot,
    git(projectRoot, ["rev-parse", "--git-path", "index"])
  );
  try {
    fs.copyFileSync(realIndex, index);
    const env = { ...process.env, GIT_INDEX_FILE: index };
    git(projectRoot, ["add", "-A", "--", "."], env);
    git(
      projectRoot,
      [
        "rm",
        "-r",
        "-q",
        "--cached",
        "--ignore-unmatch",
        "--",
        ...NON_APP_PATHS,
      ],
      env
    );
    return git(projectRoot, ["write-tree"], env);
  } finally {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
};

// Release bundles inline `EXPO_PUBLIC_*` values. Only a hash is kept so no
// value ever shows up in a file name.
const getPublicEnvHash = () =>
  crypto
    .createHash("sha1")
    .update(
      JSON.stringify(
        Object.entries(process.env)
          .filter(([name]) => name.startsWith("EXPO_PUBLIC_"))
          .toSorted(([a], [b]) => a.localeCompare(b))
      )
    )
    .digest("hex");

// Which source a build came from, captured at lookup like the bundle hash.
const sources = new Map();

const getSource = (projectRoot) => {
  if (!sources.has(projectRoot)) {
    const read = (args) => {
      try {
        return git(projectRoot, args);
      } catch {
        return "";
      }
    };
    sources.set(projectRoot, {
      branch: read(["branch", "--show-current"]),
      commit: read(["rev-parse", "HEAD"]),
      isDirty: read(["status", "--porcelain"]) !== "",
      worktree: projectRoot,
    });
  }
  return sources.get(projectRoot);
};

const bundleHashes = new Map();

// `target` is "device" for physical device builds from `bun app build`.
// Expo CLI caches only simulator and emulator builds and never passes it.
const getCacheKey = ({
  platform,
  fingerprintHash,
  runOptions,
  projectRoot,
  target,
}) => {
  getSource(projectRoot);
  const variant = getBuildVariant(runOptions);
  const prefix = target === "device" ? `${platform}-device` : platform;
  const key = `${prefix}-${fingerprintHash}-${variant}`;
  if (isDebugVariant(variant)) {
    return key;
  }
  // Expo CLI resolves the cache before bundling and uploads after the native
  // build. Reuse the hash from the lookup, so edits made while the build runs
  // cannot label this build with newer source.
  if (!bundleHashes.has(projectRoot)) {
    bundleHashes.set(
      projectRoot,
      crypto
        .createHash("sha1")
        .update(getSourceTreeHash(projectRoot))
        .update(getPublicEnvHash())
        .digest("hex")
        .slice(0, 12)
    );
  }
  return `${key}-${bundleHashes.get(projectRoot)}`;
};

const metaPath = (cacheDir, key) => path.join(cacheDir, `${key}.json`);

const readMeta = (cacheDir, key) => {
  try {
    return JSON.parse(fs.readFileSync(metaPath(cacheDir, key), "utf-8"));
  } catch {
    return {};
  }
};

// Written to a temp file first, so parallel readers never see half a file.
const writeMeta = (cacheDir, key, meta) => {
  const tmp = `${metaPath(cacheDir, key)}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(meta, null, 2)}\n`);
  fs.renameSync(tmp, metaPath(cacheDir, key));
};

const getSize = (target) => {
  const stats = fs.statSync(target);
  if (!stats.isDirectory()) {
    return stats.size;
  }
  return fs
    .readdirSync(target)
    .reduce((total, entry) => total + getSize(path.join(target, entry)), 0);
};

/**
 * Returns the cached build for the current fingerprint, or null.
 * @param {{ platform: string, fingerprintHash: string, runOptions: object, projectRoot: string }} props Build identity from Expo CLI.
 * @returns {Promise<string | null>} Path to the cached app, or null to build.
 */
const resolveBuildCache = async (props) => {
  const cacheDir = resolveCacheDir();
  const key = getCacheKey(props);
  const files = fs.existsSync(cacheDir)
    ? await fs.promises.readdir(cacheDir)
    : [];
  const file = files.find(
    (name) => path.parse(name).name === key && !name.endsWith(".json")
  );
  if (!file) {
    console.log(`› No cached build for ${key} in ${cacheDir}`);
    return null;
  }
  console.log(`› Using cached build ${path.join(cacheDir, file)}`);
  try {
    writeMeta(cacheDir, key, {
      ...readMeta(cacheDir, key),
      lastUsedAt: new Date().toISOString(),
    });
  } catch {
    // Last use only guides pruning; a failed write must not block the run.
  }
  return path.join(cacheDir, file);
};

/**
 * Copies a finished build into the shared cache. Parallel worktrees can
 * finish the same build at once, so each copy lands in a temp path first and
 * is moved into place atomically.
 * @param {{ platform: string, fingerprintHash: string, buildPath: string, runOptions: object, projectRoot: string, target?: string }} props Finished build from Expo CLI or `bun app build`.
 * @returns {Promise<string | null>} Path to the cached copy, or null on failure.
 */
const uploadBuildCache = async (props) => {
  const cacheDir = resolveCacheDir();
  const key = getCacheKey(props);
  const destPath = path.join(
    cacheDir,
    `${key}${path.extname(props.buildPath)}`
  );
  if (fs.existsSync(destPath)) {
    return destPath;
  }
  const tmpRoot = path.join(cacheDir, ".tmp");
  await fs.promises.mkdir(tmpRoot, { recursive: true });
  const tmpDir = await fs.promises.mkdtemp(path.join(tmpRoot, "upload-"));
  const tmpPath = path.join(tmpDir, path.basename(destPath));
  try {
    await fs.promises.cp(props.buildPath, tmpPath, { recursive: true });
    const sizeBytes = getSize(tmpPath);
    await fs.promises.rename(tmpPath, destPath);
    const now = new Date().toISOString();
    writeMeta(cacheDir, key, {
      appVariant: process.env.EXPO_PUBLIC_APP_VARIANT,
      createdAt: now,
      key,
      lastUsedAt: now,
      platform: props.platform,
      sizeBytes,
      target:
        props.target ?? (props.platform === "ios" ? "simulator" : "emulator"),
      variant: getBuildVariant(props.runOptions),
      ...getSource(props.projectRoot),
    });
    console.log(`› Saved build to cache ${destPath}`);
    return destPath;
  } catch (error) {
    // Losing the race to another worktree is fine: its copy is identical.
    if (fs.existsSync(destPath)) {
      return destPath;
    }
    console.warn(
      `› Could not save build to cache ${destPath}: ${error.message}`
    );
    return null;
  } finally {
    await fs.promises.rm(tmpDir, { force: true, recursive: true });
  }
};

module.exports = {
  getCacheKey,
  resolveBuildCache,
  resolveCacheDir,
  uploadBuildCache,
};
