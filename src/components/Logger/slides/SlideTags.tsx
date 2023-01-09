import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getLogEditMarginTop } from "@/helpers/responsive";
import { t } from "@/helpers/translation";
import useColors from "@/hooks/useColors";
import { useTagsState } from "@/hooks/useTags";
import { useTemporaryLog } from "@/hooks/useTemporaryLog";
import LinkButton from "../../LinkButton";
import { MiniButton } from "../../MiniButton";
import Tag from "../../Tag";
import { SlideHeadline } from "../components/SlideHeadline";
import { Footer } from "./Footer";
import { TagReference } from "@/types";
import { Edit2 } from "react-native-feather";

export const SlideTags = ({
  onChange,
  onDisableStep = () => { },
  showDisable,
  showFooter = true,
}: {
  onChange: (tags: TagReference[]) => void,
  onDisableStep?: () => void
  showDisable: boolean
  showFooter?: boolean
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
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 20,
      marginTop,
    }}>
      <SlideHeadline>{t('log_tags_question')}</SlideHeadline>
      <View
        style={{
          position: 'relative',
          flex: 1,
        }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[colors.logBackground, colors.logBackgroundTransparent]}
          style={{
            position: 'absolute',
            height: 24,
            top: 0,
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
              marginTop: 24,
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
                    onChange(newTags)
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
                icon={
                  <Edit2
                    color={colors.miniButtonText}
                    width={17}
                    style={{ margin: -4, marginRight: 4, }}
                  />
                }
                onPress={() => {
                  navigation.navigate('Tags')
                }}
              >{t('tags_edit')}</MiniButton>
            </View>
          </View>
        </ScrollView>
      </View>
      {showFooter && (
        <Footer>
          {showDisable && (
            <LinkButton
              type="secondary"
              onPress={onDisableStep}
              style={{
                fontWeight: '400',
              }}
            >{t('log_tags_disable')}</LinkButton>
          )}
        </Footer>
      )}
    </View>
  )
}