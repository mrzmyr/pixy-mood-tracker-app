import ExpoModulesCore

public class TextWrapModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PixyMoodTrackerTextWrap")

    View(TextWrapView.self) {
      Prop("avoidTestIDs") { (view: TextWrapView, ids: [String]) in
        view.avoidTestIDs = ids
      }
      Prop("gap") { (view: TextWrapView, gap: Double) in
        view.gap = CGFloat(gap)
      }
    }
  }
}
