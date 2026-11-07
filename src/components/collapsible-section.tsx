import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronUp from "lucide-react-native/icons/chevron-up";
import Plus from "lucide-react-native/icons/plus";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import type { ViewStyle } from "react-native";
import { Label } from "@/components/typography";
import { RADIUS } from "@/constants/radius";
import { SPACE } from "@/constants/space";
import useColors from "@/hooks/use-colors";

/** Diameter of the round header buttons. */
const BUTTON_SIZE = 32;

/** Grows the 32 pt header buttons to a 44 pt touch target. */
const HIT_SLOP = (44 - BUTTON_SIZE) / 2;

const RoundButton = ({
  onPress,
  accessibilityLabel,
  isHidden = false,
  testID,
  children,
}: {
  onPress: () => void;
  accessibilityLabel?: string;
  /** Hidden from screen readers when the title already does the same. */
  isHidden?: boolean;
  testID?: string;
  children: ReactNode;
}) => {
  const colors = useColors();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessible={!isHidden}
      accessibilityElementsHidden={isHidden}
      importantForAccessibility={isHidden ? "no-hide-descendants" : "auto"}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: colors.logCardBorder,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
};

/**
 * Card with a title row and content that folds away. The title row holds an
 * optional add button and a chevron. Title and chevron both toggle. Screen
 * readers get the title as one button with its expanded state.
 *
 * `isCollapsed` undefined: no chevron, content always shows. Use it while a
 * search filters the content.
 */
export const CollapsibleSection = ({
  title,
  isCollapsed,
  onToggle,
  onAdd,
  addLabel,
  contentStyle,
  testID,
  children,
}: {
  title: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
  /** Shows a plus button left of the chevron. */
  onAdd?: () => void;
  /** Accessibility label of the plus button. */
  addLabel?: string;
  /** Overrides the content padding, for content that pads itself. */
  contentStyle?: ViewStyle;
  testID?: string;
  children: ReactNode;
}) => {
  const colors = useColors();
  const isCollapsible = isCollapsed !== undefined && onToggle !== undefined;
  const isOpen = !isCollapsible || !isCollapsed;
  const Chevron = isOpen ? ChevronUp : ChevronDown;

  return (
    <View
      testID={testID}
      style={{
        borderRadius: RADIUS.md,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.logCardBorder,
        backgroundColor: colors.logCardBackground,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SPACE.sm,
          paddingLeft: SPACE.lg,
          paddingRight: SPACE.md,
          paddingVertical: SPACE.sm,
          minHeight: 48,
        }}
      >
        <Pressable
          testID={testID ? `${testID}-toggle` : undefined}
          disabled={!isCollapsible}
          onPress={onToggle}
          accessibilityRole={isCollapsible ? "button" : "header"}
          accessibilityState={isCollapsible ? { expanded: isOpen } : undefined}
          style={{ flex: 1, alignSelf: "stretch", justifyContent: "center" }}
        >
          <Label size={16} strong numberOfLines={1}>
            {title}
          </Label>
        </Pressable>
        {onAdd && (
          <RoundButton
            testID={testID ? `${testID}-add` : undefined}
            onPress={onAdd}
            accessibilityLabel={addLabel}
          >
            <Plus width={18} height={18} color={colors.tint} />
          </RoundButton>
        )}
        {isCollapsible && (
          <RoundButton onPress={onToggle} isHidden>
            <Chevron width={18} height={18} color={colors.tint} />
          </RoundButton>
        )}
      </View>
      {isOpen && (
        <View
          style={{
            paddingHorizontal: SPACE.lg,
            paddingBottom: SPACE.lg,
            ...contentStyle,
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
};
