import { Motion } from "@legendapp/motion";
import { useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo } from "react";
import { View } from "react-native";
import { PlusCircle } from "react-native-feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "../../components/Button";
import { t } from "../../helpers/translation";
import useColors from "../../hooks/useColors";

export const TodayEntryButton = memo(({
  isVisibile,
}: {
  isVisibile: boolean;
}) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const navigation = useNavigation();

  return (
    <Motion.View
      style={{
        position: "absolute",
        bottom: 0,
        width: "100%",
        paddingHorizontal: 12,
        alignItems: "center",
        zIndex: 100,
      }}
      initial={{
        bottom: -100,
      }}
      animate={{
        bottom: isVisibile ? 0 : -100,
      }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 300
      }}
    >
      {/* Backdrop */}
      <LinearGradient
        pointerEvents="none"
        colors={[colors.logBackgroundTransparent, colors.calendarBackground]}
        style={{
          position: 'absolute',
          height: 120 + insets.bottom,
          bottom: 0,
          zIndex: 1,
          width: '100%',
        }} />
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
  );
});
