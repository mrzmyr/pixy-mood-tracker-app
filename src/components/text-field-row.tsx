import { TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import type { ReactNode } from "react";

import { getInputTextStyle } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { SPACE } from "@/constants/space";

/**
 * Single-line field as a row of a `MenuList` form, like a name in iOS
 * Contacts. The list draws the row gray and radius, so the input has none.
 * Wrap it in `MenuList`. `leading` sits before the input, inset
 * {@link SPACE.md} from the row edge, like the tag icon button.
 */
export const TextFieldRow = ({
  ref,
  leading,
  ...props
}: Omit<TextInputProps, "style" | "placeholderTextColor"> & {
  ref?: React.Ref<TextInput>;
  /** Element before the input, like the tag icon button. */
  leading?: ReactNode;
}) => {
  const colors = useColors();

  const input = (
    <TextInput
      ref={ref}
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
      placeholderTextColor={colors.textInputPlaceholder}
      style={{
        color: colors.text,
        ...getInputTextStyle(16),
        ...(leading
          ? { flex: 1, paddingVertical: SPACE.md, paddingRight: SPACE.xs }
          : {
              width: "100%",
              paddingHorizontal: SPACE.lg,
              paddingVertical: 14,
            }),
      }}
    />
  );

  if (!leading) {
    return input;
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACE.md,
        padding: SPACE.md,
      }}
    >
      {leading}
      {input}
    </View>
  );
};
