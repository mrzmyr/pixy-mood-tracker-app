import { useRouter } from "expo-router";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import { ArchivedTagList } from "../components/ArchivedTagList";

/** Archived tags modal, opened from the tag manager modal. */
export const TagsArchive = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        marginTop: Platform.OS === "android" ? insets.top : 0,
      }}
    >
      <ModalHeader
        title={t("archive_tag")}
        right={
          <LinkButton
            onPress={() => {
              router.back();
            }}
            type="primary"
          >
            {t("done")}
          </LinkButton>
        }
      />
      <ScrollView
        style={{
          flex: 1,
        }}
      >
        <ArchivedTagList />
        <View
          style={{
            width: "100%",
            height: insets.bottom + 56,
          }}
        />
      </ScrollView>
    </View>
  );
};
