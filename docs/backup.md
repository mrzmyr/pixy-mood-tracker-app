# Backup

Pixy has no server. User data leaves the phone only through the OS backup or a manual export.

## What is backed up

- All data lives in AsyncStorage: one SQLite database `RKStorage`, three keys ([`src/state/persisted/index.ts`](../src/state/persisted/index.ts))
- Nothing is encrypted at rest by Pixy. Encryption comes from the OS backup layer

## iOS

- iOS copies the app sandbox into iCloud Backup and computer backups by default. Pixy does not opt out
- Restore = restore the whole iPhone. No per-app restore, no sync
- Apple holds the iCloud Backup keys unless the user turns on Advanced Data Protection
- Users can turn Pixy off per device in iCloud backup settings

## Android

- Auto Backup is on: `android.allowBackup: true` in [`app.json`](../app.json)
- Rules come from [`plugins/withAndroidBackupRules.js`](../plugins/withAndroidBackupRules.js). Prebuild writes `res/xml/pixy_backup_rules.xml` (Android 11 and lower) and `res/xml/pixy_data_extraction_rules.xml` (Android 12 and higher)
- Only the `database` domain is included. That is exactly AsyncStorage: no PostHog queue, no Sentry envelopes, no cache
- `requireFlags="clientSideEncryption"` and `disableIfNoEncryptionCapabilities="true"`: no cloud backup without a screen lock. Android 9 and newer derive the backup key from the screen lock; Google states it cannot read the data
- Device-to-device transfer (new phone setup via cable or Wi-Fi) always includes the database
- Limit 25 MB per app. Ten years of daily entries with notes is about 2 MB
- Google deletes the backup after about 60 days of device inactivity

### Footgun

Move storage out of AsyncStorage (MMKV, expo-sqlite, files) and the rules must follow. Otherwise Auto Backup silently stops covering user data.

## Export files

- Exports are written to the cache folder, not the documents folder ([`src/features/datagate/exportFile.ts`](../src/features/datagate/exportFile.ts))
- iOS deletes the file when the share sheet closes. Android keeps it until the next export, because receiving apps may read it later
- Each export deletes leftover export files from the documents folder. Versions up to 1.88.0 never removed them

## Settings > Data > Backup

Data screen shows one status row ("Part of your iPhone backup" / "Part of your Android backup"). It opens [`src/features/settings/screens/Backup.tsx`](../src/features/settings/screens/Backup.tsx), which explains the platform backup and who can read it. Copy lives in `backup_content_ios` and `backup_content_android` in [`assets/locales/en.json`](../assets/locales/en.json).

## Privacy notes

- Mood, emotions, and notes are health data (GDPR Article 9)
- Data in the user's own iCloud or Google account that Pixy cannot read is not collection by Pixy. Still disclose it in the privacy policy at pixy.day/privacy and check the App Store privacy label and Google Play Data safety form before release
- Account takeover = backup takeover. Pixy has no app lock, so the OS account is the only gate
- Uninstalling the app does not delete the OS backup. Users delete it in iCloud or Google backup settings

## Verify on device

iOS: Settings > Apple Account > iCloud > Manage Account Storage > Backups > this iPhone. Pixy must appear in the app list.

Android (emulator or device with a Google account and screen lock):

```sh
adb shell bmgr enabled
adb shell bmgr backupnow com.devmood.pixymoodtracker
adb shell dumpsys backup | grep -A3 pixymoodtracker
```

Restore check: uninstall, reinstall the same build, open Pixy. Entries must be present.

## Later tiers

- Tier 1: opt-in encrypted snapshot file in iCloud Drive / user-picked folder, restore on fresh install
- Tier 2: multi-device sync. Not planned until the paid perk list in [`vision.md`](../vision.md) is locked
