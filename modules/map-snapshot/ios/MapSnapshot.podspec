# Local Expo module: still Apple Maps images for place tiles.
# https://docs.expo.dev/modules/get-started/
Pod::Spec.new do |s|
  s.name           = 'MapSnapshot'
  s.version        = '1.0.0'
  s.summary        = 'Still Apple Maps images for place tiles'
  s.description    = 'Renders a map region to a PNG file with MKMapSnapshotter'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
