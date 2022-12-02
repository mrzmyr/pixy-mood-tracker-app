import { Motion } from "@legendapp/motion";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { View } from "react-native";
import { PlusCircle } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import { t } from "@/helpers/translation";
import useColors from "../../hooks/useColors";

export const TodayEntryButton = memo(({
  isVisibile,
}: {
  isVisibile: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const navigation = useNavigation();

  const height = 120 + insets.bottom;

  return (
    <View>
      {/* Backdrop */}
      <Motion.View
        pointerEvents="none"
        initial={{
          opacity: isVisibile ? 1 : 0,
        }}
        animate={{
          opacity: isVisibile ? 1 : 0,
        }}
      >
        <LinearGradient
          colors={[colors.logBackgroundTransparent, colors.calendarBackground]}
          style={{
            position: 'absolute',
            height: height,
            bottom: 0,
            zIndex: 1,
            left: 0,
            right: 0,
          }}
        />
      </Motion.View>
      <Motion.View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 12,
          alignItems: "center",
          zIndex: 100,
        }}
        initial={{
          bottom: -height,
        }}
        animate={{
          bottom: isVisibile ? 0 : -height,
        }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 300
        }}
      >
        <View
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            marginBottom: 32,
          }}
        >
          <Button
            icon={<PlusCircle width={24} height={24} color={colors.primaryButtonText} />}
            onPress={() => {
              navigation.navigate("LogCreate", {
                date: dayjs().format("YYYY-MM-DD"),
              });
            }}
          >{t('add_today_entry')}</Button>
        </View>
      </Motion.View>
    </View>
  );
});
