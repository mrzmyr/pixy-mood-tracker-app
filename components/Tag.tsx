import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { Check } from "react-native-feather";
import useColors from "../hooks/useColors";

const Checkbox = ({
  colorName,
  checked,
}: {
  colorName: string;
  checked: boolean;
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        padding: 4,
        borderWidth: 2,
        borderColor: checked ? colors.tags[colorName]?.background : colors.tags[colorName]?.border,
        width: 22,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        backgroundColor: checked ? colors.tags[colorName]?.background : colors.tags[colorName]?.text,
      }}
    >
      {checked && <Check strokeWidth={3} width={12} color={colors.tags[colorName]?.text} />}
    </View>
  );
};

export default function Tag({ 
  colorName,
  title,
  selected = false,
  onPress,
}: {
  colorName: string,
  title: string,
  selected?: boolean,
  onPress?: () => void,
}) {
  const colors = useColors();
  
  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={{
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 16,
        paddingRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: 100,
        marginRight: 4,
        marginBottom: 4,
        backgroundColor: selected ? colors.tags[colorName]?.text : colors.tags[colorName]?.background,
      }}
      onPress={onPress}
    >
      <Text style={{
        color: selected ? colors.tags[colorName]?.background : colors.tags[colorName]?.text,
        fontSize: 17,
      }}>{title}</Text>
    </TouchableOpacity>
  )
}
