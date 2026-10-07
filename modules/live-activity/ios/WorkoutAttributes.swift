// Shared between the app (this module) and the widget extension.
// plugins/withWorkoutCapabilities.js copies this exact file into the
// extension target, so there is one source of truth for the attributes type:
// ActivityKit matches app and extension by type name + Codable shape, and a
// drift between two hand-maintained copies fails silently.
//
// Must not import ExpoModulesCore — the extension doesn't link it.

import ActivityKit
import Foundation
#if canImport(AppIntents)
import AppIntents
#endif

struct WorkoutAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    /// The instant the on-screen timer counts from. `Text(timerInterval:)`
    /// ticks locally, so JS doesn't need to push once per second.
    var timerStart: Date
    var elapsedSec: Double
    var distanceM: Double
    var paceSecPerKm: Double?
    var heartRate: Double?
    var isPaused: Bool
  }

  var workoutId: String
  var activityType: String
  var title: String
}

enum WorkoutShared {
  static let widgetDataKey = "workoutWidgetData"
  static let pendingActionKey = "workoutPendingAction"
  /// Darwin notifications cross process boundaries (extension → app) where
  /// NotificationCenter.default does not.
  static let darwinActionName = "org.imaginativeworld.whynotreactnative.workout.action"

  /// Written into both Info.plists by the config plugin so app and extension
  /// can never disagree about the group — the classic silent widget bug.
  static var appGroup: String? {
    Bundle.main.object(forInfoDictionaryKey: "WorkoutAppGroup") as? String
  }

  static var defaults: UserDefaults? {
    guard let group = appGroup else { return nil }
    return UserDefaults(suiteName: group)
  }

  static func deliver(action: String) {
    defaults?.set(action, forKey: pendingActionKey)
    let center = CFNotificationCenterGetDarwinNotifyCenter()
    CFNotificationCenterPostNotification(
      center, CFNotificationName(darwinActionName as CFString), nil, nil, true)
  }

  static func consumePendingAction() -> String? {
    guard let defaults, let action = defaults.string(forKey: pendingActionKey) else { return nil }
    defaults.removeObject(forKey: pendingActionKey)
    return action
  }

  static func glyph(for activityType: String) -> String {
    switch activityType {
    case "walk": return "figure.walk"
    case "cycle": return "figure.outdoor.cycle"
    case "hike": return "figure.hiking"
    default: return "figure.run"
    }
  }

  static func formatDistance(_ meters: Double) -> String {
    meters < 1000 ? "\(Int(meters)) m" : String(format: "%.2f km", meters / 1000)
  }

  static func formatPace(_ secPerKm: Double?) -> String {
    guard let pace = secPerKm, pace.isFinite, pace > 0, pace < 3600 else { return "—" }
    let total = Int(pace.rounded())
    return String(format: "%d'%02d\"", total / 60, total % 60)
  }

  static func formatElapsed(_ seconds: Double) -> String {
    let s = Int(seconds)
    return s >= 3600
      ? String(format: "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
      : String(format: "%02d:%02d", s / 60, s % 60)
  }
}

#if canImport(AppIntents)
/// Backs the Pause / Resume / End buttons on the lock screen and Dynamic
/// Island. A `LiveActivityIntent` runs `perform()` in the *app's* process,
/// which is already alive because it's tracking location in the background.
@available(iOS 17.0, *)
struct WorkoutActionIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Control workout"
  static let isDiscoverable = false

  @Parameter(title: "Action")
  var action: String

  init() {}

  init(action: String) {
    self.action = action
  }

  func perform() async throws -> some IntentResult {
    WorkoutShared.deliver(action: action)
    return .result()
  }
}
#endif
