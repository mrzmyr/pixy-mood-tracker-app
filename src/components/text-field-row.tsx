import { TextInput } from "react-native";
import type { TextInputProps } from "react-native";

import { getInputTextStyle } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { SPACE } from "@/constants/space";

/**
 * Single-line field as a row of a `MenuList` form, like a name in iOS
 * Contacts. The list draws the row gray and radius, so the input has none.
 * Wrap it in `MenuList`.
 */
export const TextFieldRow = ({
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
        width: "100%",
        paddingHorizontal: SPACE.lg,
        paddingVertical: 14,
        color: colors.text,
        ...getInputTextStyle(16),
      }}
    />
  );
};
