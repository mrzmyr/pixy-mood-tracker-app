import { useNavigation } from "@react-navigation/native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "../../hooks/useColors";
import useHaptics from "../../hooks/useHaptics";
import { Tag, useSettings } from "../../hooks/useSettings";
import { useTemporaryLog } from "../../hooks/useTemporaryLog";
import { useTranslation } from "../../hooks/useTranslation";
import { SlideHeadline } from "./SlideHeadline";
import { TagEdit } from "./TagEdit";

function TagLabel({ 
  title,
  selected = false,
  color,
  onPress,
}: {
  title: string,
  selected?: boolean,
  color: string,
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
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: selected ? colors.logTagBackgroundActive : colors.logTagBackground,
        borderWidth: 1,
        borderColor: selected ? colors.logTagBorderActive : colors.logTagBorder,
      }}
      onPress={onPress}
    >
      <View 
        style={{
          width: 8,
          height: 8,
          borderRadius: 100,
          marginRight: 10,
          backgroundColor: color,
        }}
      />
      <Text style={{
        color: selected ? colors.logTagTextActive : colors.logTagText,
        fontSize: 17,
      }}>{title}</Text>
    </TouchableOpacity>
  )
}


export const SlideTags = ({
  onChange
}: {
  onChange: (tags: Tag[]) => void,
}) => {
  const colors = useColors();
  const tempLog = useTemporaryLog();
  const { t } = useTranslation()
  const haptics = useHaptics()
  const { settings } = useSettings()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets();

  return (
    <View style={{ 
      flex: 1, 
      width: '100%',
      marginTop: 32,
    }}>
      <View
        style={{
          width: '100%',
          marginBottom: 8,
        }}
      >
        <SlideHeadline>{t('log_tags_question')}</SlideHeadline>
      </View>
      <ScrollView
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            marginTop: 8,
            paddingBottom: insets.bottom,
          }}
        >
            {settings?.tags && settings.tags.map(tag => (
              <TagLabel 
                onPress={() => {
                  const newTags = tempLog?.data?.tags.map(d => d.id).includes(tag.id) ? 
                    tempLog?.data?.tags.filter(t => t.id !== tag.id) : 
                    [...tempLog?.data.tags, tag]
                  onChange(newTags)
                }}
                color={colors.tags[tag.color].dot}
                selected={tempLog?.data?.tags.map(d => d.id).includes(tag.id)} 
                key={tag.id} 
                title={tag.title} 
              />
            ))}
            <View>
              <TagEdit 
                onPress={async () => {
                  await haptics.selection()
                  navigation.navigate('TagsModal')
                }}
              />
            </View>
        </View>
      </ScrollView>
    </View>
  )
}