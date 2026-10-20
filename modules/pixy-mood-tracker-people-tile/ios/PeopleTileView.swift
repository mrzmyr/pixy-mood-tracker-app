import ExpoModulesCore
import UIKit

/// Wraps one check-in person tile drawn by React Native.
///
/// - Hold: system context menu with a lifted preview
/// - Move while the menu shows: menu goes away, the tile drags
/// - Drag over another tile: `onDragEnter` with both ids, JS reorders
///
/// UIKit hands the touch from the menu to the drag only when both
/// interactions sit on the same view, so this view carries both.
class PeopleTileView: ExpoView, UIContextMenuInteractionDelegate, UIDragInteractionDelegate,
  UIDropInteractionDelegate
{
  let onMenuAction = EventDispatcher()
  let onInteractionStart = EventDispatcher()
  let onDragEnter = EventDispatcher()
  let onDragEnd = EventDispatcher()

  /// Tile under the finger's drag; drops land on its spot.
  private static weak var dragSource: PeopleTileView?

  var tileId = ""
  var menuTitle = ""
  var actions: [PeopleTileMenuAction] = []

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    addInteraction(UIContextMenuInteraction(delegate: self))
    let drag = UIDragInteraction(delegate: self)
    drag.isEnabled = true
    addInteraction(drag)
    addInteraction(UIDropInteraction(delegate: self))
  }

  // Lift preview: only the tile's shapes, so the shadow hugs the avatar
  // circle and the name instead of a card around the cell.
  private func previewParameters() -> UIPreviewParameters {
    let parameters = UIPreviewParameters()
    parameters.backgroundColor = .clear
    let path = UIBezierPath()
    appendShapes(of: self, to: path)
    parameters.visiblePath =
      path.isEmpty ? UIBezierPath(roundedRect: bounds, cornerRadius: 16) : path
    return parameters
  }

  /// Circles and text lines below `view`, in this view's coordinates.
  /// A square counts as a circle when it holds one, as a subview or as a
  /// sibling with the same center: React Native flattens the bezel and
  /// the avatar into siblings and draws round borders on its own layers.
  private func appendShapes(of view: UIView, to path: UIBezierPath) {
    let children = view.subviews.filter { !$0.isHidden && $0.alpha > 0 }
    let circles = children.filter(isCircle).map { $0.convert($0.bounds, to: self) }
    for child in children {
      let frame = child.convert(child.bounds, to: self)
      let holdsCircle =
        containsCircle(child)
        || circles.contains { $0.midX.isClose(to: frame.midX) && $0.midY.isClose(to: frame.midY) }
      if isSquare(frame) && holdsCircle {
        path.append(UIBezierPath(ovalIn: frame))
      } else if String(describing: type(of: child)).contains("Paragraph") {
        path.append(UIBezierPath(roundedRect: frame.insetBy(dx: -6, dy: -2), cornerRadius: 8))
      } else {
        appendShapes(of: child, to: path)
      }
    }
  }

  private func isSquare(_ frame: CGRect) -> Bool {
    frame.width > 0 && abs(frame.width - frame.height) < 1
  }

  private func isCircle(_ view: UIView) -> Bool {
    let side = min(view.bounds.width, view.bounds.height)
    return side > 0 && view.layer.cornerRadius * 2 >= side - 1
  }

  private func containsCircle(_ view: UIView) -> Bool {
    isCircle(view) || view.subviews.contains { containsCircle($0) }
  }

  // MARK: Context menu

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    configurationForMenuAtLocation location: CGPoint
  ) -> UIContextMenuConfiguration? {
    if actions.isEmpty {
      return nil
    }
    return UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { [weak self] _ in
      guard let self else {
        return nil
      }
      let children = self.actions.map { action in
        UIAction(
          title: action.title,
          image: action.systemImage.flatMap { UIImage(systemName: $0) },
          attributes: action.destructive ? .destructive : []
        ) { [weak self] _ in
          self?.onMenuAction(["id": action.id])
        }
      }
      return UIMenu(title: self.menuTitle, children: children)
    }
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    willDisplayMenuFor configuration: UIContextMenuConfiguration,
    animator: UIContextMenuInteractionAnimating?
  ) {
    onInteractionStart()
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    previewForHighlightingMenuWithConfiguration configuration: UIContextMenuConfiguration
  ) -> UITargetedPreview? {
    UITargetedPreview(view: self, parameters: previewParameters())
  }

  func contextMenuInteraction(
    _ interaction: UIContextMenuInteraction,
    previewForDismissingMenuWithConfiguration configuration: UIContextMenuConfiguration
  ) -> UITargetedPreview? {
    UITargetedPreview(view: self, parameters: previewParameters())
  }

  // MARK: Drag

  func dragInteraction(
    _ interaction: UIDragInteraction,
    itemsForBeginning session: UIDragSession
  ) -> [UIDragItem] {
    let item = UIDragItem(itemProvider: NSItemProvider())
    item.localObject = tileId
    session.localContext = tileId
    return [item]
  }

  func dragInteraction(
    _ interaction: UIDragInteraction,
    previewForLifting item: UIDragItem,
    session: UIDragSession
  ) -> UITargetedDragPreview? {
    UITargetedDragPreview(view: self, parameters: previewParameters())
  }

  func dragInteraction(
    _ interaction: UIDragInteraction,
    sessionIsRestrictedToDraggingApplication session: UIDragSession
  ) -> Bool {
    true
  }

  func dragInteraction(_ interaction: UIDragInteraction, sessionWillBegin session: UIDragSession) {
    PeopleTileView.dragSource = self
    onInteractionStart(["dragging": true])
  }

  func dragInteraction(
    _ interaction: UIDragInteraction,
    session: UIDragSession,
    didEndWith operation: UIDropOperation
  ) {
    if PeopleTileView.dragSource === self {
      PeopleTileView.dragSource = nil
    }
    onDragEnd()
  }

  // MARK: Drop

  func dropInteraction(_ interaction: UIDropInteraction, canHandle session: UIDropSession) -> Bool {
    session.localDragSession?.localContext is String
  }

  func dropInteraction(_ interaction: UIDropInteraction, sessionDidEnter session: UIDropSession) {
    guard let sourceId = session.localDragSession?.localContext as? String, sourceId != tileId
    else {
      return
    }
    onDragEnter(["sourceId": sourceId, "targetId": tileId])
  }

  func dropInteraction(
    _ interaction: UIDropInteraction,
    sessionDidUpdate session: UIDropSession
  ) -> UIDropProposal {
    UIDropProposal(operation: .move)
  }

  func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) {}

  // The dragged tile lands where its placeholder is now.
  func dropInteraction(
    _ interaction: UIDropInteraction,
    previewForDropping item: UIDragItem,
    withDefault defaultPreview: UITargetedDragPreview
  ) -> UITargetedDragPreview? {
    guard let source = PeopleTileView.dragSource, let container = source.superview else {
      return defaultPreview
    }
    return defaultPreview.retargetedPreview(
      with: UIDragPreviewTarget(container: container, center: source.center))
  }
}

extension CGFloat {
  fileprivate func isClose(to other: CGFloat) -> Bool {
    abs(self - other) < 1
  }
}
