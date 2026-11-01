package com.devmood.pixymoodtracker.quickcheckin

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

/**
 * Check-in state, plan, and inbox in SharedPreferences, so taps work while
 * the app is closed.
 *
 * - Plan: written by JS. Ranked slots per rating, labels, colors, copy.
 * - State: current step, same rules as `tapCheckIn` in
 *   src/features/quickcheckin/checkInState.ts. The mood tap copies that
 *   mood's slots into the state, so a new plan never reorders chips during
 *   a check-in.
 * - Inbox: one entry snapshot per check-in, keyed by id. JS imports and
 *   clears it. Later taps overwrite the same snapshot, never add a second.
 */
object QuickCheckInStore {
  private const val PREFS = "pixy_mood_tracker_quick_check_in"
  private const val KEY_PLAN = "plan"
  private const val KEY_STATE = "state"
  private const val KEY_INBOX = "inbox"
  private const val KEY_ENABLED = "enabled"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isEnabled(context: Context) = prefs(context).getBoolean(KEY_ENABLED, false)

  fun setEnabled(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
    if (!enabled) {
      prefs(context).edit().remove(KEY_STATE).apply()
    }
  }

  fun plan(context: Context): JSONObject? =
    prefs(context).getString(KEY_PLAN, null)?.let { runCatching { JSONObject(it) }.getOrNull() }

  fun setPlan(context: Context, plan: String) {
    prefs(context).edit().putString(KEY_PLAN, plan).apply()
  }

  fun state(context: Context): JSONObject =
    prefs(context).getString(KEY_STATE, null)?.let { runCatching { JSONObject(it) }.getOrNull() }
      ?: initialState()

  private fun initialState() = JSONObject()
    .put("step", "mood")
    .put("entryId", "")
    .put("createdAt", "")
    .put("rating", "")
    .put("emotion", "")
    .put("picked", JSONArray())
    .put("emotionSlots", JSONArray())
    .put("influenceSlots", JSONArray())

  @Synchronized
  fun readInbox(context: Context): String = prefs(context).getString(KEY_INBOX, "[]") ?: "[]"

  /** Removes imported snapshots. Snapshots changed since the read stay. */
  @Synchronized
  fun clearInbox(context: Context, imported: String) {
    val done = runCatching { JSONArray(imported) }.getOrNull() ?: return
    val doneById = HashMap<String, String>()
    for (i in 0 until done.length()) {
      val entry = done.getJSONObject(i)
      doneById[entry.getString("id")] = entry.toString()
    }
    val inbox = JSONArray(readInbox(context))
    val rest = JSONArray()
    for (i in 0 until inbox.length()) {
      val entry = inbox.getJSONObject(i)
      if (doneById[entry.getString("id")] != entry.toString()) {
        rest.put(entry)
      }
    }
    prefs(context).edit().putString(KEY_INBOX, rest.toString()).apply()
  }

  @Synchronized
  private fun upsertInbox(context: Context, state: JSONObject) {
    val id = state.getString("entryId")
    val people = JSONArray()
    val tags = JSONArray()
    val picked = state.getJSONArray("picked")
    for (i in 0 until picked.length()) {
      val (kind, itemId) = picked.getString(i).split(":", limit = 2)
      (if (kind == "person") people else tags).put(JSONObject().put("id", itemId))
    }
    val emotion = state.getString("emotion")
    val snapshot = JSONObject()
      .put("id", id)
      .put("createdAt", state.getString("createdAt"))
      .put("rating", state.getString("rating"))
      .put("emotions", if (emotion.isEmpty()) JSONArray() else JSONArray().put(emotion))
      .put("people", people)
      .put("tags", tags)
    val inbox = JSONArray(readInbox(context))
    val next = JSONArray()
    for (i in 0 until inbox.length()) {
      val entry = inbox.getJSONObject(i)
      if (entry.getString("id") != id) next.put(entry)
    }
    next.put(snapshot)
    prefs(context).edit().putString(KEY_INBOX, next.toString()).apply()
  }

  private fun slots(plan: JSONObject, rating: String, field: String): JSONArray =
    plan.optJSONObject("byRating")?.optJSONObject(rating)?.optJSONArray(field) ?: JSONArray()

  /** Slots frozen at the mood tap. */
  fun frozenSlots(state: JSONObject, field: String): JSONArray =
    state.optJSONArray(field) ?: JSONArray()

  private fun containsTarget(slots: JSONArray, target: String): Boolean {
    for (i in 0 until slots.length()) {
      if (slots.getJSONObject(i).getString("target") == target) return true
    }
    return false
  }

  /**
   * Applies one tap and returns true when the inbox changed. Unknown or stale
   * targets do nothing.
   */
  @Synchronized
  fun tap(context: Context, target: String): Boolean {
    val plan = plan(context) ?: return false
    val state = state(context)
    var changed = false
    when {
      target == "restart" -> {
        save(context, initialState())
        return false
      }
      state.getString("step") == "mood" && target.startsWith("mood:") -> {
        val rating = target.removePrefix("mood:")
        if (plan.optJSONObject("byRating")?.has(rating) != true) return false
        state.put("step", "emotion")
          .put("entryId", UUID.randomUUID().toString())
          .put("createdAt", Instant.now().toString())
          .put("rating", rating)
          .put("emotionSlots", slots(plan, rating, "emotions"))
          .put("influenceSlots", slots(plan, rating, "influences"))
        changed = true
      }
      state.getString("step") == "emotion" &&
        (target == "emotion_skip" || containsTarget(frozenSlots(state, "emotionSlots"), target)) -> {
        state.put("emotion", if (target == "emotion_skip") "" else target.removePrefix("emotion:"))
        val hasInfluences = frozenSlots(state, "influenceSlots").length() > 0
        state.put("step", if (hasInfluences) "influences" else "done")
        changed = true
      }
      state.getString("step") == "influences" && target == "finish" -> {
        state.put("step", "done")
      }
      state.getString("step") == "influences" &&
        containsTarget(frozenSlots(state, "influenceSlots"), target) -> {
        val key = target.removePrefix("influence:")
        val picked = state.getJSONArray("picked")
        val next = JSONArray()
        var removed = false
        for (i in 0 until picked.length()) {
          if (picked.getString(i) == key) removed = true else next.put(picked.getString(i))
        }
        if (!removed) next.put(key)
        state.put("picked", next)
        changed = true
      }
      else -> return false
    }
    save(context, state)
    if (changed) upsertInbox(context, state)
    return changed
  }

  private fun save(context: Context, state: JSONObject) {
    prefs(context).edit().putString(KEY_STATE, state.toString()).apply()
  }
}
