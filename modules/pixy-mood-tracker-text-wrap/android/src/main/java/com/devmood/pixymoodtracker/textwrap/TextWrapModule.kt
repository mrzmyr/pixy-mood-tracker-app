package com.devmood.pixymoodtracker.textwrap

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TextWrapModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PixyMoodTrackerTextWrap")

    View(TextWrapView::class) {
      Prop("avoidTestIDs") { view: TextWrapView, ids: List<String> ->
        view.avoidTestIDs = ids
      }
      Prop("gap") { view: TextWrapView, gap: Double ->
        view.gap = gap.toFloat()
      }
    }
  }
}
