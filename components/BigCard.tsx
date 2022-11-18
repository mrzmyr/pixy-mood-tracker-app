import * as Sharing from 'expo-sharing';
import { useRef } from "react";
import { Image, Text, View, ViewStyle } from "react-native";
import { Share } from 'react-native-feather';
import { captureRef } from "react-native-view-shot";
import useColors from "../hooks/useColors";
import LinkButton from './LinkButton';

const LOGO = require(`../assets/images/icon.png`);

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
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 0,
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
}: {
  title: string,
  subtitle: string,
  children: React.ReactNode,
  isShareable?: boolean,
}) => {
  const colors = useColors();
  const viewRef = useRef(null)

  const share = () => {
    captureRef(viewRef)
      .then((uri) => {
        console.log("Image saved to", uri)
        Sharing.shareAsync("file://" + uri, {
          dialogTitle: 'Hey I use this app called "Pixy Mood Tracker" and I wanted to share this with you!',
        });
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
          <Title>{title}</Title>
          <View>
            {isShareable && (
              <LinkButton
                onPress={() => share()}
                style={{
                  marginTop: -16,
                  marginRight: -16,
                  marginLeft: -16,
                  marginBottom: -16,
                  padding: 20,
                }}
              >
                <Share stroke={colors.tint} width={20} />
              </LinkButton>
            )}
          </View>
        </View>
        <SubTitle>{subtitle}</SubTitle>
        {children}
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
            <Title>{title}</Title>
            <SubTitle>{subtitle}</SubTitle>
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
                backgroundColor: colors.cardBackground,
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
                color: colors.textSecondary,
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