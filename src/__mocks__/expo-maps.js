// expo-maps for Jest: the native module does not exist, so the map views
// render nothing. Map behavior is checked on device.
const Empty = () => null;

module.exports = {
  __esModule: true,
  AppleMaps: { View: Empty },
  GoogleMaps: { View: Empty },
};
