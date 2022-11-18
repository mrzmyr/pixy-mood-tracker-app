import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import _ from "lodash";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Tag from "../../components/Tag";
import { getLogEditMarginTop } from "../../helpers/responsive";
import { t } from "../../helpers/translation";
import useColors from "../../hooks/useColors";
import { Tag as ITag, useTagsState } from "../../hooks/useTags";
import { useTemporaryLog } from "../../hooks/useTemporaryLog";
import { MiniButton } from "../MiniButton";
import { SlideHeadline } from "./SlideHeadline";

export const SlideTags = ({
  onChange
}: {
  onChange: (tags: ITag[]) => void,
}) => {
  const tempLog = useTemporaryLog();
  const navigation = useNavigation()
  const insets = useSafeAreaInsets();
  const colors = useColors()
  const { tags } = useTagsState()

  const marginTop = getLogEditMarginTop()

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
          {tags?.map(tag => {
            const _tag = tags.find(t => t.id === tag.id)
            if (!_tag) return null;

            return (
              <Tag
                onPress={async () => {
                  const newTags = tempLog?.data?.tags?.map(d => d.id).includes(tag.id) ?
                    tempLog?.data?.tags.filter(t => t.id !== tag.id) :
                    [...tempLog?.data.tags || [], tag]
                  onChange(newTags.map(t => _.omit(t, ['title', 'color'])))
                }}
                title={_tag.title}
                colorName={_tag.color}
                selected={tempLog?.data?.tags?.map(d => d.id).includes(tag.id)}
                key={tag.id}
              />
            )
          })}
          <View>
            <MiniButton
              onPress={() => {
                navigation.navigate('Tags')
              }}
            >{t('tags_edit')}</MiniButton>
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