// @expo/ui/jetpack-compose for Jest: Compose views have no Jest view, so
// these stand-ins render React Native views. They keep the native rule: a
// Compose view outside a `Host` (or inside an `RNHostView`) throws, like the
// "must be rendered as a direct child of a <Host>" error on the phone.
const { Children, createContext, useContext } = require("react");
const { Pressable, Text } = require("react-native");

const InCompose = createContext(false);

const Host = ({ children }) => (
  <InCompose.Provider value>{children}</InCompose.Provider>
);

const RNHostView = ({ children }) => (
  <InCompose.Provider value={false}>{children}</InCompose.Provider>
);

const Slot = ({ children }) => children;

const Items = ({ children }) => children;

const DropdownMenu = ({ expanded, children }) => {
  if (!useContext(InCompose)) {
    throw Object.assign(new Error("Compose view outside Host"), {
      status: "compose_outside_host",
      why: 'A Jetpack Compose view "DropdownMenuView" must be rendered as a direct child of a <Host> component.',
      fix: "Wrap the view in Host from @expo/ui/jetpack-compose.",
    });
  }
  return Children.toArray(children).filter(
    (child) => expanded || child.type !== Items
  );
};
DropdownMenu.Trigger = Slot;
DropdownMenu.Items = Items;

const DropdownMenuItem = ({ onClick, children }) => (
  <Pressable accessibilityRole="menuitem" onPress={onClick}>
    {children}
  </Pressable>
);
DropdownMenuItem.Text = Slot;

const ComposeText = ({ children }) => <Text>{children}</Text>;

module.exports = {
  __esModule: true,
  Host,
  RNHostView,
  DropdownMenu,
  DropdownMenuItem,
  Text: ComposeText,
};
