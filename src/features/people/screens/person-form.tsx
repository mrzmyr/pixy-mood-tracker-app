import { useLocalSearchParams, useRouter } from "expo-router";
import Contact from "lucide-react-native/icons/contact";
import Trash from "lucide-react-native/icons/trash";
import { useRef } from "react";
import { Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuList from "@/components/menu-list";
import MenuListHeadline from "@/components/menu-list-headline";
import MenuListItem from "@/components/menu-list-item";
import RouteModalHeader from "@/components/route-modal-header";
import TextInfo from "@/components/text-info";
import Toggle from "@/components/toggle";
import { MAX_TAG_LENGTH } from "@/constants/config";
import { RADIUS } from "@/constants/radius";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { PersonAvatar } from "../components/person-avatar";
import { PhotoButton } from "@/components/photo-button";
import type { PhotoAction } from "@/components/photo-button/types";
import { RolePicker } from "../components/role-picker";
import { usePersonDraft } from "../hooks/use-person-draft";
import { usePersonEntryCount } from "../hooks/use-person-entry-count";
import { usePersonActions } from "../hooks/use-person-actions";

const AVATAR_SIZE = 112;
const SECTION_GAP = 32;

/** Archive switch and delete row of the edit form. */
const EditActions = ({
  personId,
  name,
  isArchived,
  onToggleArchived,
  onLeave,
}: {
  personId: string;
  /** Stored name, not the draft, so the footers do not change while typing. */
  name: string;
  isArchived: boolean;
  onToggleArchived: () => void;
  /** Called before the screen closes itself, so the discard guard stays quiet. */
  onLeave: () => void;
}) => {
  const router = useRouter();
  const colors = useColors();
  const { confirmDelete } = usePersonActions();
  const entryCount = usePersonEntryCount(personId);

  const askToDelete = () => {
    confirmDelete(personId, {
      onDeleted: () => {
        onLeave();
        router.back();
      },
    });
  };

  return (
    <>
      <MenuList style={{ marginTop: SECTION_GAP }}>
        <MenuListItem
          title={t("people_archive")}
          onPress={onToggleArchived}
          iconRight={
            <Toggle
              accessibilityLabel={t("people_archive")}
              testID="person-archived"
              onValueChange={onToggleArchived}
              value={isArchived}
            />
          }
        />
      </MenuList>
      <TextInfo>{t("people_archive_description")}</TextInfo>
      <MenuList style={{ marginTop: SECTION_GAP - 16 }}>
        <MenuListItem
          testID="person-delete"
          onPress={askToDelete}
          iconLeft={<Trash size={24} color={colors.danger} />}
          title={t("people_delete")}
          tone="destructive"
        />
      </MenuList>
      <TextInfo>
        {t("people_delete_footer", { count: entryCount, name })}
      </TextInfo>
    </>
  );
};

/**
 * Create or edit a person: photo, name, archive switch, and delete. "Add
 * Photo" opens the library; with a photo, "Edit Photo" opens a native menu.
 * Files change only on save, so cancel leaves the stored avatar untouched.
 */
const PersonForm = ({ mode }: { mode: "create" | "edit" }) => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const nameRef = useRef<TextInput>(null);
  const draft = usePersonDraft({ mode, id });
  const {
    save,
    fromLibrary,
    fromContact,
    setName: handleNameChange,
    setRole: handleRoleChange,
    removePhoto: handleRemovePhoto,
    toggleArchived: handleToggleArchived,
    allowLeave: handleAllowLeave,
  } = draft;
  const isIOS = Platform.OS === "ios";

  const handleSave = () => {
    if (!draft.isNameValid) {
      nameRef.current?.focus();
    }
    void save();
  };
  const handlePickPhoto = () => {
    void fromLibrary();
  };
  const handleContactPhoto = () => {
    void fromContact();
  };

  const photoActions: PhotoAction[] = [
    {
      label: t("people_photo_choose"),
      testID: "person-photo-choose",
      onPress: handlePickPhoto,
    },
    ...(draft.canUseContactPhoto
      ? [
          {
            label: t("people_photo_use_contact"),
            testID: "person-photo-contact",
            onPress: handleContactPhoto,
          },
        ]
      : []),
    {
      label: t("people_photo_remove"),
      testID: "person-remove-photo",
      onPress: handleRemovePhoto,
      destructive: true,
    },
  ];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <RouteModalHeader
        title={mode === "create" ? t("people_add") : t("people_edit")}
        onClose={() => router.back()}
        closeTestID="person-cancel"
        confirm={{
          label: mode === "create" ? t("add") : t("save"),
          onPress: handleSave,
          disabled: draft.isSaving,
          testID: "person-save",
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={isIOS ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 20 + insets.bottom,
        }}
      >
        <View style={{ alignItems: "center", gap: 12 }}>
          <PersonAvatar
            person={{ ...draft.person, avatar: draft.previewAvatar }}
            previewUri={draft.previewUri}
            size={AVATAR_SIZE}
          />
          <PhotoButton
            hasPhoto={draft.hasPhoto}
            addLabel={t("people_photo_add")}
            editLabel={t("people_photo_edit")}
            testID="person-photo"
            onAdd={handlePickPhoto}
            actions={photoActions}
          />
        </View>
        {mode === "create" && (
          <MenuList style={{ marginTop: SECTION_GAP }}>
            <MenuListItem
              title={t("people_add_from_contacts")}
              iconLeft={<Contact size={22} color={colors.tint} />}
              onPress={() => router.replace("/people/import")}
              tone="action"
              testID="person-from-contacts"
            />
          </MenuList>
        )}
        <MenuListHeadline>{t("people_name")}</MenuListHeadline>
        <TextInput
          ref={nameRef}
          accessibilityLabel={t("people_name")}
          testID="person-name"
          autoCorrect={false}
          autoComplete="name"
          textContentType="name"
          clearButtonMode="while-editing"
          style={{
            fontSize: isIOS ? 17 : 16,
            color: colors.textInputText,
            backgroundColor: isIOS
              ? colors.menuListItemBackground
              : colors.textInputBackground,
            width: "100%",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: isIOS ? RADIUS.md : RADIUS.sm,
          }}
          placeholder={t("people_name_placeholder")}
          placeholderTextColor={colors.textInputPlaceholder}
          maxLength={MAX_TAG_LENGTH}
          value={draft.person.name}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          onChangeText={handleNameChange}
        />
        {draft.nameError && (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID="person-name-error"
            style={{
              fontSize: 13,
              color: colors.dangerButtonText,
              paddingHorizontal: 16,
              marginTop: 8,
            }}
          >
            {t("people_name_required")}
          </Text>
        )}
        <View style={{ marginTop: SECTION_GAP }}>
          <RolePicker
            value={draft.person.role}
            onChange={handleRoleChange}
            testID="person-role"
          />
        </View>
        {mode === "edit" && (
          <EditActions
            personId={draft.person.id}
            name={draft.storedName}
            isArchived={Boolean(draft.person.isArchived)}
            onToggleArchived={handleToggleArchived}
            onLeave={handleAllowLeave}
          />
        )}
      </ScrollView>
    </View>
  );
};

/** `/people/create`: new person. */
export const PersonCreate = () => <PersonForm mode="create" />;

/** `/people/[id]`: edit, archive, or delete a person. */
export const PersonEdit = () => <PersonForm mode="edit" />;
