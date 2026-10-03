import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/LinkButton";
import ModalHeader from "@/components/ModalHeader";
import TextInfo from "@/components/TextInfo";
import { MAX_PEOPLE } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { t } from "@/lib/translation";
import { PersonAvatar } from "../components/PersonAvatar";
import type { ContactRow as Row } from "../contactImport";
import { useContactImport } from "../hooks/useContactImport";

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
  } = contactImport;
  const count = contactImport.selectedIds.length;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        marginTop: Platform.OS === "android" ? insets.top : 0,
      }}
    >
      <ModalHeader
        title={t("people_import_title")}
        left={
          <LinkButton onPress={() => router.back()} type="primary">
            {t("cancel")}
          </LinkButton>
        }
        right={
          <LinkButton
            onPress={handleImport}
            type="primary"
            disabled={count === 0 || contactImport.isImporting}
            testID="contact-import-save"
          >
            {contactImport.isImporting
              ? t("people_import_importing")
              : t("people_import_action", { count })}
          </LinkButton>
        }
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
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
            borderRadius: 8,
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
      {contactImport.isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
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
              {t("people_import_empty")}
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
      )}
    </View>
  );
};
