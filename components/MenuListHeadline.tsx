import { Text } from "react-native";
import useColors from "../hooks/useColors";

export default function MenuListHeadline({ 
  children
}: {
  children: React.ReactNode,
}) {
  const colors = useColors();
  
  return (
    <Text style={{
      fontSize: 14,
      textTransform: 'uppercase',
      color: colors.textSecondary,
      padding: 0,
      borderRadius: 8,
      width: '100%',
      marginTop: 16,
      paddingLeft: 16,
      marginBottom: 8,
    }}>
      {children}
    </Text>
  )
}