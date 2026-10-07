package expo.modules.liveactivity

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class AttributesRecord : Record {
  @Field val workoutId: String = ""
  @Field val activityType: String = "run"
  @Field val title: String = "Workout"
}

class StateRecord : Record {
  @Field val timerStart: Double = 0.0
  @Field val elapsedSec: Double = 0.0
  @Field val distanceM: Double = 0.0
  @Field val paceSecPerKm: Double? = null
  @Field val heartRate: Double? = null
  @Field val isPaused: Boolean = false
}

/**
 * Android has no Live Activities; the closest analogue is an ongoing
 * notification with action buttons. Same JS interface as iOS — the asymmetry
 * lives entirely on this side of the bridge.
 */
class LiveActivityModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext) { "React context unavailable" }

  private var attributes: AttributesRecord? = null

  override fun definition() = ModuleDefinition {
    Name("LiveActivity")

    Events("onAction")

    OnCreate {
      LiveActivityActionReceiver.listener = { action ->
        sendEvent("onAction", mapOf("action" to action))
      }
    }

    OnDestroy {
      LiveActivityActionReceiver.listener = null
    }

    Function("isSupported") { true }

    AsyncFunction("start") { attrs: AttributesRecord, state: StateRecord ->
      attributes = attrs
      WorkoutNotification.show(context, attrs, state)
      attrs.workoutId
    }

    AsyncFunction("update") { state: StateRecord ->
      attributes?.let { WorkoutNotification.show(context, it, state) }
      Unit
    }

    AsyncFunction("end") { _: StateRecord?, _: Boolean ->
      attributes = null
      WorkoutNotification.cancel(context)
    }

    Function("consumePendingAction") {
      LiveActivityActionReceiver.consumePending(context)
    }

    Function("setWidgetData") { json: String ->
      WorkoutWidgetProvider.save(context, json)
    }
  }
}
