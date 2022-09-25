import { useNavigation } from "@react-navigation/native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Tag from "../../components/Tag";
import { Tag as ITag, useSettings } from "../../hooks/useSettings";
import { useTemporaryLog } from "../../hooks/useTemporaryLog";
import { useTranslation } from "../../hooks/useTranslation";
import { MiniButton } from "./MiniButton";
import { SlideHeadline } from "./SlideHeadline";

export const SlideTags = ({
  marginTop,
  onChange
}: {
  marginTop: number;
  onChange: (tags: ITag[]) => void,
}) => {
  const tempLog = useTemporaryLog();
  const { t } = useTranslation()
  const { settings } = useSettings()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets();

  return (
    <View style={{ 
      flex: 1, 
      width: '100%',
      marginTop,
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
            {settings?.tags && settings?.tags?.map(tag => (
              <Tag 
                onPress={async () => {
                  const newTags = tempLog?.data?.tags?.map(d => d.id).includes(tag.id) ? 
                    tempLog?.data?.tags.filter(t => t.id !== tag.id) : 
                    [...tempLog?.data.tags, tag]
                  onChange(newTags)
                }}
                colorName={tag.color}
                selected={tempLog?.data?.tags?.map(d => d.id).includes(tag.id)} 
                key={tag.id} 
                title={tag.title} 
              />
            ))}
            <View>
              <MiniButton 
                onPress={() => {
                  navigation.navigate('TagsModal')
                }}
              />
            </View>
        </View>
      </ScrollView>
    </View>
  )
}