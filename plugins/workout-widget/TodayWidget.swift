import SwiftUI
import WidgetKit

struct TodayData: Codable {
  var steps: Int = 0
  var stepGoal: Int = 8000
  var distanceM: Double = 0
  var distanceGoalM: Double = 5000
  var streakDays: Int = 0
  var updatedAt: Double = 0
}

struct TodayEntry: TimelineEntry {
  let date: Date
  let data: TodayData
}

struct TodayProvider: TimelineProvider {
  func placeholder(in context: Context) -> TodayEntry {
    TodayEntry(date: .now, data: TodayData(steps: 6240, distanceM: 3420, streakDays: 4))
  }

  func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
    completion(TodayEntry(date: .now, data: load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
    // The app pushes fresh data with WidgetCenter.reloadAllTimelines(); this
    // 30-minute fallback just keeps "today" honest across midnight. WidgetKit
    // budgets refreshes, so asking for per-second updates would be ignored.
    let next = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
    completion(Timeline(entries: [TodayEntry(date: .now, data: load())], policy: .after(next)))
  }

  private func load() -> TodayData {
    guard
      let json = WorkoutShared.defaults?.string(forKey: WorkoutShared.widgetDataKey),
      let data = json.data(using: .utf8),
      let decoded = try? JSONDecoder().decode(TodayData.self, from: data)
    else { return TodayData() }
    // Yesterday's numbers are worse than zeros.
    let updated = Date(timeIntervalSince1970: decoded.updatedAt / 1000)
    return Calendar.current.isDateInToday(updated) ? decoded : TodayData(streakDays: decoded.streakDays)
  }
}

struct TodayWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: TodayEntry

  private var stepProgress: Double {
    min(1, Double(entry.data.steps) / Double(max(entry.data.stepGoal, 1)))
  }

  var body: some View {
    switch family {
    case .systemMedium:
      HStack(spacing: 16) {
        ring
        VStack(alignment: .leading, spacing: 6) {
          stat("Steps", "\(entry.data.steps)")
          stat("Distance", WorkoutShared.formatDistance(entry.data.distanceM))
          stat("Streak", "\(entry.data.streakDays) days")
        }
        Spacer()
      }
    default:
      VStack(alignment: .leading, spacing: 4) {
        Text("TODAY").font(.caption2.bold()).foregroundStyle(.secondary)
        Text("\(entry.data.steps)").font(.title.bold().monospacedDigit())
        ProgressView(value: stepProgress).tint(.green)
        Text(WorkoutShared.formatDistance(entry.data.distanceM)).font(.subheadline)
        Text("🔥 \(entry.data.streakDays)").font(.caption)
      }
    }
  }

  private var ring: some View {
    ZStack {
      Circle().stroke(Color.green.opacity(0.2), lineWidth: 10)
      Circle()
        .trim(from: 0, to: stepProgress)
        .stroke(Color.green, style: StrokeStyle(lineWidth: 10, lineCap: .round))
        .rotationEffect(.degrees(-90))
      Image(systemName: "figure.walk").font(.title2)
    }
    .frame(width: 80, height: 80)
  }

  private func stat(_ label: String, _ value: String) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(label.uppercased()).font(.caption2).foregroundStyle(.secondary)
      Text(value).font(.headline.monospacedDigit())
    }
  }
}

struct TodayWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TodayWidget", provider: TodayProvider()) { entry in
      if #available(iOS 17.0, *) {
        TodayWidgetView(entry: entry).containerBackground(.fill.tertiary, for: .widget)
      } else {
        TodayWidgetView(entry: entry).padding()
      }
    }
    .configurationDisplayName("Today")
    .description("Steps, distance and your streak.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
