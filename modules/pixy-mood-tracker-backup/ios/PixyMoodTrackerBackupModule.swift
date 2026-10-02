import ExpoModulesCore

/// Thrown when iOS refuses to change the backup flag of the storage folder.
internal final class BackupFlagException: GenericException<String> {
  override var code: String {
    "backup_flag_failed"
  }

  override var reason: String {
    "Could not change iCloud backup for Pixy's data. Why: \(param). Fix: Restart Pixy and try again."
  }
}

/// iOS side of Pixy's backup switch.
///
/// AsyncStorage keeps all data in `Application Support/<bundle id>/RCTAsyncLocalStorage_V1`.
/// iOS backs that folder up to iCloud or a computer unless `isExcludedFromBackup` is set.
/// AsyncStorage resets the flag from the Info.plist key `RCTAsyncStorageExcludeFromBackup`
/// on every launch, so JavaScript applies the user's choice again after storage loads.
///
/// iOS never tells an app when it ran a backup, so `getLastBackupAt` is always `nil`.
public class PixyMoodTrackerBackupModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PixyMoodTrackerBackup")

    Function("setBackupEnabled") { (enabled: Bool) in
      try Self.setExcludedFromBackup(!enabled)
    }

    Function("getLastBackupAt") { () -> Double? in
      nil
    }
  }

  private static func storageDirectory() -> URL? {
    guard
      let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first,
      let bundleId = Bundle.main.bundleIdentifier
    else {
      return nil
    }
    return support
      .appendingPathComponent(bundleId, isDirectory: true)
      .appendingPathComponent("RCTAsyncLocalStorage_V1", isDirectory: true)
  }

  private static func setExcludedFromBackup(_ excluded: Bool) throws {
    guard var url = storageDirectory() else {
      throw BackupFlagException("Application Support folder not found")
    }
    // The folder does not exist before the first write. AsyncStorage creates it
    // on first use, and JavaScript calls this again on the next launch.
    guard FileManager.default.fileExists(atPath: url.path) else {
      return
    }
    var values = URLResourceValues()
    values.isExcludedFromBackup = excluded
    do {
      try url.setResourceValues(values)
    } catch {
      throw BackupFlagException(error.localizedDescription)
    }
  }
}
