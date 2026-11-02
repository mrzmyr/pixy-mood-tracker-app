import ExpoModulesCore
import UIKit

/// Carves the floating button out of the first text view inside it. Lines
/// that would run under the button end early and continue on the next line;
/// all other lines keep the full width.
///
/// The carve-out is a text container exclusion path. It sits at the bottom
/// of the text content, or at the bottom of the visible area while the text
/// is shorter. So it lies under the button while the text is scrolled to its
/// end, where typing happens, and it never reflows the text while scrolling.
class TextWrapView: ExpoView {
  /// `testID`s of the buttons to wrap around. The first one on screen wins.
  var avoidTestIDs: [String] = [] {
    didSet { scheduleUpdate() }
  }

  /// Space between text and button, in points.
  var gap: CGFloat = 8 {
    didSet { scheduleUpdate() }
  }

  /// The wrap changes the text height, so the end anchor can move down a
  /// few times. It only moves down, so this cap is never hit in practice.
  private static let maxAnchorPasses = 4

  /// The button follows the keyboard with a short ease after the keyboard
  /// notification. Measure again once it settled.
  private static let settleDelay: TimeInterval = 0.25

  private weak var textView: UITextView?
  private weak var button: UIView?
  private var isUpdateScheduled = false

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    let center = NotificationCenter.default
    for name in [
      UITextView.textDidChangeNotification,
      UIResponder.keyboardDidShowNotification,
      UIResponder.keyboardDidHideNotification,
      UIResponder.keyboardDidChangeFrameNotification,
    ] {
      center.addObserver(self, selector: #selector(handleChange(_:)), name: name, object: nil)
    }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    scheduleUpdate()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    scheduleUpdate()
  }

  @objc private func handleChange(_ notification: Notification) {
    if notification.name == UITextView.textDidChangeNotification {
      guard let object = notification.object as? UITextView, object === textView else { return }
      update(keepCaretVisible: true)
      return
    }
    scheduleUpdate()
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.settleDelay) { [weak self] in
      self?.update()
    }
  }

  private func scheduleUpdate() {
    guard !isUpdateScheduled else { return }
    isUpdateScheduled = true
    DispatchQueue.main.async { [weak self] in
      self?.isUpdateScheduled = false
      self?.update()
    }
  }

  private func update(keepCaretVisible: Bool = false) {
    guard window != nil, let textView = findTextView() else { return }
    self.textView = textView
    let container = textView.textContainer

    guard let button = findButton(in: window), textView.bounds.height > 0 else {
      setExclusion(nil, on: container)
      return
    }

    // Button frame relative to the visible area of the text view.
    let buttonFrame = button.convert(button.bounds, to: textView)
      .offsetBy(dx: -textView.contentOffset.x, dy: -textView.contentOffset.y)
      .insetBy(dx: -gap, dy: -gap)
    let visible = CGRect(origin: .zero, size: textView.bounds.size)
    guard buttonFrame.intersects(visible) else {
      setExclusion(nil, on: container)
      return
    }

    let insets = textView.textContainerInset
    let layoutManager = textView.layoutManager
    var anchor = visible.height
    for _ in 0..<Self.maxAnchorPasses {
      // Move the button frame from the visible area to the anchor.
      let top = buttonFrame.minY + anchor - visible.height - insets.top
      let left = buttonFrame.minX - insets.left
      let rect = CGRect(
        x: left,
        y: top,
        width: max(container.size.width - left, 0),
        height: buttonFrame.height
      )
      setExclusion(rect, on: container)
      layoutManager.ensureLayout(for: container)
      let contentHeight = ceil(layoutManager.usedRect(for: container).height)
        + insets.top + insets.bottom
      if contentHeight <= anchor + 0.5 { break }
      anchor = contentHeight
    }

    // A wrap can move the caret one line down, below the visible area.
    if keepCaretVisible, textView.isFirstResponder {
      textView.scrollRangeToVisible(textView.selectedRange)
    }
  }

  private func setExclusion(_ rect: CGRect?, on container: NSTextContainer) {
    let current = container.exclusionPaths.first?.bounds
    if current == rect { return }
    container.exclusionPaths = rect.map { [UIBezierPath(rect: $0)] } ?? []
  }

  private func findTextView() -> UITextView? {
    if let textView, textView.isDescendant(of: self) { return textView }
    return firstDescendant(of: self) { $0 as? UITextView }
  }

  private func findButton(in root: UIView?) -> UIView? {
    guard let root, !avoidTestIDs.isEmpty else { return nil }
    if let button, isAvoided(button) { return button }
    button = firstDescendant(of: root) { isAvoided($0) ? $0 : nil }
    return button
  }

  private func isAvoided(_ view: UIView) -> Bool {
    guard let id = view.accessibilityIdentifier, avoidTestIDs.contains(id),
      !view.isHidden, view.window != nil
    else { return false }
    return true
  }

  /// Breadth first, so the outermost match wins.
  private func firstDescendant<T>(of root: UIView, where match: (UIView) -> T?) -> T? {
    var queue = root.subviews
    var index = 0
    while index < queue.count {
      let view = queue[index]
      if let found = match(view) { return found }
      queue.append(contentsOf: view.subviews)
      index += 1
    }
    return nil
  }
}
