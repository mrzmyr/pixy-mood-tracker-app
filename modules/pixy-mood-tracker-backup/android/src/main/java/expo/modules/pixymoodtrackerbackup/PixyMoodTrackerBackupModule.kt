package expo.modules.pixymoodtrackerbackup

import android.app.backup.BackupManager
import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Android side of Pixy's backup switch. See [PixyBackupAgent]. */
class PixyMoodTrackerBackupModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PixyMoodTrackerBackup")

    Function("setBackupEnabled") { enabled: Boolean ->
      if (BackupPreferences.isEnabled(context) != enabled) {
        BackupPreferences.setEnabled(context, enabled)
        // Ask Android to run a backup soon, so turning off empties the backup early.
        BackupManager.dataChanged(context.packageName)
      }
    }

    Function("getLastBackupAt") {
      BackupPreferences.getLastBackupAt(context)?.toDouble()
    }
  }
}
