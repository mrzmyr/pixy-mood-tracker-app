// @expo/ui/community/datetime-picker for Jest: the native dialog has no Jest
// view. The stand-in is a plain View that keeps the picker props, so tests
// fire `valueChange` (pick a time) or `dismiss` (cancel) on it.
const { View } = require("react-native");

const DateTimePicker = (props) => (
  <View testID="time-picker-dialog" {...props} />
);

module.exports = {
  __esModule: true,
  DateTimePicker,
  default: DateTimePicker,
};
