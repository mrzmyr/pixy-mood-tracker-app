import ExpoModulesCore
import UIKit

/// Hands the first scroll view inside it to the screen's view controller as
/// the top content scroll view. The navigation bar then collapses its large
/// title and switches its scroll edge look while that view scrolls.
///
/// UIKit looks for that scroll view only near the top of the screen's view
/// tree. A SwiftUI `Form` inside an `@expo/ui` `Host` sits too deep, so the
/// large title stays put without this view.
class ScrollEdgeView: ExpoView {
  /// SwiftUI adds its scroll view after the first layout pass. Look again
  /// on the next run loop turns, at most this many times.
  private static let maxAttempts = 20

  private var attempts = 0
  private var isRetryScheduled = false

  override func didMoveToWindow() {
    super.didMoveToWindow()
    attempts = 0
    attach()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    attach()
  }

  private func attach() {
    guard window != nil, let controller = owningViewController() else {
      return
    }
    guard let scrollView = firstScrollView() else {
      scheduleRetry()
      return
    }
    if controller.contentScrollView(for: .top) !== scrollView {
      controller.setContentScrollView(scrollView, for: .top)
    }
  }

  private func scheduleRetry() {
    guard !isRetryScheduled, attempts < Self.maxAttempts else { return }
    isRetryScheduled = true
    attempts += 1
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
      self?.isRetryScheduled = false
      self?.attach()
    }
  }

  /// Breadth first, so the outermost scroll view wins over nested ones.
  private func firstScrollView() -> UIScrollView? {
    var queue = subviews
    var index = 0
    while index < queue.count {
      let view = queue[index]
      if let scrollView = view as? UIScrollView {
        return scrollView
      }
      queue.append(contentsOf: view.subviews)
      index += 1
    }
    return nil
  }

  /// Nearest view controller above this view: the screen, not the SwiftUI
  /// hosting controller below it.
  private func owningViewController() -> UIViewController? {
    var responder = next
    while let current = responder {
      if let controller = current as? UIViewController {
        return controller
      }
      responder = current.next
    }
    return nil
  }
}
