// Sitemap capture bundles only: metro.config.js adds this polyfill when
// EXPO_PUBLIC_SITEMAP_CAPTURE=1. It runs before every module, so module-level
// dates see it too. Metro does not transform polyfills: Hermes runs this file
// as written.
//
// Clock: starts at CAPTURE_START on every launch and then runs at real speed,
// so timers and debounces still work. `bun sitemap capture` fails a state
// that takes longer than its clock budget, so minute values stay fixed.
// Math.random: seeded, the same sequence on every launch.
/* oxlint-disable no-bitwise, unicorn/prefer-math-trunc, unicorn/numeric-separators-style -- mulberry32 needs 32-bit integer math; Hermes parses polyfills untransformed */
(function installCaptureClock(global) {
  "use strict";
  // 09:41 in Europe/Berlin (CET, UTC+1). Capture sets TZ=Europe/Berlin.
  const CAPTURE_START = Date.UTC(2026, 2, 18, 8, 41, 0);
  const RealDate = global.Date;
  const realNow = RealDate.now;
  const launchedAt = realNow();
  const now = function now() {
    return CAPTURE_START + (realNow() - launchedAt);
  };

  const CaptureDate = function CaptureDate(...args) {
    if (!(this instanceof CaptureDate)) {
      return new RealDate(now()).toString();
    }
    return Reflect.construct(
      RealDate,
      args.length === 0 ? [now()] : args,
      CaptureDate
    );
  };
  CaptureDate.prototype = RealDate.prototype;
  CaptureDate.now = now;
  CaptureDate.parse = RealDate.parse;
  CaptureDate.UTC = RealDate.UTC;
  global.Date = CaptureDate;

  // mulberry32, fixed seed.
  let seed = 0x5eed1234;
  Math.random = function random() {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
})(globalThis);
