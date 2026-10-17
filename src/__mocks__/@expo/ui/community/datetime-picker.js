// @expo/ui/community/datetime-picker for Jest: the Compose dialog has no
// Jest view. The stand-in renders while the dialog is open. Fire
// "valueChange" with (event, date) to confirm, "dismiss" to cancel.
const { View } = require("react-native");

const DateTimePicker = ({ mode, value, onValueChange, onDismiss }) => (
  <View
    testID={`datetime-dialog-${mode}`}
    accessibilityValue={{ text: value.toISOString() }}
    onValueChange={onValueChange}
    onDismiss={onDismiss}
  />
);

module.exports = {
  __esModule: true,
  default: DateTimePicker,
  DateTimePicker,
};
