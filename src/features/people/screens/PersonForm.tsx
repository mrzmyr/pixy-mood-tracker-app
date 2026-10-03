import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Switch, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Button from "@/components/Button";
import DismissKeyboard from "@/components/DismisKeyboard";
import LinkButton from "@/components/LinkButton";
import MenuList from "@/components/MenuList";
import MenuListItem from "@/components/MenuListItem";
import ModalHeader from "@/components/ModalHeader";
import TextInfo from "@/components/TextInfo";
import { MAX_TAG_LENGTH } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import Alert from "@/lib/Alert";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { PersonChip } from "../components/PersonChip";
import { usePersonDraft } from "../hooks/usePersonDraft";
import { usePersonEntryCount } from "../hooks/usePersonEntryCount";
import { usePeopleUpdater } from "../PeopleProvider";

/** Archive switch and delete button of the edit form. */
const EditActions = ({
  personId,
  isArchived,
  onToggleArchived,
}: {
  personId: string;
  isArchived: boolean;
  onToggleArchived: () => void;
}) => {
  const router = useRouter();
  const colors = useColors();
  const haptics = useHaptics();
  const analytics = useAnalytics();
  const peopleUpdater = usePeopleUpdater();
  const entryCount = usePersonEntryCount(personId);

  const askToDelete = async () => {
    await haptics.selection();
    analytics.track("people:delete_requested", { entries_count: entryCount });
    Alert.alert(
      t("people_delete_confirm_title"),
      t("people_delete_confirm_message", { count: entryCount }),
      [
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => {
            analytics.track("people:person_deleted", {
              entries_count: entryCount,
            });
            peopleUpdater.deletePerson(personId);
            router.back();
          },
        },
        {
          text: t("cancel"),
          style: "cancel",
          onPress: () => analytics.track("people:delete_cancelled"),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <>
      <MenuList style={{ marginTop: 16 }}>
        <MenuListItem
          title={t("people_archive")}
          iconRight={
            <Switch
              accessibilityLabel={t("people_archive")}
              testID="person-archived"
              ios_backgroundColor={colors.backgroundSecondary}
              onValueChange={onToggleArchived}
              value={isArchived}
            />
          }
          isLast
        />
      </MenuList>
      <TextInfo>{t("people_archive_description")}</TextInfo>
      <View style={{ marginTop: 32 }}>
        <Button
          style={{ width: "100%" }}
          onPress={askToDelete}
          type="danger"
          testID="person-delete"
        >
          {t("delete")}
        </Button>
      </View>
    </>
  );
};

/**
 * Create or edit a person: avatar from contacts or the photo library, name,
 * archive switch, and delete. Files change only on save, so cancel leaves
 * the stored avatar untouched.
 */
const PersonForm = ({ mode }: { mode: "create" | "edit" }) => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const draft = usePersonDraft({ mode, id });
  const {
    save: handleSave,
    setName: handleNameChange,
    fromContacts: handleFromContacts,
    toggleArchived: handleToggleArchived,
  } = draft;

  const askForPhoto = () => {
    Alert.alert(t("people_change_photo"), undefined, [
      { text: t("people_photo_from_contacts"), onPress: draft.fromContacts },
      { text: t("people_photo_library"), onPress: draft.fromLibrary },
      ...(draft.hasPhoto
        ? [
            {
              text: t("people_photo_remove"),
              onPress: draft.removePhoto,
              style: "destructive" as const,
            },
          ]
        : []),
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  return (
    <DismissKeyboard>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          marginTop: Platform.OS === "android" ? insets.top : 0,
        }}
      >
        <ModalHeader
          title={mode === "create" ? t("people_add") : t("people_edit")}
          left={
            <LinkButton onPress={() => router.back()} type="primary">
              {t("cancel")}
            </LinkButton>
          }
          right={
            <LinkButton
              onPress={handleSave}
              type="primary"
              disabled={!draft.canSave}
              testID="person-save"
            >
              {mode === "create" ? t("add") : t("save")}
            </LinkButton>
          }
        />
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <PersonChip
              variant="large"
              person={{ ...draft.person, avatar: draft.previewAvatar }}
              previewUri={draft.previewUri}
              onPress={askForPhoto}
              testID="person-avatar"
            />
            <LinkButton onPress={askForPhoto} type="primary">
              {t("people_change_photo")}
            </LinkButton>
          </View>
          <TextInput
            accessibilityLabel={t("people_name_placeholder")}
            testID="person-name"
            autoCorrect={false}
            style={{
              fontSize: 17,
              color: colors.textInputText,
              backgroundColor: colors.textInputBackground,
              width: "100%",
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
            }}
            placeholder={t("people_name_placeholder")}
            placeholderTextColor={colors.textInputPlaceholder}
            maxLength={MAX_TAG_LENGTH}
            value={draft.person.name}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            onChangeText={handleNameChange}
          />
          {mode === "create" ? (
            <Button
              type="secondary"
              onPress={handleFromContacts}
              testID="person-from-contacts"
            >
              {t("people_add_from_contacts")}
            </Button>
          ) : (
            <EditActions
              personId={draft.person.id}
              isArchived={Boolean(draft.person.isArchived)}
              onToggleArchived={handleToggleArchived}
            />
          )}
        </View>
      </View>
    </DismissKeyboard>
  );
};

/** `/people/create`: new person. */
export const PersonCreate = () => <PersonForm mode="create" />;

/** `/people/[id]`: edit, archive, or delete a person. */
export const PersonEdit = () => <PersonForm mode="edit" />;
