package com.devmood.pixymoodtracker.quickcheckin

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

/** Draws the ongoing check-in notification from the stored plan and state. */
object QuickCheckInNotification {
  const val NOTIFICATION_ID = 4711
  private const val CHANNEL_ID = "quick-check-in"
  private val MOOD_IDS = intArrayOf(
    R.id.mood_0, R.id.mood_1, R.id.mood_2, R.id.mood_3, R.id.mood_4, R.id.mood_5, R.id.mood_6
  )
  private val CHIP_IDS = intArrayOf(R.id.chip_0, R.id.chip_1, R.id.chip_2, R.id.chip_3)

  fun cancel(context: Context) {
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }

  /** Posts or updates the notification. Does nothing without plan or permission. */
  fun render(context: Context) {
    if (!QuickCheckInStore.isEnabled(context)) return
    val plan = QuickCheckInStore.plan(context) ?: return
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    ensureChannel(context, plan)

    val state = QuickCheckInStore.state(context)
    val views = RemoteViews(context.packageName, R.layout.quick_check_in_notification)
    fill(context, views, plan, state)
    // Collapsed height is capped by the system, so it gets the tap row only.
    val smallViews = RemoteViews(context.packageName, R.layout.quick_check_in_notification_small)
    fill(context, smallViews, plan, state)

    val copy = plan.getJSONObject("copy")
    // Lock Screen: no names, only the question.
    val publicVersion = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setContentTitle(copy.getString("question"))
      .build()

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(context))
      .setStyle(NotificationCompat.DecoratedCustomViewStyle())
      .setCustomContentView(smallViews)
      .setCustomBigContentView(views)
      .setContentTitle(copy.getString("question"))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(false)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setPublicVersion(publicVersion)
      .setContentIntent(openApp(context, plan, ""))
      .build()
    try {
      manager.notify(NOTIFICATION_ID, notification)
    } catch (_: SecurityException) {
      // Permission revoked since the check above. The app asks again on toggle.
    }
  }

  private fun fill(context: Context, views: RemoteViews, plan: JSONObject, state: JSONObject) {
    val copy = plan.getJSONObject("copy")
    val step = state.getString("step")
    val rating = state.getString("rating")

    views.setTextViewText(R.id.more, copy.getString("more"))
    views.setOnClickPendingIntent(R.id.more, openApp(context, plan, state.getString("entryId")))
    views.setViewVisibility(R.id.moods, if (step == "mood") View.VISIBLE else View.GONE)
    views.setViewVisibility(R.id.chips, if (step == "mood") View.GONE else View.VISIBLE)
    for (id in CHIP_IDS) views.setViewVisibility(id, View.GONE)

    when (step) {
      "mood" -> {
        views.setTextViewText(R.id.title, copy.getString("question"))
        val moods = plan.getJSONArray("moods")
        for (i in MOOD_IDS.indices) {
          if (i >= moods.length()) {
            views.setViewVisibility(MOOD_IDS[i], View.GONE)
            continue
          }
          val mood = moods.getJSONObject(i)
          views.setInt(MOOD_IDS[i], "setColorFilter", Color.parseColor(mood.getString("color")))
          views.setContentDescription(MOOD_IDS[i], mood.getString("label"))
          views.setOnClickPendingIntent(MOOD_IDS[i], tap(context, mood.getString("target"), i))
        }
      }
      "emotion" -> {
        views.setTextViewText(R.id.title, copy.getString("emotionQuestion"))
        chips(context, views, QuickCheckInStore.frozenSlots(state, "emotionSlots"), JSONArray())
        action(context, views, copy.getString("skip"), "emotion_skip")
      }
      "influences" -> {
        views.setTextViewText(R.id.title, copy.getString("influenceQuestion"))
        chips(context, views, QuickCheckInStore.frozenSlots(state, "influenceSlots"), state.getJSONArray("picked"))
        action(context, views, copy.getString("done"), "finish")
      }
      else -> {
        views.setTextViewText(R.id.title, plan.getJSONObject("savedTitles").optString(rating, ""))
        action(context, views, copy.getString("again"), "restart")
      }
    }
  }

  private fun chips(context: Context, views: RemoteViews, slots: JSONArray?, picked: JSONArray) {
    if (slots == null) return
    val selected = HashSet<String>()
    for (i in 0 until picked.length()) selected.add("influence:" + picked.getString(i))
    for (i in 0 until minOf(slots.length(), CHIP_IDS.size - 1)) {
      val slot = slots.getJSONObject(i)
      val id = CHIP_IDS[i]
      val target = slot.getString("target")
      views.setViewVisibility(id, View.VISIBLE)
      views.setTextViewText(id, slot.getString("label"))
      views.setInt(
        id,
        "setBackgroundResource",
        if (selected.contains(target)) R.drawable.quick_check_in_chip_selected else R.drawable.quick_check_in_chip
      )
      views.setOnClickPendingIntent(id, tap(context, target, 10 + i))
    }
  }

  private fun action(context: Context, views: RemoteViews, label: String, target: String) {
    val id = CHIP_IDS[CHIP_IDS.size - 1]
    views.setViewVisibility(id, View.VISIBLE)
    views.setTextViewText(id, label)
    views.setInt(id, "setBackgroundResource", R.drawable.quick_check_in_chip)
    views.setOnClickPendingIntent(id, tap(context, target, 20))
  }

  // Request codes keep one PendingIntent per slot; the target extra changes per step.
  private fun tap(context: Context, target: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, QuickCheckInReceiver::class.java)
      .setAction(QuickCheckInReceiver.ACTION_TAP)
      .putExtra(QuickCheckInReceiver.EXTRA_TARGET, target)
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun openApp(context: Context, plan: JSONObject, entryId: String): PendingIntent {
    val url = plan.getString("moreUrl") + entryId.ifEmpty { "new" }
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(
      context,
      30,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun ensureChannel(context: Context, plan: JSONObject) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      plan.getJSONObject("copy").getString("channel"),
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      setShowBadge(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
    }
    context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

  private fun smallIcon(context: Context): Int {
    val icon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (icon != 0) icon else context.applicationInfo.icon
  }
}
