import AppIntents
import Foundation

/// Opens Pixy on the logger. Shortcuts, Siri, Spotlight, and the Action
/// Button list it under the app name.
///
/// The JavaScript side reads `pixyLogMoodRequestedAt` through the React Native
/// `Settings` API and opens the logger. Source:
/// `src/features/logger/useLogMoodShortcut.ts`.
struct LogMoodIntent: AppIntent {
  static var title: LocalizedStringResource = "Create Entry"
  static var description = IntentDescription("Open Pixy to create an entry.")
  static var openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    UserDefaults.standard.set(
      Date().timeIntervalSince1970 * 1000,
      forKey: "pixyLogMoodRequestedAt"
    )
    return .result()
  }
}

/// Registers the intent without user setup.
struct PixyAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: LogMoodIntent(),
      phrases: ["Create entry in \(.applicationName)"],
      shortTitle: "Create Entry",
      systemImageName: "face.smiling"
    )
  }
}
