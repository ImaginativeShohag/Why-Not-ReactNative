package expo.modules.liveactivity

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Locale

/**
 * Home-screen widget: today's steps, distance and streak. A classic
 * RemoteViews AppWidgetProvider rather than Glance — Glance needs the Compose
 * compiler plugin applied to this library, which a local module can't rely on
 * in the generated Gradle setup. Data arrives from JS via SharedPreferences.
 */
class WorkoutWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val data = read(context)
    ids.forEach { manager.updateAppWidget(it, buildViews(context, data)) }
  }

  companion object {
    private const val PREFS = "workout_widget"
    private const val KEY = "data"

    fun save(context: Context, json: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, WorkoutWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val data = read(context)
      ids.forEach { manager.updateAppWidget(it, buildViews(context, data)) }
    }

    private fun read(context: Context): JSONObject {
      val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
      return try {
        if (raw != null) JSONObject(raw) else JSONObject()
      } catch (_: Exception) {
        JSONObject()
      }
    }

    private fun buildViews(context: Context, data: JSONObject): RemoteViews {
      val steps = data.optInt("steps", 0)
      val stepGoal = data.optInt("stepGoal", 8000).coerceAtLeast(1)
      val distance = data.optDouble("distanceM", 0.0)
      val streak = data.optInt("streakDays", 0)

      return RemoteViews(context.packageName, R.layout.workout_widget).apply {
        setTextViewText(R.id.widget_steps, String.format(Locale.US, "%,d", steps))
        setTextViewText(R.id.widget_distance, String.format(Locale.US, "%.2f km", distance / 1000))
        setTextViewText(R.id.widget_streak, "🔥 $streak day streak")
        setProgressBar(R.id.widget_progress, stepGoal, steps.coerceAtMost(stepGoal), false)
        context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
          setOnClickPendingIntent(
            R.id.widget_root,
            PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE)
          )
        }
      }
    }
  }
}
