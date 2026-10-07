package expo.modules.liveactivity

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.util.Locale

internal object WorkoutNotification {
  private const val CHANNEL_ID = "workout_live"
  private const val NOTIFICATION_ID = 0x5717

  private val labels = mapOf("run" to "run", "walk" to "walk", "cycle" to "ride", "hike" to "hike")

  fun show(context: Context, attrs: AttributesRecord, state: StateRecord) {
    ensureChannel(context)

    val title =
      if (state.isPaused) "Paused · ${attrs.title}"
      else "Tracking your ${labels[attrs.activityType] ?: "workout"}"
    val body = listOf(
      formatElapsed(state.elapsedSec),
      formatDistance(state.distanceM),
      "${formatPace(state.paceSecPerKm)}/km",
    ).joinToString(" · ")

    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(body)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_WORKOUT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(launchIntent(context))

    // The chronometer ticks natively, so ~1 Hz JS updates are for distance
    // and pace only — never to animate the clock.
    if (!state.isPaused) {
      builder.setUsesChronometer(true).setWhen(state.timerStart.toLong()).setShowWhen(true)
    } else {
      builder.setUsesChronometer(false).setShowWhen(false)
    }

    if (state.isPaused) {
      builder.addAction(0, "Resume", actionIntent(context, "resume", 1))
    } else {
      builder.addAction(0, "Pause", actionIntent(context, "pause", 1))
    }
    builder.addAction(0, "End", actionIntent(context, "end", 2))

    try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS denied on Android 13+: tracking continues, the
      // foreground-service notification from expo-location still shows.
    }
  }

  fun cancel(context: Context) {
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Live workout", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Duration, distance and pace while a workout is running"
        setShowBadge(false)
      }
    )
  }

  private fun actionIntent(context: Context, action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, LiveActivityActionReceiver::class.java)
      .putExtra(LiveActivityActionReceiver.EXTRA_ACTION, action)
    return PendingIntent.getBroadcast(
      context, requestCode, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun launchIntent(context: Context): PendingIntent? {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(
      context, 0, intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  fun formatElapsed(seconds: Double): String {
    val s = seconds.toLong()
    return if (s >= 3600) String.format(Locale.US, "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
    else String.format(Locale.US, "%02d:%02d", s / 60, s % 60)
  }

  fun formatDistance(meters: Double): String =
    if (meters < 1000) "${meters.toInt()} m" else String.format(Locale.US, "%.2f km", meters / 1000)

  fun formatPace(secPerKm: Double?): String {
    if (secPerKm == null || secPerKm <= 0 || secPerKm >= 3600 || secPerKm.isNaN()) return "—"
    val total = Math.round(secPerKm)
    return String.format(Locale.US, "%d'%02d\"", total / 60, total % 60)
  }
}
