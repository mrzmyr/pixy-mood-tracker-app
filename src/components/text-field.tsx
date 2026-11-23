import { TextInput } from "react-native";
import type { TextInputProps } from "react-native";

import { getInputTextStyle } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { RADIUS } from "@/constants/radius";
import { SPACE } from "@/constants/space";

/** Height of every single-line field: `TextField` and `SearchInput`. */
export const FIELD_HEIGHT = 44;

/**
 * Standalone single-line field, such as an email under a message. Capsule
 * like `Button`, platform field gray, no border.
 *
 * - Search: `SearchInput`.
 * - Field inside a `MenuList` form: `TextFieldRow`.
 * - Several lines: `TextArea`.
 */
export const TextField = ({
  ref,
  ...props
}: Omit<TextInputProps, "style" | "placeholderTextColor"> & {
  ref?: React.Ref<TextInput>;
}) => {
  const colors = useColors();

  return (
    <TextInput
      ref={ref}
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
      placeholderTextColor={colors.textInputPlaceholder}
      style={{
        height: FIELD_HEIGHT,
        paddingHorizontal: SPACE.lg,
        borderRadius: RADIUS.full,
        borderCurve: "continuous",
        backgroundColor: colors.textInputBackground,
        color: colors.textInputText,
        ...getInputTextStyle(16),
      }}
    />
  );
};
