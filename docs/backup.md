# Backup

Pixy has no server. User data leaves the phone only through the OS backup or a manual export.

## What is backed up

- All data lives in AsyncStorage: one SQLite database `RKStorage` on Android, one folder `RCTAsyncLocalStorage_V1` on iOS ([`src/state/persisted/index.ts`](../src/state/persisted/index.ts))
- Nothing is encrypted at rest by Pixy. Encryption comes from the OS backup layer

## Switch

- Settings > Data > Backup has one switch: "iCloud Backup" on iOS, "Google Backup" on Android. Default on
- Stored as `settings.backupEnabled`. Device setting: not exported, kept on import
- [`src/shell/useBackupSetting.ts`](../src/shell/useBackupSetting.ts) applies it after settings load and on every change
- Native side: local Expo module [`modules/pixy-mood-tracker-backup`](../modules/pixy-mood-tracker-backup)
- Analytics: `settings:backup_toggled` with `enabled`

## iOS

- AsyncStorage excludes its folder from backup unless Info.plist `RCTAsyncStorageExcludeFromBackup` is `false`. Versions up to 1.88.0 never set the key, so their entries were never in any iPhone backup
- [`app.json`](../app.json) now sets the key to `false`. AsyncStorage applies it on every launch
- Switch off: the module sets `isExcludedFromBackup` on the folder. It must run after AsyncStorage loads on each launch, because AsyncStorage resets the flag from Info.plist
- No "Last sync": iOS never tells apps when it ran a backup
- Restore = restore the whole iPhone. No per-app restore, no sync
- Apple holds the iCloud Backup keys unless the user turns on Advanced Data Protection

## Android

- Auto Backup is on: `android.allowBackup: true` in [`app.json`](../app.json)
- Rules come from [`plugins/withAndroidBackupRules.js`](../plugins/withAndroidBackupRules.js). Prebuild writes `res/xml/pixy_backup_rules.xml` (Android 11 and lower) and `res/xml/pixy_data_extraction_rules.xml` (Android 12 and higher)
- Only the `database` domain is included. That is exactly AsyncStorage: no PostHog queue, no Sentry envelopes, no cache
- `requireFlags="clientSideEncryption"` and `disableIfNoEncryptionCapabilities="true"`: no cloud backup without a screen lock. Android 9 and newer derive the backup key from the screen lock; Google states it cannot read the data
- `PixyBackupAgent` (`android:backupAgent`, `android:fullBackupOnly="true"`) wraps Auto Backup:
  - Switch off: writes nothing, so new backups hold no Pixy data. This covers device-to-device transfer too
  - Switch on: records the time of each cloud backup ("Last sync"), then applies the rules above
- Agent state lives in SharedPreferences `pixy_mood_tracker_backup`. The `sharedpref` domain is not backed up
- Limit 25 MB per app. Ten years of daily entries with notes is about 2 MB
- Google deletes the backup after about 60 days of device inactivity

### Footgun

Move storage out of AsyncStorage (MMKV, expo-sqlite, files) and the rules must follow. Otherwise Auto Backup silently stops covering user data.

## Export files

- Exports are written to the cache folder, not the documents folder ([`src/features/datagate/exportFile.ts`](../src/features/datagate/exportFile.ts))
- iOS deletes the file when the share sheet closes. Android keeps it until the next export, because receiving apps may read it later
- Each export deletes leftover export files from the documents folder. Versions up to 1.88.0 never removed them

## Settings > Data > Backup

- Data screen row "Backup" opens [`src/features/settings/screens/Backup.tsx`](../src/features/settings/screens/Backup.tsx)
- Row title stays "Backup" with no value: later versions may offer more than one backup
- Backup page: switch with the iCloud SF Symbol on iOS, "Last sync" with a green check on Android, privacy bullets
- Copy: `backup_*` keys in [`assets/locales/en.json`](../assets/locales/en.json)

## Privacy notes

- Mood, emotions, and notes are health data (GDPR Article 9)
- Data in the user's own iCloud or Google account that Pixy cannot read is not collection by Pixy. Still disclose it in the privacy policy at pixy.day/privacy and check the App Store privacy label and Google Play Data safety form before release
- Account takeover = backup takeover. Pixy has no app lock, so the OS account is the only gate
- Uninstalling the app does not delete the OS backup. Users delete it in iCloud or Google backup settings
- Switch off does not delete existing backups. It only keeps Pixy out of new ones

## Verify on device

iOS: Settings > Apple Account > iCloud > Manage Account Storage > Backups > this iPhone. Pixy must appear in the app list with the switch on, and disappear after the next backup with the switch off.

Android (emulator or device with a Google account and screen lock):

```sh
adb shell bmgr enabled
adb shell bmgr backupnow com.devmood.pixymoodtracker
adb shell dumpsys backup | grep -A3 pixymoodtracker
```

After `backupnow`, Settings > Data > Backup shows "Last sync" with the time.

Restore check: uninstall, reinstall the same build, open Pixy. Entries must be present.

## Later tiers

- Tier 1: opt-in encrypted snapshot file in iCloud Drive / user-picked folder, restore on fresh install
- Tier 2: multi-device sync. Not planned until the paid perk list in [`vision.md`](../vision.md) is locked
