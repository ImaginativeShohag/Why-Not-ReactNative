import ActivityKit
import ExpoModulesCore
import WidgetKit

struct AttributesRecord: Record {
  @Field var workoutId: String = ""
  @Field var activityType: String = "run"
  @Field var title: String = "Workout"
}

struct StateRecord: Record {
  @Field var timerStart: Double = 0
  @Field var elapsedSec: Double = 0
  @Field var distanceM: Double = 0
  @Field var paceSecPerKm: Double? = nil
  @Field var heartRate: Double? = nil
  @Field var isPaused: Bool = false

  var contentState: WorkoutAttributes.ContentState {
    WorkoutAttributes.ContentState(
      timerStart: Date(timeIntervalSince1970: timerStart / 1000),
      elapsedSec: elapsedSec,
      distanceM: distanceM,
      paceSecPerKm: paceSecPerKm,
      heartRate: heartRate,
      isPaused: isPaused
    )
  }
}

public final class LiveActivityModule: Module {
  private var observing = false

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    Events("onAction")

    OnCreate { [weak self] in
      self?.startObservingActions()
    }

    OnDestroy { [weak self] in
      self?.stopObservingActions()
    }

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("start") { (attributes: AttributesRecord, state: StateRecord) async throws -> String? in
      guard #available(iOS 16.2, *) else { return nil }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

      // A previous run killed mid-workout can leave an orphan on the lock screen.
      for stale in Activity<WorkoutAttributes>.activities {
        await stale.end(nil, dismissalPolicy: .immediate)
      }

      let activity = try Activity<WorkoutAttributes>.request(
        attributes: WorkoutAttributes(
          workoutId: attributes.workoutId,
          activityType: attributes.activityType,
          title: attributes.title
        ),
        content: ActivityContent(state: state.contentState, staleDate: nil),
        pushType: nil
      )
      return activity.id
    }

    AsyncFunction("update") { (state: StateRecord) async in
      guard #available(iOS 16.2, *) else { return }
      // staleDate lets the system grey the activity out if the pipeline dies
      // instead of showing a frozen "live" distance forever.
      let content = ActivityContent(
        state: state.contentState, staleDate: Date().addingTimeInterval(10 * 60))
      for activity in Activity<WorkoutAttributes>.activities {
        await activity.update(content)
      }
    }

    AsyncFunction("end") { (state: StateRecord?, dismissImmediately: Bool) async in
      guard #available(iOS 16.2, *) else { return }
      let content = state.map { ActivityContent(state: $0.contentState, staleDate: nil) }
      for activity in Activity<WorkoutAttributes>.activities {
        await activity.end(content, dismissalPolicy: dismissImmediately ? .immediate : .default)
      }
    }

    Function("consumePendingAction") { () -> String? in
      WorkoutShared.consumePendingAction()
    }

    Function("setWidgetData") { (json: String) in
      WorkoutShared.defaults?.set(json, forKey: WorkoutShared.widgetDataKey)
      // Only asks WidgetKit to reload; the system still budgets how often
      // timelines actually refresh (roughly 40–70 times a day).
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  // MARK: - Darwin notification bridge (intent → module → JS)

  private func startObservingActions() {
    guard !observing else { return }
    observing = true
    let center = CFNotificationCenterGetDarwinNotifyCenter()
    let observer = Unmanaged.passUnretained(self).toOpaque()
    CFNotificationCenterAddObserver(
      center,
      observer,
      { _, observer, _, _, _ in
        guard let observer else { return }
        let module = Unmanaged<LiveActivityModule>.fromOpaque(observer).takeUnretainedValue()
        DispatchQueue.main.async { [weak module] in module?.flushPendingAction() }
      },
      WorkoutShared.darwinActionName as CFString,
      nil,
      .deliverImmediately
    )
  }

  private func stopObservingActions() {
    guard observing else { return }
    observing = false
    CFNotificationCenterRemoveEveryObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque()
    )
  }

  private func flushPendingAction() {
    guard let action = WorkoutShared.consumePendingAction() else { return }
    sendEvent("onAction", ["action": action])
  }
}
