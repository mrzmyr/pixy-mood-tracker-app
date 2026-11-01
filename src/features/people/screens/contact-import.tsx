import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import Circle from "lucide-react-native/icons/circle";
import CircleCheck from "lucide-react-native/icons/circle-check";
import CircleX from "lucide-react-native/icons/circle-x";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinkButton from "@/components/link-button";
import RouteModalHeader from "@/components/route-modal-header";
import { SFIcon } from "@/components/sf-icon";
import TextInfo from "@/components/text-info";
import { Copy, Label, getInputTextStyle } from "@/components/typography";
import { MAX_PEOPLE } from "@/constants/config";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import useHaptics from "@/hooks/use-haptics";
import { t } from "@/lib/translation";
import { PersonAvatar } from "../components/person-avatar";
import { groupContactRows } from "../contact-import";
import type { ContactRow as Row } from "../contact-import";
import { useContactImport } from "../hooks/use-contact-import";
import { useContactThumbnail } from "../hooks/use-contact-thumbnail";

const IS_IOS = Platform.OS === "ios";
const ROW_HEIGHT = 56;
const AVATAR_SIZE = 40;
const SELECTED_AVATAR_SIZE = 56;
/** Screen edge to row content. iOS rows sit in an inset group card. */
const INSET = 16;

/** Selection mark: empty circle, or filled check in the tint color. */
const SelectionMark = ({ isSelected }: { isSelected: boolean }) => {
  const colors = useColors();
  const color = isSelected ? colors.tint : colors.textSecondary;
  return isSelected ? (
    <SFIcon
      name="checkmark.circle.fill"
      color={color}
      size={24}
      fallback={<CircleCheck size={24} color={color} />}
    />
  ) : (
    <SFIcon
      name="circle"
      color={color}
      size={24}
      fallback={<Circle size={24} color={color} />}
    />
  );
};

/**
 * One contact with a selection circle; contacts that are already people are
 * disabled. iOS: row of an inset group card, divider inset to the name.
 */
const ContactRow = ({
  row,
  isSelected,
  isFirst,
  isLast,
  onToggle,
}: {
  row: Row;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
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
    <View
      style={
        IS_IOS
          ? {
              marginHorizontal: INSET,
              backgroundColor: colors.menuListItemBackground,
              borderTopLeftRadius: isFirst ? RADIUS.md : 0,
              borderTopRightRadius: isFirst ? RADIUS.md : 0,
              borderBottomLeftRadius: isLast ? RADIUS.md : 0,
              borderBottomRightRadius: isLast ? RADIUS.md : 0,
              borderCurve: "continuous",
            }
          : undefined
      }
    >
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
          paddingHorizontal: INSET,
          gap: 12,
          opacity: pressed ? pressedOpacity : restingOpacity,
        })}
      >
        <PersonAvatar
          person={{ id: row.contactId, name: row.name, avatar: null }}
          size={AVATAR_SIZE}
          previewUri={thumbnailUri}
        />
        <Label
          size={16}
          numberOfLines={1}
          style={{ flex: 1, color: colors.text }}
        >
          {row.name}
        </Label>
        {row.isAdded ? (
          <Label size={14} style={{ color: colors.textSecondary }}>
            {t("people_import_added")}
          </Label>
        ) : (
          <SelectionMark isSelected={isSelected} />
        )}
      </Pressable>
      {IS_IOS && !isLast && (
        <View
          style={{
            height: 1,
            marginLeft: INSET + AVATAR_SIZE + 12,
            backgroundColor: colors.menuListItemBorder,
          }}
        />
      )}
    </View>
  );
};

/** Picked contact in the strip: photo, first name, remove badge. */
const SelectedContact = ({
  row,
  onRemove,
}: {
  row: Row;
  onRemove: (contactId: string) => void;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const thumbnailUri = useContactThumbnail(row.contactId);

  const handlePress = async () => {
    await haptics.selection();
    onRemove(row.contactId);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("people_import_remove", { name: row.name })}
      onPress={handlePress}
      testID={`contact-import-selected-${row.contactId}`}
      style={({ pressed }) => ({
        width: SELECTED_AVATAR_SIZE + 16,
        alignItems: "center",
        gap: 6,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View>
        <PersonAvatar
          person={{ id: row.contactId, name: row.name, avatar: null }}
          size={SELECTED_AVATAR_SIZE}
          previewUri={thumbnailUri}
        />
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            borderRadius: RADIUS.md,
            backgroundColor: colors.menuListItemBackground,
          }}
        >
          <SFIcon
            name="xmark.circle.fill"
            color={colors.textSecondary}
            size={24}
            fallback={<CircleX size={24} color={colors.textSecondary} />}
          />
        </View>
      </View>
      <Label
        size={13}
        numberOfLines={1}
        style={{ color: colors.text, textAlign: "center" }}
      >
        {row.name.split(" ")[0]}
      </Label>
    </Pressable>
  );
};

/** Picked contacts in pick order, newest last. Tap one to unpick it. */
const SelectedStrip = ({
  rows,
  onRemove,
}: {
  rows: Row[];
  onRemove: (contactId: string) => void;
}) => {
  const colors = useColors();
  return (
    <View
      style={{
        marginHorizontal: IS_IOS ? INSET : 0,
        backgroundColor: colors.menuListItemBackground,
        borderRadius: IS_IOS ? RADIUS.md : 0,
        borderCurve: "continuous",
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 12, gap: 4 }}
      >
        {rows.map((row) => (
          <SelectedContact key={row.contactId} row={row} onRemove={onRemove} />
        ))}
      </ScrollView>
    </View>
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
      <Label
        size={16}
        strong
        accessibilityRole="header"
        style={{ textAlign: "center", color: colors.text }}
      >
        {t("people_import_error_title")}
      </Label>
      <Copy
        size={14}
        style={{
          marginTop: 8,
          marginBottom: 12,
          textAlign: "center",
          color: colors.textSecondary,
        }}
      >
        {t("people_import_error_message")}
      </Copy>
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
 *
 * iOS: native search bar in the sheet header, letter sections as inset
 * groups, picked contacts in a strip above the list. Android and web keep
 * the search field in the screen and flat Material rows.
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
  const selected = new Set(contactImport.selectedIds);
  const sections = groupContactRows(contactImport.rows);

  const notices = (
    <>
      {contactImport.isLimited && (
        <View>
          <TextInfo style={{ marginTop: 8 }}>
            {t("people_import_limited")}
          </TextInfo>
          <LinkButton onPress={handleShareMore} type="primary">
            {t("people_import_share_more")}
          </LinkButton>
        </View>
      )}
      {contactImport.isAtLimit && (
        <TextInfo style={{ marginTop: 8 }}>
          {t("people_reached_max", { max_count: MAX_PEOPLE })}
        </TextInfo>
      )}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
      {IS_IOS ? (
        <Stack.Screen
          options={{
            headerSearchBarOptions: {
              placeholder: t("people_import_search"),
              autoCapitalize: "none",
              hideWhenScrolling: false,
              obscureBackground: false,
              placement: "stacked",
              tintColor: colors.tint,
              textColor: colors.text,
              hintTextColor: colors.textSecondary,
              headerIconColor: colors.text,
              onChangeText: (event) =>
                handleQueryChange(event.nativeEvent.text),
              onCancelButtonPress: () => handleQueryChange(""),
            },
          }}
        />
      ) : (
        <View
          style={{ paddingHorizontal: INSET, paddingTop: 8, paddingBottom: 12 }}
        >
          <TextInput
            accessibilityLabel={t("people_import_search")}
            testID="contact-import-search"
            autoCorrect={false}
            style={{
              ...getInputTextStyle(16),
              color: colors.textInputText,
              backgroundColor: colors.textInputBackground,
              padding: 12,
              borderRadius: RADIUS.sm,
              borderCurve: "continuous",
            }}
            placeholder={t("people_import_search")}
            placeholderTextColor={colors.textInputPlaceholder}
            value={contactImport.query}
            onChangeText={handleQueryChange}
          />
        </View>
      )}
      {contactImport.error !== null && (
        <ContactImportError onRetry={handleRetry} />
      )}
      {contactImport.isLoading && (
        <ActivityIndicator style={{ marginTop: 32 }} />
      )}
      {!contactImport.isLoading && contactImport.error === null && (
        <View style={{ flex: 1 }}>
          <SectionList
            sections={sections}
            keyExtractor={(row) => row.contactId}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListHeaderComponent={
              <View style={{ gap: 8, paddingTop: IS_IOS ? 8 : 0 }}>
                <View style={{ paddingHorizontal: INSET }}>{notices}</View>
                {contactImport.selectedRows.length > 0 && (
                  <SelectedStrip
                    rows={contactImport.selectedRows}
                    onRemove={handleToggle}
                  />
                )}
              </View>
            }
            renderSectionHeader={({ section }) => (
              <Text
                accessibilityRole="header"
                style={{
                  paddingHorizontal: IS_IOS ? INSET * 2 : INSET,
                  paddingTop: 20,
                  paddingBottom: 8,
                  fontSize: IS_IOS ? 15 : 14,
                  fontWeight: "600",
                  color: IS_IOS ? colors.textSecondary : colors.tint,
                }}
              >
                {section.title}
              </Text>
            )}
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
            renderItem={({ item, index, section }) => (
              <ContactRow
                row={item}
                isSelected={selected.has(item.contactId)}
                isFirst={index === 0}
                isLast={index === section.data.length - 1}
                onToggle={handleToggle}
              />
            )}
          />
          {!IS_IOS && (
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
          )}
        </View>
      )}
    </View>
  );
};
