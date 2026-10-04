// Menu bar app for phone reservations. Build and open: `bun devices menubar`.
// Reads files that scripts/cli/reservation.ts writes. Keep field names in sync.
import SwiftUI

private let cacheDir = FileManager.default.homeDirectoryForCurrentUser
  .appendingPathComponent(".cache/pixy-mood-tracker")

struct PhoneInfo: Decodable {
  let id: String
  let target: String
  let name: String
  let type: String?
}

struct Reservation: Decodable {
  let id: String
  let target: String
  let name: String?
  let type: String?
  let holder: String
  let goal: String?
  let expiresAt: String
}

struct Row: Identifiable {
  let id: String
  let name: String
  let type: String
  let reservation: Reservation?
  let expiresAt: Date?
}

private let isoDate: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

private func decode<T: Decodable>(_ type: T.Type, at url: URL) -> T? {
  guard let data = try? Data(contentsOf: url) else { return nil }
  return try? JSONDecoder().decode(type, from: data)
}

/// Same rule as the CLI: expired or orphaned reservations count as none.
private func activeReservations() -> [Reservation] {
  let dir = cacheDir.appendingPathComponent("reservations")
  let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
  return files
    .filter { $0.pathExtension == "json" }
    .compactMap { decode(Reservation.self, at: $0) }
    .filter { reservation in
      guard let expiry = isoDate.date(from: reservation.expiresAt) else { return false }
      return expiry > Date() && FileManager.default.fileExists(atPath: reservation.holder)
    }
}

final class Store: ObservableObject {
  @Published var rows: [Row] = []
  private var timer: Timer?

  var inUse: Int { rows.filter { $0.reservation != nil }.count }

  init() {
    reload()
    timer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
      self?.reload()
    }
  }

  func reload() {
    let phones = decode([PhoneInfo].self, at: cacheDir.appendingPathComponent("phones.json")) ?? []
    let reservations = Dictionary(
      activeReservations().map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
    var rows = phones.map { phone in
      Row(
        id: phone.id, name: phone.name, type: phone.type ?? "Phone",
        reservation: reservations[phone.id],
        expiresAt: reservations[phone.id].flatMap { isoDate.date(from: $0.expiresAt) })
    }
    // Reserved phones missing from phones.json still count.
    for reservation in reservations.values where !phones.contains(where: { $0.id == reservation.id }) {
      rows.append(
        Row(
          id: reservation.id, name: reservation.name ?? reservation.target,
          type: reservation.type ?? "Phone", reservation: reservation,
          expiresAt: isoDate.date(from: reservation.expiresAt)))
    }
    rows.sort { ($0.reservation == nil ? 1 : 0, $0.type, $0.name) < ($1.reservation == nil ? 1 : 0, $1.type, $1.name) }
    self.rows = rows
  }
}

private func symbol(for type: String) -> String {
  switch type {
  case "iPad": return "ipad"
  case "Android phone": return "smartphone"
  default: return "iphone"
  }
}

private func timeLeft(until date: Date?) -> String {
  guard let date else { return "" }
  let minutes = max(1, Int(date.timeIntervalSinceNow / 60))
  return minutes < 90 ? "\(minutes)m left" : String(format: "%.1fh left", Double(minutes) / 60)
}

struct RowView: View {
  let row: Row

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      Image(systemName: symbol(for: row.type))
        .font(.title2)
        .frame(width: 24)
        .foregroundStyle(.secondary)
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 6) {
          Text(row.type).fontWeight(.semibold)
          Text(row.name).foregroundStyle(.secondary).lineLimit(1)
        }
        if let reservation = row.reservation {
          Text(reservation.goal ?? "No goal given")
            .foregroundStyle(reservation.goal == nil ? .secondary : .primary)
            .fixedSize(horizontal: false, vertical: true)
          Text("\(URL(fileURLWithPath: reservation.holder).lastPathComponent) · \(timeLeft(until: row.expiresAt))")
            .font(.caption)
            .foregroundStyle(.secondary)
        } else {
          Text("Free").foregroundStyle(.secondary)
        }
      }
      Spacer(minLength: 8)
      Circle()
        .fill(row.reservation == nil ? Color.green : Color.orange)
        .frame(width: 9, height: 9)
        .padding(.top, 5)
        .help(row.reservation == nil ? "Free" : "In use")
    }
    .padding(.vertical, 4)
  }
}

struct MenuView: View {
  @ObservedObject var store: Store

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("\(store.inUse) of \(store.rows.count) phones in use")
        .font(.headline)
      Divider()
      if store.rows.isEmpty {
        Text("No phones known. Run `bun devices list`.")
          .foregroundStyle(.secondary)
      }
      ForEach(store.rows) { row in
        RowView(row: row)
      }
      Divider()
      HStack {
        Button("Refresh") { store.reload() }
        Spacer()
        Button("Quit") { NSApplication.shared.terminate(nil) }
      }
    }
    .padding(12)
    .frame(width: 340)
    .onAppear { store.reload() }
  }
}

@main
struct DevicesMenuBarApp: App {
  @StateObject private var store = Store()

  var body: some Scene {
    MenuBarExtra {
      MenuView(store: store)
    } label: {
      Image(systemName: "iphone")
      Text("\(store.inUse)/\(store.rows.count)")
    }
    .menuBarExtraStyle(.window)
  }
}
