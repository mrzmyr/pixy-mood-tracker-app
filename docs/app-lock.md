# App lock guide

Pixy has no lock of its own. Settings > Face ID Lock explains the OS lock.

- Guide: [`screens/AppLockGuide`](../src/features/app-lock/screens/AppLockGuide), route `/app-lock`, shared [`Demo`](../src/components/Demo.tsx)
- iOS 18 and newer: 3 steps for Require Face ID ([Apple guide](https://support.apple.com/en-gb/guide/iphone/iph00f208d05/ios))
- Android 15 and newer: 1 step for Private space, with a [video](https://youtu.be/CFgxxEj3qdA)
- Older OS versions: Settings hides the entry ([`isAppLockGuideSupported.ts`](../src/features/app-lock/isAppLockGuideSupported.ts))
- No feature flag

## Screenshots

Path: `assets/images/app-lock/`

- Size: 600x820 JPEG, quality 82. Crop the top of the screenshot at full width
- `ios-step-{1,2,3}.jpg`: Home Screen, Pixy menu with Require Face ID, confirm sheet
- Take steps 2 and 3 on an iPhone with a passcode. The simulator has no passcode, so iOS never shows Require Face ID there
- Crop: full width, top 1648 px from y 560 of a 1206 px wide screenshot
- `android-private-space.jpg`: Settings > Security and privacy, Privacy section
