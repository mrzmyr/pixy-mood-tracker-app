# Calendar scrolling benchmark

Use release builds on the same emulator, with the same display size, font scale, locale, and empty app data. Keep the host idle. Emulator frame times are comparative diagnostics, not device FPS guarantees.

Verify the installed APK application ID matches the flow `appId` and the package used for `dumpsys`. A previously generated development native project can still build `com.devmood.pixymoodtracker.dev` in release mode. For that build, run copies of the flows targeting `.dev`, and measure `.dev`. Confirm the installed package update time before comparing builds.

1. Create/boot a dedicated device with `bun devices`.
2. Run `bun sessions run <device> e2e/flows/01-onboarding.yaml --build` to install the current release build and complete onboarding.
3. Confirm the calendar starts at today. Wait for optional footer content to finish loading.
4. Capture initial native view count and PSS with `adb -s <device> shell dumpsys meminfo com.devmood.pixymoodtracker`.
5. Reset frame statistics with `adb -s <device> shell dumpsys gfxinfo com.devmood.pixymoodtracker reset`.
6. Run `bun sessions run <device> e2e/performance/calendar.yaml` without recording. This performs 60 identical upward-history gestures and leaves the calendar in history.
7. Capture `dumpsys meminfo` and `dumpsys gfxinfo` again. Compare view growth, PSS, frame percentiles, and janky-frame percentage against the baseline build. Repeat the flow to check that mounted views stay bounded with deeper history.
8. Run `bun sessions run <device> e2e/performance/calendar-stability.yaml --record` separately. It relaunches at today, performs 24 slow history gestures across prepend boundaries, and checks return to today. Inspect the recording for blank cells or position jumps. Then run `bun sessions run <device> e2e/flows/03-calendar.yaml --record` for historic entry creation and filters. Recording adds overhead, so exclude these runs from timing comparisons.
9. Shut down the device with `bun devices shutdown <device>`.

If UIAutomator2 cannot settle during animated onboarding, the runner supports `MAESTRO_DRIVER=devicelab MAESTRO_WAIT_FOR_IDLE_TIMEOUT=0` before `bun sessions run`. Use the same driver/settings for both builds.

Keep reports, screenshots, and recordings in the session report directory, outside Git. Record the build IDs and host conditions alongside results.
