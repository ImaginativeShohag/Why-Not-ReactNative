import SwiftUI
import WidgetKit

// Entry point of the widget extension. WorkoutAttributes.swift is copied in
// from modules/live-activity/ios by plugins/withWorkoutCapabilities.js.
@main
struct WorkoutWidgetBundle: WidgetBundle {
  var body: some Widget {
    TodayWidget()
    WorkoutLiveActivity()
  }
}
