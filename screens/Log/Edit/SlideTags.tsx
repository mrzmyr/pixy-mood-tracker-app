import { useNavigation } from "@react-navigation/native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Tag from "../../../components/Tag";
import { Tag as ITag } from "../../../hooks/useTags";
import { useTemporaryLog } from "../../../hooks/useTemporaryLog";
import { useTranslation } from "../../../hooks/useTranslation";
import { MiniButton } from "../MiniButton";
import { SlideHeadline } from "./SlideHeadline";
import { LinearGradient } from 'expo-linear-gradient';
import useColors from "../../../hooks/useColors";
import { useTagsState } from "../../../hooks/useTags";

export const SlideTags = ({
  marginTop,
  onChange
}: {
  marginTop: number;
  onChange: (tags: ITag[]) => void,
}) => {
  const tempLog = useTemporaryLog();
  const { t } = useTranslation()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const { tags } = useTagsState()

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
      <LinearGradient
        pointerEvents="none"
        colors={[colors.logBackground, colors.logBackgroundTransparent]}
        style={{
          position: 'absolute',
          height: 24,
          top: 32,
          zIndex: 1,
          width: '100%',
        }}
      />
      <LinearGradient
        colors={[colors.logBackgroundTransparent, colors.logBackground]}
        style={{
          position: 'absolute',
          height: 32,
          bottom: 0,
          zIndex: 1,
          width: '100%',
        }}
        pointerEvents="none"
      />
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
            marginTop: 16,
            paddingBottom: insets.bottom,
          }}
        >
            {tags?.map(tag => (
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
                  navigation.navigate('Tags')
                }}
              />
            </View>
            <View
              style={{
                height: 50 - insets.bottom + 8,
                width: '100%',
              }}
            />
        </View>
      </ScrollView>
    </View>
  )
}