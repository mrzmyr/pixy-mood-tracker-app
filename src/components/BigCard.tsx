import { useAnalytics } from '@/hooks/useAnalytics';
import useColors from "@/hooks/useColors";
import * as Sharing from 'expo-sharing';
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Text, View, ViewStyle } from "react-native";
import { Share } from 'react-native-feather';
import { captureRef } from "react-native-view-shot";
import LinkButton from './LinkButton';
import { CardFeedback } from './Statistics/CardFeedback';

const LOGO = require('../../assets/images/icon.png')

const Title = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <Text
      style={{
        letterSpacing: -0.1,
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
      }}
    >
      {children}
    </Text>
  )
}

const SubTitle = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <Text
      style={{
        fontSize: 17,
        color: colors.textSecondary,
        marginTop: 4,
        marginBottom: 16,
      }}
    >
      {children}
    </Text>
  )
}

const Container = ({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ViewStyle
}) => {
  const colors = useColors();

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: colors.cardBackground,
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 16,
        marginTop: 16,
        ...style,
      }}
    >
      <View
        style={{
          flexDirection: 'column',
          width: '100%',
        }}
      >
        {children}
      </View>
    </View>
  )
}

export const BigCard = ({
  title,
  subtitle,
  children,
  isShareable,
  hasFeedback,
  analyticsId,
  analyticsData = {},
}: {
  title?: string,
  subtitle?: string,
  children: React.ReactNode,
  isShareable?: boolean,
  hasFeedback?: boolean,
  analyticsId: string,
  analyticsData?: any,
}) => {
  const colors = useColors();
  const viewRef = useRef(null)
  const analytics = useAnalytics();
  const [shareLoading, setShareLoading] = useState(false);

  const share = () => {
    setShareLoading(true);

    captureRef(viewRef)
      .then((uri) => {
        setShareLoading(false);
        Sharing.shareAsync("file://" + uri, {
          dialogTitle: 'Hey I use this app called "Pixy Mood Tracker" and I wanted to share this with you!',
        })
          .then(() => {
            analytics.track('statstics_shared', {
              type: analyticsId,
            });
          })
          .catch((error) => {
            console.log(error)
          })
      })
      .catch((error) => console.error("Oops, snapshot failed", error))
  }

  return (
    <>
      <Container>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {title ?
            (<Title>{title}</Title>) :
            (<View />)
          }
          <View
            style={{
              marginTop: -16,
              marginRight: -16,
              marginLeft: -16,
              marginBottom: -16,
              width: 48,
              height: 48,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {shareLoading && (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            )}
            {!shareLoading && isShareable && (
              <LinkButton
                onPress={() => share()}
                style={{
                }}
              >
                <Share stroke={colors.tint} width={20} />
              </LinkButton>
            )}
          </View>
        </View>
        {subtitle && <SubTitle>{subtitle}</SubTitle>}
        {children}

        {hasFeedback && (
          <CardFeedback
            analyticsId={analyticsId}
            analyticsData={analyticsData}
          />
        )}
      </Container>
      {/* Share copy */}
      {isShareable && (
        <View
          ref={viewRef}
          style={{
            position: 'absolute',
            left: '-100%',
            top: '-100%',
            width: '100%',
            backgroundColor: colors.background,
            padding: 16,
            paddingTop: 0,
          }}
        >
          <Container>
            {title && <Title>{title}</Title>}
            {subtitle && <SubTitle>{subtitle}</SubTitle>}
            {children}
          </Container>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 16,
              marginLeft: -16,
            }}
          >
            <View
              style={{
                borderRadius: 8,
                backgroundColor: colors.sharingLogoBackground,
                marginRight: 8,
                padding: 2,
              }}
            >
              <Image
                source={LOGO}
                style={{
                  width: 32,
                  height: 32,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 17,
                fontWeight: 'bold',
                color: colors.sharingLogoText,
              }}
            >
              Pixy Mood Tracker
            </Text>
          </View>
        </View>
      )}
    </>
  )
}