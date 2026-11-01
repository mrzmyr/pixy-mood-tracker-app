import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DismissKeyboard from "@/components/dismis-keyboard";
import MenuListHeadline from "@/components/menu-list-headline";
import { PhotoButton } from "@/components/photo-button";
import RouteModalHeader from "@/components/route-modal-header";
import type { PhotoAction } from "@/components/photo-button/types";
import TextInfo from "@/components/text-info";
import { RADIUS } from "@/constants/radius";
import { getInputTextStyle } from "@/components/typography";
import useColors from "@/hooks/use-colors";
import { useDiscardGuard } from "@/hooks/use-discard-guard";
import Alert from "@/lib/alert";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";
import { ProfileAvatar } from "../components/profile-avatar";
import {
  deleteProfilePhotos,
  getProfilePhotoUri,
  pickProfileImage,
  saveProfilePhoto,
} from "../photo";
import { getInitials } from "../use-profile";

const AVATAR_SIZE = 112;
const SECTION_GAP = 32;

/** Longest profile name, in characters. */
export const PROFILE_NAME_MAX_LENGTH = 40;

/**
 * `/profile`: name and photo of the user. Both are optional. "Add Photo"
 * opens the library at once; with a photo, "Edit Photo" opens a menu.
 * Files change only on save, so Cancel keeps the stored photo.
 */
export const ProfileForm = () => {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const analytics = useAnalytics();
  const { settings, setSettings } = useSettings();
  const isIOS = Platform.OS === "ios";

  const [name, setName] = useState(settings.profileName);
  /** Picked image not yet stored. */
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  /** The stored photo is dropped on save. */
  const [removePhoto, setRemovePhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const storedPhotoUri =
    settings.profileAvatar && !removePhoto
      ? getProfilePhotoUri(settings.profileAvatar)
      : null;
  const previewUri = pendingImageUri ?? storedPhotoUri;
  const isDirty =
    pendingImageUri !== null ||
    removePhoto ||
    name.trim() !== settings.profileName;
  // Back, the swipe down, and Android back ask before dropping edits.
  const { allowLeave } = useDiscardGuard({ isDirty });

  const handlePickPhoto = async () => {
    const uri = await pickProfileImage();
    if (uri !== null) {
      setPendingImageUri(uri);
      setRemovePhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPendingImageUri(null);
    setRemovePhoto(true);
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    let avatar = removePhoto ? null : settings.profileAvatar;
    if (pendingImageUri !== null) {
      try {
        avatar = await saveProfilePhoto({ sourceUri: pendingImageUri });
      } catch (error) {
        console.warn(error);
        Alert.alert(
          t("people_photo_failed_title"),
          t("people_photo_failed_message")
        );
        setIsSaving(false);
        return;
      }
    } else if (removePhoto) {
      await deleteProfilePhotos();
    }

    const trimmed = name.trim();
    analytics.track("profile:profile_saved", {
      has_name: trimmed !== "",
      name_length: trimmed.length,
      has_photo: avatar !== null,
      photo_changed: pendingImageUri !== null || removePhoto,
    });
    setSettings((current) => ({
      ...current,
      profileName: trimmed,
      profileAvatar: avatar,
    }));
    allowLeave();
    router.back();
  };

  const photoActions: PhotoAction[] = [
    {
      label: t("people_photo_choose"),
      testID: "profile-photo-choose",
      onPress: () => {
        void handlePickPhoto();
      },
    },
    {
      label: t("people_photo_remove"),
      testID: "profile-photo-remove",
      onPress: handleRemovePhoto,
      destructive: true,
    },
  ];

  return (
    <DismissKeyboard>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <RouteModalHeader
          title={t("profile")}
          onClose={() => router.back()}
          closeTestID="profile-cancel"
          confirm={{
            label: t("save"),
            onPress: () => {
              void handleSave();
            },
            disabled: !isDirty || isSaving,
            testID: "profile-save",
          }}
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={isIOS ? "interactive" : "on-drag"}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 20 + insets.bottom,
          }}
        >
          <View style={{ alignItems: "center", gap: 12 }}>
            <ProfileAvatar
              size={AVATAR_SIZE}
              photoUri={previewUri}
              initials={getInitials(name)}
            />
            <PhotoButton
              hasPhoto={previewUri !== null}
              addLabel={t("people_photo_add")}
              editLabel={t("people_photo_edit")}
              testID="profile-photo"
              onAdd={() => {
                void handlePickPhoto();
              }}
              actions={photoActions}
            />
          </View>
          <View style={{ height: SECTION_GAP - 8 }} />
          <MenuListHeadline style={{ marginTop: 32, marginBottom: 8 }}>
            {t("people_name")}
          </MenuListHeadline>
          <TextInput
            accessibilityLabel={t("people_name")}
            testID="profile-name"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            clearButtonMode="while-editing"
            style={{
              ...getInputTextStyle(16),
              color: colors.textInputText,
              backgroundColor: isIOS
                ? colors.menuListItemBackground
                : colors.textInputBackground,
              width: "100%",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: isIOS ? RADIUS.md : RADIUS.sm,
              borderCurve: "continuous",
            }}
            placeholder={t("people_name_placeholder")}
            placeholderTextColor={colors.textInputPlaceholder}
            maxLength={PROFILE_NAME_MAX_LENGTH}
            value={name}
            returnKeyType="done"
            onSubmitEditing={() => {
              void handleSave();
            }}
            onChangeText={setName}
          />
          <TextInfo style={{ marginTop: 8 }}>
            {t("profile_private_note")}
          </TextInfo>
        </ScrollView>
      </View>
    </DismissKeyboard>
  );
};
