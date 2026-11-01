package com.devmood.pixymoodtracker.textwrap

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.text.Layout
import android.text.Editable
import android.text.Spanned
import android.text.TextWatcher
import android.text.style.ReplacementSpan
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.EditText
import com.facebook.react.R
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import kotlin.math.max

/**
 * Carves the floating button out of the first text input inside it. Lines
 * that would run under the button end early and continue on the next line;
 * all other lines keep the full width.
 *
 * Android text layout has no exclusion area, so this view ends such a line
 * itself: it widens the last space that still fits before the button. A
 * space at a line end takes no width, so the widened space only moves the
 * next word down and draws nothing.
 *
 * The carve-out sits at the bottom of the text content, or at the bottom of
 * the visible area while the text is shorter. So it lies under the button
 * while the text is scrolled to its end, where typing happens, and it never
 * reflows the text while scrolling.
 */
class TextWrapView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  /** `testID`s of the buttons to wrap around. The first one on screen wins. */
  var avoidTestIDs: List<String> = emptyList()
    set(value) {
      field = value
      scheduleUpdate()
    }

  /** Space between text and button, in dp. */
  var gap: Float = 8f
    set(value) {
      field = value
      scheduleUpdate()
    }

  private var editText: EditText? = null
  private var button: View? = null
  private val lastButtonLocation = IntArray(2)
  private var isApplying = false

  private val watcher =
    object : TextWatcher {
      override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit

      override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit

      override fun afterTextChanged(s: Editable?) {
        if (!isApplying) update(keepCaretVisible = true)
      }
    }

  /** The button follows the keyboard by translation, which fires no layout. */
  private val preDrawListener =
    ViewTreeObserver.OnPreDrawListener {
      val current = button
      if (current != null) {
        val location = IntArray(2)
        current.getLocationInWindow(location)
        if (!location.contentEquals(lastButtonLocation)) {
          location.copyInto(lastButtonLocation)
          scheduleUpdate(SETTLE_DELAY_MS)
        }
      }
      true
    }

  private val layoutListener =
    View.OnLayoutChangeListener { _, l, t, r, b, ol, ot, or, ob ->
      if (r - l != or - ol || b - t != ob - ot) scheduleUpdate()
    }

  private val updateRunnable = Runnable { update(keepCaretVisible = false) }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    viewTreeObserver.addOnPreDrawListener(preDrawListener)
    scheduleUpdate()
  }

  override fun onDetachedFromWindow() {
    viewTreeObserver.removeOnPreDrawListener(preDrawListener)
    removeCallbacks(updateRunnable)
    detachEditText()
    super.onDetachedFromWindow()
  }

  override fun onViewAdded(child: View?) {
    super.onViewAdded(child)
    scheduleUpdate()
  }

  private fun scheduleUpdate(delayMs: Long = 0) {
    removeCallbacks(updateRunnable)
    postDelayed(updateRunnable, delayMs)
  }

  private fun attachEditText(): EditText? {
    val current = editText
    if (current != null && current.parent != null && isAncestorOf(current)) return current
    detachEditText()
    val found = firstDescendant(this) { it as? EditText } ?: return null
    found.addTextChangedListener(watcher)
    found.addOnLayoutChangeListener(layoutListener)
    editText = found
    return found
  }

  private fun detachEditText() {
    editText?.let {
      it.removeTextChangedListener(watcher)
      it.removeOnLayoutChangeListener(layoutListener)
      clearBreaks(it.text)
    }
    editText = null
  }

  private fun isAncestorOf(view: View): Boolean {
    var parent = view.parent
    while (parent != null) {
      if (parent === this) return true
      parent = parent.parent
    }
    return false
  }

  private fun update(keepCaretVisible: Boolean) {
    val input = attachEditText() ?: return
    val text = input.text ?: return
    isApplying = true
    try {
      clearBreaks(text)
      val carveOut = carveOutInView(input) ?: return
      var anchor = input.height
      for (pass in 1..MAX_ANCHOR_PASSES) {
        addBreaks(input, text, carveOut, anchor - input.height)
        val layout = input.layout ?: break
        val contentHeight = layout.height + input.totalPaddingTop + input.totalPaddingBottom
        if (contentHeight <= anchor || pass == MAX_ANCHOR_PASSES) break
        // The wrap made the text taller. Move the carve-out to the new end.
        anchor = contentHeight
        clearBreaks(text)
      }
    } finally {
      isApplying = false
    }
    // A wrap can move the caret one line down, below the visible area.
    if (keepCaretVisible && input.hasFocus()) {
      input.bringPointIntoView(input.selectionEnd)
    }
  }

  /** Button frame plus gap, relative to the visible area of the input. */
  private fun carveOutInView(input: EditText): Rect? {
    val target = findButton(input.rootView) ?: return null
    if (input.width == 0 || input.height == 0) return null
    val inputLocation = IntArray(2)
    val buttonLocation = IntArray(2)
    input.getLocationInWindow(inputLocation)
    target.getLocationInWindow(buttonLocation)
    buttonLocation.copyInto(lastButtonLocation)
    val gapPx = (gap * resources.displayMetrics.density).toInt()
    val left = buttonLocation[0] - inputLocation[0] - gapPx
    val top = buttonLocation[1] - inputLocation[1] - gapPx
    val rect =
      Rect(
        left,
        top,
        left + target.width + 2 * gapPx,
        top + target.height + 2 * gapPx
      )
    return if (rect.intersects(0, 0, input.width, input.height)) rect else null
  }

  /**
   * Ends every line that runs into [carveOut] at its last space before it.
   * [shift] moves the carve-out from the visible area down to the content end.
   */
  private fun addBreaks(input: EditText, text: Editable, carveOut: Rect, shift: Int) {
    val bandTop = carveOut.top + shift - input.totalPaddingTop
    val bandBottom = carveOut.bottom + shift - input.totalPaddingTop
    val limit = (carveOut.left - input.totalPaddingLeft).toFloat()
    var line = 0
    while (true) {
      // Each break re-flows the text below it, so read the layout again.
      val layout = input.layout ?: return
      if (line >= layout.lineCount) return
      val top = layout.getLineTop(line)
      if (top >= bandBottom) return
      if (layout.getLineBottom(line) > bandTop && layout.getLineMax(line) > limit) {
        val space = lastSpaceBefore(layout, text, line, limit)
        if (space >= 0) {
          text.setSpan(LineBreakSpan(max(input.width, 1)), space, space + 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
      }
      line++
    }
  }

  /** Index of the last space on [line] whose start fits before [limit], or -1. */
  private fun lastSpaceBefore(layout: Layout, text: CharSequence, line: Int, limit: Float): Int {
    val start = layout.getLineStart(line)
    var index = layout.getLineEnd(line) - 1
    while (index > start) {
      val char = text[index]
      if (char == ' ' || char == '\t') {
        if (layout.getPrimaryHorizontal(index) <= limit) return index
      }
      index--
    }
    return -1
  }

  private fun clearBreaks(text: Editable?) {
    text?.getSpans(0, text.length, LineBreakSpan::class.java)?.forEach { text.removeSpan(it) }
  }

  private fun findButton(root: View): View? {
    if (avoidTestIDs.isEmpty()) return null
    button?.let { if (isAvoided(it)) return it }
    button = firstDescendant(root) { if (isAvoided(it)) it else null }
    return button
  }

  private fun isAvoided(view: View): Boolean {
    val id = view.getTag(R.id.react_test_id) as? String ?: return false
    return id in avoidTestIDs && view.isShown
  }

  /** Breadth first, so the outermost match wins. */
  private fun <T> firstDescendant(root: View, match: (View) -> T?): T? {
    val queue = ArrayDeque<View>()
    queue.add(root)
    while (queue.isNotEmpty()) {
      val view = queue.removeFirst()
      if (view !== root) match(view)?.let { return it }
      if (view is ViewGroup) {
        for (i in 0 until view.childCount) queue.add(view.getChildAt(i))
      }
    }
    return null
  }

  /** A space as wide as the input. It ends the line and draws nothing. */
  private class LineBreakSpan(private val width: Int) : ReplacementSpan() {
    override fun getSize(
      paint: Paint,
      text: CharSequence?,
      start: Int,
      end: Int,
      fm: Paint.FontMetricsInt?
    ): Int {
      if (fm != null) paint.getFontMetricsInt(fm)
      return width
    }

    override fun draw(
      canvas: Canvas,
      text: CharSequence?,
      start: Int,
      end: Int,
      x: Float,
      top: Int,
      y: Int,
      bottom: Int,
      paint: Paint
    ) = Unit
  }

  companion object {
    /** The wrap changes the text height, so the end anchor can move down a few times. */
    private const val MAX_ANCHOR_PASSES = 4

    /** The button follows the keyboard with a short ease. Measure once it settled. */
    private const val SETTLE_DELAY_MS = 150L
  }
}
