import { FieldGroup, Host, ListItem, RNHostView, Text } from "@expo/ui";
import { RadioButton } from "@expo/ui/jetpack-compose";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { Scale, SCALE_ROW_DOT_SIZE } from "./Scale";
import type { ScaleListProps } from "./types";

/**
 * Scale choice on Android: Material 3 grouped rows, radio button at the end
 * of each row. The scale preview is React Native.
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
      <FieldGroup style={{ backgroundColor: colors.background }}>
        <FieldGroup.Section>
          {scaleIds.map((id) => {
            const select = () => {
              haptics.selection();
              onSelect(id);
            };
            return (
              <ListItem
                key={id}
                testID={`scale-${id}`}
                onPress={select}
                trailing={
                  <RadioButton
                    selected={id === selectedId}
                    onClick={select}
                    colors={{
                      selectedColor: colors.tint,
                      unselectedColor: colors.textSecondary,
                    }}
                  />
                }
              >
                <RNHostView matchContents>
                  <Scale type={id} dotSize={SCALE_ROW_DOT_SIZE} />
                </RNHostView>
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
