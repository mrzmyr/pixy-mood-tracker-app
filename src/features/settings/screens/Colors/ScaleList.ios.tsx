import { FieldGroup, Host, ListItem, Text } from "@expo/ui";
import { HStack, Image, RNHostView, Spacer } from "@expo/ui/swift-ui";
import {
  accessibilityAddTraits,
  accessibilityHidden,
  accessibilityLabel,
  opacity,
  scrollContentBackground,
} from "@expo/ui/swift-ui/modifiers";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { Scale, SCALE_ROW_DOT_SIZE } from "./Scale";
import { scaleLabel } from "./scaleLabel";
import type { ScaleListProps } from "./types";

const formModifiers = [scrollContentBackground("hidden")];

/**
 * Scale choice on iOS: SwiftUI `Form` section, one row per scale, checkmark
 * on the selected row as in iOS Settings. The scale preview is React Native.
 *
 * The checkmark sits in the headline, not in `trailing`: `ListItem` hosts
 * trailing content as React Native, and the checkmark is a SwiftUI symbol.
 * Every row renders it, transparent when not selected, so the dots of all
 * rows line up.
 */
export const ScaleList = ({
  scaleIds,
  selectedId,
  onSelect,
  footer,
}: ScaleListProps) => {
  const colors = useColors();
  const haptics = useHaptics();

  return (
    <Host style={{ flex: 1 }}>
      <FieldGroup
        style={{ backgroundColor: colors.background }}
        modifiers={formModifiers}
      >
        <FieldGroup.Section>
          {scaleIds.map((id, index) => {
            const isSelected = id === selectedId;
            return (
              <ListItem
                key={id}
                testID={`scale-${id}`}
                onPress={() => {
                  haptics.selection();
                  onSelect(id);
                }}
                modifiers={[
                  accessibilityLabel(scaleLabel(index, scaleIds.length)),
                  ...(isSelected
                    ? [accessibilityAddTraits(["isSelected"])]
                    : []),
                ]}
              >
                <HStack spacing={12}>
                  <RNHostView matchContents>
                    <Scale type={id} dotSize={SCALE_ROW_DOT_SIZE} />
                  </RNHostView>
                  <Spacer />
                  <Image
                    systemName="checkmark"
                    size={17}
                    color={colors.tint}
                    modifiers={[
                      opacity(isSelected ? 1 : 0),
                      accessibilityHidden(),
                    ]}
                  />
                </HStack>
              </ListItem>
            );
          })}
          <FieldGroup.SectionFooter>
            <Text>{footer}</Text>
          </FieldGroup.SectionFooter>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
};
