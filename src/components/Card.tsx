import useColors from "@/hooks/useColors"
import _ from "lodash"
import { Text, View, ViewStyle } from "react-native"
import { X } from "react-native-feather"
import LinkButton from "./LinkButton"
import { CardFeedback } from "./Statistics/CardFeedback"

export const Card = ({
  title,
  children,
  style,
  onClose,
  hasFeedback,
  analyticsId,
  analyticsData,
}: {
  title: string | React.ReactNode,
  children: React.ReactNode
  style?: ViewStyle,
  onClose?: () => void,
  hasFeedback?: boolean,
  analyticsId?: string,
  analyticsData?: any,
}) => {
  const colors = useColors()

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        paddingVertical: 8,
        paddingBottom: 16,
        padding: 16,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            marginTop: 8,
          }}
        >
          {_.isString(title) ?
            (<Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: colors.text,
              }}
            >{title}</Text>) :
            title
          }
        </View>
        <LinkButton
          onPress={() => onClose?.()}
          style={{
            marginBottom: -12,
            marginTop: -12,
            marginRight: -12,
          }}
        >
          <X width={22} color={colors.textSecondary} />
        </LinkButton>
      </View>
      <View
        style={{
          marginTop: 8,
        }}
      >
        {children}
      </View>
      {hasFeedback && (
        <CardFeedback
          variant="minimal"
          analyticsId={analyticsId!}
          analyticsData={analyticsData}
          style={{
            borderTopColor: colors.logCardBorder,
          }}
        />
      )}
    </View>
  )
}