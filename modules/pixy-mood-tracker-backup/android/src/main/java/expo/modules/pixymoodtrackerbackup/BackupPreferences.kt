package expo.modules.pixymoodtrackerbackup

import android.content.Context
import android.content.SharedPreferences

/**
 * Backup switch and last backup time, shared by the module and [PixyBackupAgent].
 *
 * SharedPreferences, not AsyncStorage: the backup agent runs without React Native.
 * The `sharedpref` domain is outside Pixy's backup rules, so these values stay on the device.
 */
internal object BackupPreferences {
  private const val FILE = "pixy_mood_tracker_backup"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_LAST_BACKUP_AT = "last_backup_at"

  private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

  fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, true)

  fun setEnabled(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
  }

  fun getLastBackupAt(context: Context): Long? {
    val value = prefs(context).getLong(KEY_LAST_BACKUP_AT, 0L)
    return if (value > 0L) value else null
  }

  fun setLastBackupAt(context: Context, time: Long) {
    prefs(context).edit().putLong(KEY_LAST_BACKUP_AT, time).commit()
  }
}
