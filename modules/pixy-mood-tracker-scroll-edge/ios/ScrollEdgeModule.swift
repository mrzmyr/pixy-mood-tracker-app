import ExpoModulesCore

public class ScrollEdgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PixyMoodTrackerScrollEdge")

    View(ScrollEdgeView.self) {}
  }
}
