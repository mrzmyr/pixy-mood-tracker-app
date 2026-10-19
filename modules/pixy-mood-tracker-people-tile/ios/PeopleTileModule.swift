import ExpoModulesCore

struct PeopleTileMenuAction: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var systemImage: String?
  @Field var destructive: Bool = false
}

public class PeopleTileModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PixyMoodTrackerPeopleTile")

    View(PeopleTileView.self) {
      Events("onMenuAction", "onInteractionStart", "onDragEnter", "onDragEnd")

      Prop("tileId") { (view: PeopleTileView, tileId: String) in
        view.tileId = tileId
      }

      Prop("menuTitle") { (view: PeopleTileView, title: String?) in
        view.menuTitle = title ?? ""
      }

      Prop("actions") { (view: PeopleTileView, actions: [PeopleTileMenuAction]) in
        view.actions = actions
      }
    }
  }
}
