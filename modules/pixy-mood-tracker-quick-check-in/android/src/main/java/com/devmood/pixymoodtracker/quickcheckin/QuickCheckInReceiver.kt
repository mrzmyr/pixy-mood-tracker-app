package com.devmood.pixymoodtracker.quickcheckin

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Handles taps on the check-in notification, also while the app is closed. */
class QuickCheckInReceiver : BroadcastReceiver() {
  companion object {
    const val ACTION_TAP = "com.devmood.pixymoodtracker.quickcheckin.TAP"
    const val EXTRA_TARGET = "target"
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_TAP) return
    val target = intent.getStringExtra(EXTRA_TARGET) ?: return
    val changed = QuickCheckInStore.tap(context, target)
    QuickCheckInNotification.render(context)
    if (changed) {
      QuickCheckInModule.notifyInboxChanged()
    }
  }
}
