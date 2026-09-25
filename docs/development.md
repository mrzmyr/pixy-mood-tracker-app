# Development

## Setup

```shell
$ git clone https://github.com/mrzmyr/pixy-mood-tracker.git
$ bun install
$ bun start      # Metro
$ bun ios        # or: bun android
```

## Checks

```shell
$ bun run check     # lint, format, type-check
$ bun run test:ci   # unit tests (Jest)
```

End-to-end tests: see [e2e/README.md](../e2e/README.md).

## Devices, sessions, and builds

`bun devices`, `bun sessions`, and `bun builds` manage simulators and phones, e2e runs, and the build cache. Their state is shared across all worktrees. Run `bun <cli> help` for commands. The code is in [`scripts/cli/`](../scripts/cli/).

## Build cache

Native builds take about 10 minutes. `bun ios`, `bun android`, and `bun sessions run --build` reuse a cached build when nothing relevant changed. The cache is in `~/.cache/pixy-mood-tracker/build-cache`, shared by every checkout and worktree. Override the location with `PIXY_MOOD_TRACKER_BUILD_CACHE_DIR`.

- **Debug builds** are reused while the native fingerprint (native modules, config plugins, `app.json`) is unchanged. They load JavaScript from Metro.
- **Release builds** embed the JavaScript bundle, so they are also keyed by the app source tree and the `EXPO_PUBLIC_*` values. Changes to `e2e/` and `*.md` files are ignored.
- **`package.json` scripts** are left out of the fingerprint by [`fingerprint.config.cjs`](../fingerprint.config.cjs).
- **Physical device builds** are never cached.

Use `bun builds check` to see whether a build will be reused, and `bun builds prune` to free disk space. The provider is [`scripts/build-cache-provider.cjs`](../scripts/build-cache-provider.cjs).

## Preview Support Pixy

Configured native builds use `EXPO_PUBLIC_SUPERWALL_IOS_API_KEY` and `EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY`. Development builds can show the support card without Superwall by setting `EXPO_PUBLIC_PIXY_SUPPORT_FAKE_MODE` to `available` or `failed`. Restart Expo after changing configuration. Production builds ignore fake mode.

## Building and releasing

See [releasing.md](releasing.md).
