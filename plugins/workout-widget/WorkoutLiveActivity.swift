import ActivityKit
import SwiftUI
import WidgetKit

struct WorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WorkoutAttributes.self) { context in
      LockScreenView(attributes: context.attributes, state: context.state)
        .activityBackgroundTint(Color.black.opacity(0.85))
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label {
            Text(WorkoutShared.formatDistance(context.state.distanceM))
          } icon: {
            Image(systemName: WorkoutShared.glyph(for: context.attributes.activityType))
          }
          .font(.headline)
        }
        DynamicIslandExpandedRegion(.trailing) {
          ElapsedText(state: context.state)
            .font(.headline.monospacedDigit())
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack {
            Text("\(WorkoutShared.formatPace(context.state.paceSecPerKm))/km")
            Spacer()
            ActionButtons(isPaused: context.state.isPaused)
          }
        }
      } compactLeading: {
        Image(systemName: WorkoutShared.glyph(for: context.attributes.activityType))
          .foregroundStyle(context.state.isPaused ? .orange : .green)
      } compactTrailing: {
        ElapsedText(state: context.state)
          .monospacedDigit()
          .frame(maxWidth: 52)
      } minimal: {
        Image(systemName: WorkoutShared.glyph(for: context.attributes.activityType))
      }
    }
  }
}

/// Self-ticking while running (no JS updates needed for the clock); static when paused.
struct ElapsedText: View {
  let state: WorkoutAttributes.ContentState

  var body: some View {
    if state.isPaused {
      Text(WorkoutShared.formatElapsed(state.elapsedSec))
    } else {
      Text(timerInterval: state.timerStart...Date.distantFuture, countsDown: false)
    }
  }
}

struct LockScreenView: View {
  let attributes: WorkoutAttributes
  let state: WorkoutAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Image(systemName: WorkoutShared.glyph(for: attributes.activityType))
        Text(attributes.title).font(.headline)
        Spacer()
        if state.isPaused {
          Text("PAUSED").font(.caption.bold()).foregroundStyle(.orange)
        }
      }
      HStack(alignment: .firstTextBaseline) {
        ElapsedText(state: state)
          .font(.system(size: 34, weight: .bold).monospacedDigit())
        Spacer()
        Text(WorkoutShared.formatDistance(state.distanceM))
          .font(.system(size: 26, weight: .semibold).monospacedDigit())
      }
      HStack {
        Text("\(WorkoutShared.formatPace(state.paceSecPerKm))/km")
        Spacer()
        if let hr = state.heartRate {
          Text("\(Int(hr)) bpm")
        }
      }
      .font(.subheadline)
      .foregroundStyle(.secondary)
      ActionButtons(isPaused: state.isPaused)
    }
    .padding()
    .foregroundStyle(.white)
  }
}

struct ActionButtons: View {
  let isPaused: Bool

  var body: some View {
    if #available(iOS 17.0, *) {
      HStack(spacing: 12) {
        Button(intent: WorkoutActionIntent(action: isPaused ? "resume" : "pause")) {
          Label(isPaused ? "Resume" : "Pause", systemImage: isPaused ? "play.fill" : "pause.fill")
            .frame(maxWidth: .infinity)
        }
        .tint(isPaused ? .green : .orange)
        Button(intent: WorkoutActionIntent(action: "end")) {
          Label("End", systemImage: "stop.fill")
            .frame(maxWidth: .infinity)
        }
        .tint(.red)
      }
      .buttonStyle(.borderedProminent)
    } else {
      // iOS 16 Live Activities can't host interactive buttons; tapping the
      // activity opens the app instead.
      EmptyView()
    }
  }
}
