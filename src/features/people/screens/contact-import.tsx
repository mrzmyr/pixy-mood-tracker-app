import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Check from "lucide-react-native/icons/check";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/link-button";
import RouteModalHeader from "@/components/route-modal-header";
import TextInfo from "@/components/text-info";
import { MAX_PEOPLE } from "@/constants/config";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { PersonAvatar } from "../components/person-avatar";
import type { ContactRow as Row } from "../contact-import";
import { useContactImport } from "../hooks/use-contact-import";
import { useContactThumbnail } from "../hooks/use-contact-thumbnail";
import { RADIUS } from "@/constants/radius";

const ROW_HEIGHT = 56;

/** One contact with a check mark; contacts that are already people are disabled. */
const ContactRow = ({
  row,
  isSelected,
  onToggle,
}: {
  row: Row;
  isSelected: boolean;
  onToggle: (contactId: string) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const thumbnailUri = useContactThumbnail(row.contactId);

  const pressedOpacity = row.isAdded ? 0.5 : 0.8;
  const restingOpacity = row.isAdded ? 0.5 : 1;

  const handlePress = async () => {
    await haptics.selection();
    onToggle(row.contactId);
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={row.name}
      accessibilityState={{ checked: isSelected, disabled: row.isAdded }}
      disabled={row.isAdded}
      onPress={handlePress}
      testID={`contact-import-${row.contactId}`}
      style={({ pressed }) => ({
        height: ROW_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.menuListItemBorder,
        opacity: pressed ? pressedOpacity : restingOpacity,
      })}
    >
      <PersonAvatar
        person={{ id: row.contactId, name: row.name, avatar: null }}
        size={32}
        previewUri={thumbnailUri}
      />
      <Text
        numberOfLines={1}
        style={{ flex: 1, marginLeft: 12, fontSize: 17, color: colors.text }}
      >
        {row.name}
      </Text>
      {row.isAdded ? (
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>
          {t("people_import_added")}
        </Text>
      ) : (
        isSelected && <Check size={22} color={colors.tint} />
      )}
    </Pressable>
  );
};

/** Shown when the address book read fails; Try Again reads it again. */
const ContactImportError = ({ onRetry }: { onRetry: () => void }) => {
  const colors = useColors();
  return (
    <View
      testID="contact-import-error"
      style={{ alignItems: "center", paddingHorizontal: 32, paddingTop: 48 }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 17,
          fontWeight: "600",
          textAlign: "center",
          color: colors.text,
        }}
      >
        {t("people_import_error_title")}
      </Text>
      <Text
        style={{
          marginTop: 8,
          marginBottom: 12,
          fontSize: 15,
          textAlign: "center",
          color: colors.textSecondary,
        }}
      >
        {t("people_import_error_message")}
      </Text>
      <LinkButton
        onPress={onRetry}
        type="primary"
        testID="contact-import-retry"
      >
        {t("people_import_retry")}
      </LinkButton>
    </View>
  );
};

/**
 * `/people/import`: pick any number of contacts from the address book and
 * add them as people at once. Only names are listed; photos are read for the
 * picked contacts on import.
 */
export const ContactImport = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const contactImport = useContactImport();
  const {
    toggle: handleToggle,
    shareMore: handleShareMore,
    importSelected: handleImport,
    setQuery: handleQueryChange,
    retry: handleRetry,
  } = contactImport;
  const count = contactImport.selectedIds.length;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <RouteModalHeader
        title={t("people_import_title")}
        onClose={() => router.back()}
        closeTestID="contact-import-cancel"
        confirm={{
          label: contactImport.isImporting
            ? t("people_import_importing")
            : t("people_import_action", { count }),
          onPress: handleImport,
          disabled: count === 0 || contactImport.isImporting,
          testID: "contact-import-save",
        }}
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <TextInput
          accessibilityLabel={t("people_import_search")}
          testID="contact-import-search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={{
            fontSize: 17,
            color: colors.textInputText,
            backgroundColor: colors.textInputBackground,
            padding: 12,
            borderRadius: RADIUS.sm,
          }}
          placeholder={t("people_import_search")}
          placeholderTextColor={colors.textInputPlaceholder}
          value={contactImport.query}
          onChangeText={handleQueryChange}
        />
        {contactImport.isLimited && (
          <View style={{ marginTop: 8 }}>
            <TextInfo>{t("people_import_limited")}</TextInfo>
            <LinkButton onPress={handleShareMore} type="primary">
              {t("people_import_share_more")}
            </LinkButton>
          </View>
        )}
        {contactImport.isAtLimit && (
          <TextInfo>
            {t("people_reached_max", { max_count: MAX_PEOPLE })}
          </TextInfo>
        )}
      </View>
      {contactImport.error !== null && (
        <ContactImportError onRetry={handleRetry} />
      )}
      {contactImport.isLoading && (
        <ActivityIndicator style={{ marginTop: 32 }} />
      )}
      {!contactImport.isLoading && contactImport.error === null && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={contactImport.rows}
            keyExtractor={(row) => row.contactId}
            getItemLayout={(_, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListEmptyComponent={
              <Text
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: colors.textSecondary,
                }}
              >
                {contactImport.query.trim() === ""
                  ? t("people_import_empty")
                  : t("people_import_no_match")}
              </Text>
            }
            renderItem={({ item }) => (
              <ContactRow
                row={item}
                isSelected={contactImport.selectedIds.includes(item.contactId)}
                onToggle={handleToggle}
              />
            )}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[colors.background, colors.logBackgroundTransparent]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 16,
            }}
          />
        </View>
      )}
    </View>
  );
};
