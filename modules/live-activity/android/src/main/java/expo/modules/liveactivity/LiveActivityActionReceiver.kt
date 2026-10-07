package expo.modules.liveactivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Notification action → JS. If the JS runtime is gone (process restarted by
 * the foreground service), the action is parked in SharedPreferences and
 * picked up by `consumePendingAction()` on the next launch.
 */
class LiveActivityActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.getStringExtra(EXTRA_ACTION) ?: return
    val delivered = listener?.let {
      it(action)
      true
    } ?: false
    if (!delivered) {
      prefs(context).edit().putString(KEY_PENDING, action).apply()
    }
  }

  companion object {
    const val EXTRA_ACTION = "expo.modules.liveactivity.ACTION"
    private const val PREFS = "workout_live_activity"
    private const val KEY_PENDING = "pendingAction"

    @Volatile
    var listener: ((String) -> Unit)? = null

    private fun prefs(context: Context) =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun consumePending(context: Context): String? {
      val p = prefs(context)
      val action = p.getString(KEY_PENDING, null)
      if (action != null) p.edit().remove(KEY_PENDING).apply()
      return action
    }
  }
}
