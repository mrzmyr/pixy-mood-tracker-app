import ExpoModulesCore
import MapKit
import UIKit

/// One still map image. Mirrors `SnapshotOptions` in
/// `src/features/location/mapSnapshot.ts`.
struct SnapshotOptions: Record {
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
  /// Same scale as the `expo-maps` camera zoom: the region spans
  /// 360 / 2^zoom degrees.
  @Field var zoom: Double = 13
  /// Image size in points.
  @Field var width: Double = 0
  @Field var height: Double = 0
  /// Pixels per point.
  @Field var scale: Double = 1
  @Field var isDark: Bool = false
  /// `file://` URI of the PNG to write. The parent directory must exist.
  @Field var uri: String = ""
}

/// Renders Apple Maps regions to PNG files with `MKMapSnapshotter`. Lists
/// show these images instead of live map views, which cost memory, GPU, and
/// frames while scrolling.
public class MapSnapshotModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MapSnapshot")

    AsyncFunction("createAsync") { (options: SnapshotOptions, promise: Promise) in
      guard let url = URL(string: options.uri), url.isFileURL else {
        promise.reject(InvalidSnapshotOptionsException("uri is not a file URI"))
        return
      }
      guard options.width > 0, options.height > 0, options.scale > 0 else {
        promise.reject(InvalidSnapshotOptionsException("width, height, and scale must be above 0"))
        return
      }
      let center = CLLocationCoordinate2D(latitude: options.latitude, longitude: options.longitude)
      guard CLLocationCoordinate2DIsValid(center) else {
        promise.reject(InvalidSnapshotOptionsException("latitude or longitude is out of range"))
        return
      }

      // Same region as the `expo-maps` camera (MapUtils.swift), so the image
      // matches the live map at this zoom.
      let delta = 360 / pow(2, options.zoom)
      let snapshotOptions = MKMapSnapshotter.Options()
      snapshotOptions.region = MKCoordinateRegion(
        center: center,
        span: MKCoordinateSpan(latitudeDelta: delta, longitudeDelta: delta)
      )
      snapshotOptions.size = CGSize(width: options.width, height: options.height)
      snapshotOptions.mapType = .standard
      snapshotOptions.pointOfInterestFilter = .excludingAll
      snapshotOptions.traitCollection = makeTraits(isDark: options.isDark, scale: options.scale)

      let snapshotter = MKMapSnapshotter(options: snapshotOptions)
      snapshotter.start(with: DispatchQueue.global(qos: .utility)) { snapshot, error in
        // Keeps the snapshotter alive until it finishes.
        withExtendedLifetime(snapshotter) {}
        guard let snapshot else {
          promise.reject(SnapshotFailedException(error?.localizedDescription ?? "MapKit returned no image"))
          return
        }
        guard let data = snapshot.image.pngData() else {
          promise.reject(SnapshotFailedException("PNG encoding failed"))
          return
        }
        do {
          // Atomic: a partly written file never counts as a cached image.
          try data.write(to: url, options: .atomic)
          promise.resolve()
        } catch {
          promise.reject(SnapshotWriteException(error.localizedDescription))
        }
      }
    }
    .runOnQueue(.main)
  }
}

private func makeTraits(isDark: Bool, scale: Double) -> UITraitCollection {
  let style: UIUserInterfaceStyle = isDark ? .dark : .light
  if #available(iOS 17.0, *) {
    return UITraitCollection { traits in
      traits.userInterfaceStyle = style
      traits.displayScale = scale
    }
  }
  return UITraitCollection(traitsFrom: [
    UITraitCollection(userInterfaceStyle: style),
    UITraitCollection(displayScale: scale),
  ])
}

internal final class InvalidSnapshotOptionsException: GenericException<String> {
  override var reason: String {
    "Map snapshot options are invalid: \(param)"
  }
}

internal final class SnapshotFailedException: GenericException<String> {
  override var reason: String {
    "MKMapSnapshotter failed: \(param)"
  }
}

internal final class SnapshotWriteException: GenericException<String> {
  override var reason: String {
    "Writing the map snapshot failed: \(param)"
  }
}
