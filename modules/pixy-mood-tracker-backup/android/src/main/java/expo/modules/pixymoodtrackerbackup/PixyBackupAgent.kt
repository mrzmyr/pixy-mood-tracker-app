package expo.modules.pixymoodtrackerbackup

import android.app.backup.BackupAgent
import android.app.backup.BackupDataInput
import android.app.backup.BackupDataOutput
import android.app.backup.FullBackupDataOutput
import android.os.Build
import android.os.ParcelFileDescriptor

/**
 * Android Auto Backup agent for Pixy.
 *
 * Registered in the manifest by `plugins/withAndroidBackupRules.js` with
 * `android:fullBackupOnly="true"`, so Android runs Auto Backup through [onFullBackup].
 *
 * - Switch off: writes nothing, so the backup holds no Pixy data.
 * - Switch on: records the time of encrypted cloud backups, then lets the default implementation
 *   apply the rules in `res/xml/pixy_backup_rules.xml` and `pixy_data_extraction_rules.xml`.
 *
 * Runs in a restricted process without React Native. Touch only SharedPreferences here.
 */
class PixyBackupAgent : BackupAgent() {
  override fun onFullBackup(data: FullBackupDataOutput) {
    if (!BackupPreferences.isEnabled(this)) {
      return
    }
    if (isCloudBackupWithPixyData(data)) {
      BackupPreferences.setLastBackupAt(this, System.currentTimeMillis())
    }
    super.onFullBackup(data)
  }

  /**
   * True when this run uploads Pixy's database to the cloud. Device-to-device
   * transfers do not count. On Android 9 and newer the rules require
   * client-side encryption: without a screen lock the run includes no data,
   * so it must not count as a sync either.
   */
  private fun isCloudBackupWithPixyData(data: FullBackupDataOutput): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
      return true
    }
    val flags = data.transportFlags
    val isDeviceToDevice = (flags and FLAG_DEVICE_TO_DEVICE_TRANSFER) != 0
    val isEncrypted = (flags and FLAG_CLIENT_SIDE_ENCRYPTION_ENABLED) != 0
    return !isDeviceToDevice && isEncrypted
  }

  // Key-value backup is not used. Auto Backup calls onFullBackup instead.
  override fun onBackup(
    oldState: ParcelFileDescriptor?,
    data: BackupDataOutput?,
    newState: ParcelFileDescriptor?
  ) = Unit

  override fun onRestore(
    data: BackupDataInput?,
    appVersionCode: Int,
    newState: ParcelFileDescriptor?
  ) = Unit
}
