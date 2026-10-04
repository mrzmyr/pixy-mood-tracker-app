import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import { useRouter } from "expo-router";
import { t } from "@/lib/translation";
import { Text, View } from "react-native";
import { SectionHeader } from "./SectionHeader";

/**
 * Message section of an entry card; editing opens the logger at the
 * message step. A stored message always shows, also with the pencil off.
 */
export const Message = ({
  item,
  canEdit,
}: {
  item: LogItem;
  /** Shows the pencil; off when the edit logger has no message step. */
  canEdit: boolean;
}) => {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={{}}>
      <SectionHeader
        title={t("view_log_message")}
        editTestID="log-list-message-edit"
        onEdit={
          canEdit
            ? () => {
                router.push({
                  pathname: "/logs/[id]/edit",
                  params: {
                    id: item.id,
                    step: "message",
                  },
                });
              }
            : undefined
        }
      />
      <View
        style={{
          flexDirection: "row",
        }}
      >
        {item?.message?.length > 0 ? (
          <View
            style={{
              width: "100%",
            }}
          >
            <View
              style={{
                borderRadius: 8,
                paddingHorizontal: 8,
                width: "100%",
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  color: colors.text,
                  lineHeight: 23,
                  width: "100%",
                }}
              >
                {item.message}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={{
              paddingTop: 4,
              paddingBottom: 8,
              paddingHorizontal: 8,
              width: "100%",
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 17,
                lineHeight: 24,
              }}
            >
              {t("view_log_message_empty")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
