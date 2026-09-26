// Generates the development and preview app icons from the production icon:
// a diagonal ribbon with the variant name on iOS icons, and a label pill
// inside the safe zone on Android adaptive icons (masks crop the corners).
//
// Usage: swift scripts/generate-variant-icons.swift
import AppKit

struct Variant {
  let name: String
  let label: String
  let color: NSColor
}

let variants = [
  Variant(
    name: "dev", label: "DEV",
    color: NSColor(srgbRed: 0.23, green: 0.23, blue: 0.23, alpha: 1)),
  Variant(
    name: "preview", label: "PREVIEW",
    color: NSColor(srgbRed: 0.40, green: 0.27, blue: 0.85, alpha: 1)),
]

let root = URL(fileURLWithPath: CommandLine.arguments[0])
  .deletingLastPathComponent().deletingLastPathComponent()
let images = root.appendingPathComponent("assets/images")

func load(_ file: String) -> CGImage {
  let url = images.appendingPathComponent(file)
  guard let image = NSImage(contentsOf: url),
    let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
  else { fatalError("Cannot read \(url.path)") }
  return cg
}

func render(_ base: CGImage, draw: (CGContext, CGFloat) -> Void) -> NSBitmapImageRep {
  let size = base.width
  let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
    bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  let context = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.current = context
  let cg = context.cgContext
  let side = CGFloat(size)
  cg.draw(base, in: CGRect(x: 0, y: 0, width: side, height: side))
  draw(cg, side)
  NSGraphicsContext.restoreGraphicsState()
  return rep
}

func drawLabel(_ text: String, fontSize: CGFloat, center: CGPoint) {
  let attributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: fontSize, weight: .heavy),
    .foregroundColor: NSColor.white,
    .kern: fontSize * 0.08,
  ]
  let string = NSAttributedString(string: text, attributes: attributes)
  let bounds = string.size()
  string.draw(at: CGPoint(x: center.x - bounds.width / 2, y: center.y - bounds.height / 2))
}

// Ribbon across the top-right corner, like the previous dev icon.
func drawRibbon(_ variant: Variant, _ cg: CGContext, _ side: CGFloat) {
  let band = side * 0.16
  let offset = side * 0.29
  cg.saveGState()
  // Origin at the top-right corner (AppKit y grows upward), rotated so the
  // x axis runs along the ribbon.
  cg.translateBy(x: side, y: side)
  cg.rotate(by: -.pi / 4)
  let length = side * 2
  cg.setFillColor(variant.color.cgColor)
  cg.fill(CGRect(x: -length / 2, y: -offset - band / 2, width: length, height: band))
  let fontSize = band * (variant.label.count > 4 ? 0.46 : 0.56)
  drawLabel(variant.label, fontSize: fontSize, center: CGPoint(x: 0, y: -offset))
  cg.restoreGState()
}

// Pill under the dots, inside the adaptive icon's 66% safe zone.
func drawPill(_ variant: Variant, _ cg: CGContext, _ side: CGFloat) {
  let height = side * 0.07
  let width = side * (variant.label.count > 4 ? 0.26 : 0.16)
  let rect = CGRect(x: (side - width) / 2, y: side * 0.2, width: width, height: height)
  cg.setFillColor(variant.color.cgColor)
  cg.addPath(CGPath(roundedRect: rect, cornerWidth: height / 2, cornerHeight: height / 2, transform: nil))
  cg.fillPath()
  drawLabel(variant.label, fontSize: height * (variant.label.count > 4 ? 0.48 : 0.55), center: CGPoint(x: rect.midX, y: rect.midY))
}

func save(_ rep: NSBitmapImageRep, _ file: String) {
  let url = images.appendingPathComponent(file)
  try! rep.representation(using: .png, properties: [:])!.write(to: url)
  print("wrote assets/images/\(file)")
}

let icon = load("icon.png")
let adaptive = load("adaptive-icon.png")
for variant in variants {
  save(render(icon) { drawRibbon(variant, $0, $1) }, "icon-\(variant.name).png")
  save(render(adaptive) { drawPill(variant, $0, $1) }, "adaptive-icon-\(variant.name).png")
}
