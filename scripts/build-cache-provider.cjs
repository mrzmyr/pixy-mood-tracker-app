// Local build cache shared by every checkout and git worktree of this repo.
// Follows the layout of `expo/local-build-cache-provider`, with two changes:
// - builds live in one directory outside the project, so worktrees reuse them
// - release builds embed the JS bundle, which the native fingerprint ignores,
//   so their key also covers the app source tree and `EXPO_PUBLIC_*` values
const { execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DEFAULT_CACHE_DIR = path.join(
  os.homedir(),
  ".cache",
  "pixy",
  "build-cache"
);

// Paths that never end up in the app bundle. Changing them keeps the cache.
const NON_APP_PATHS = ["e2e", ":(glob)**/*.md"];

const resolveCacheDir = () =>
  process.env.PIXY_BUILD_CACHE_DIR || DEFAULT_CACHE_DIR;

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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pixy-build-cache-"));
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

const bundleHashes = new Map();

const getCacheKey = ({
  platform,
  fingerprintHash,
  runOptions,
  projectRoot,
}) => {
  const variant = getBuildVariant(runOptions);
  const key = `${platform}-${fingerprintHash}-${variant}`;
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
  const file = files.find((name) => path.parse(name).name === key);
  if (!file) {
    console.log(`› No cached build for ${key} in ${cacheDir}`);
    return null;
  }
  console.log(`› Using cached build ${path.join(cacheDir, file)}`);
  return path.join(cacheDir, file);
};

/**
 * Copies a finished build into the shared cache. Parallel worktrees can
 * finish the same build at once, so each copy lands in a temp path first and
 * is moved into place atomically.
 * @param {{ platform: string, fingerprintHash: string, buildPath: string, runOptions: object, projectRoot: string }} props Finished build from Expo CLI.
 * @returns {Promise<string | null>} Path to the cached copy, or null on failure.
 */
const uploadBuildCache = async (props) => {
  const cacheDir = resolveCacheDir();
  const destPath = path.join(
    cacheDir,
    `${getCacheKey(props)}${path.extname(props.buildPath)}`
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
    await fs.promises.rename(tmpPath, destPath);
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

module.exports = { resolveBuildCache, uploadBuildCache };
