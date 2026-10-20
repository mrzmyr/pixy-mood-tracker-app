Pod::Spec.new do |s|
  s.name           = 'PixyMoodTrackerPeopleTile'
  s.version        = '1.0.0'
  s.summary        = 'Native context menu and drag for check-in person tiles'
  s.author         = 'pixy-mood-tracker'
  s.homepage       = 'https://github.com/mrzmyr/pixy-mood-tracker-app'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
