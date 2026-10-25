package com.devmood.pixymoodtracker.quickcheckin

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

/**
 * JS API for the Android check-in notification. JS sends the plan, starts
 * or stops the notification, and imports the inbox.
 */
class QuickCheckInModule : Module() {
  companion object {
    private var current: WeakReference<QuickCheckInModule>? = null

    /** Tells a running app that the inbox changed. No-op while the app is closed. */
    fun notifyInboxChanged() {
      current?.get()?.sendEvent("onInboxChanged", emptyMap<String, Any>())
    }
  }

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not ready" }

  override fun definition() = ModuleDefinition {
    Name("PixyQuickCheckIn")

    Events("onInboxChanged")

    OnCreate { current = WeakReference(this@QuickCheckInModule) }

    OnDestroy {
      if (current?.get() === this@QuickCheckInModule) current = null
    }

    Function("start") { plan: String ->
      QuickCheckInStore.setPlan(context, plan)
      QuickCheckInStore.setEnabled(context, true)
      QuickCheckInNotification.render(context)
    }

    Function("stop") {
      QuickCheckInStore.setEnabled(context, false)
      QuickCheckInNotification.cancel(context)
    }

    Function("readInbox") { QuickCheckInStore.readInbox(context) }

    Function("clearInbox") { imported: String -> QuickCheckInStore.clearInbox(context, imported) }
  }
}
