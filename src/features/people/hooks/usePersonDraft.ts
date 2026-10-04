import { useRouter } from "expo-router";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Alert from "@/lib/Alert";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { deleteAvatar, saveAvatar } from "../avatars";
import { usePeopleState, usePeopleUpdater } from "../PeopleProvider";
import type { Person } from "../PeopleProvider";
import { getPeopleSources } from "../sources";

/** Shortest accepted name; one character covers initials. */
export const MIN_NAME_LENGTH = 1;

interface Draft {
  person: Person;
  /** Picked image not yet stored; `null` keeps or removes the stored file. */
  pendingImageUri: string | null;
  /** The stored avatar is dropped on save. */
  removeAvatar: boolean;
}

const showPhotoFailed = () => {
  Alert.alert(t("people_photo_failed_title"), t("people_photo_failed_message"));
};

/**
 * Draft of a person being created or edited, with the picker actions and
 * save. Avatar files change only in `save`, so cancel leaves the stored
 * avatar untouched.
 */
export const usePersonDraft = ({
  mode,
  id,
}: {
  mode: "create" | "edit";
  id?: string;
}) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const { people } = usePeopleState();
  const peopleUpdater = usePeopleUpdater();

  const existing = people.find((person) => person.id === id);
  const [draft, setDraft] = useState<Draft>(() => ({
    person: existing ?? {
      id: uuidv4(),
      name: "",
      avatar: null,
      createdAt: new Date().toISOString(),
    },
    pendingImageUri: null,
    removeAvatar: false,
  }));
  const [isSaving, setIsSaving] = useState(false);

  const hasPhoto =
    draft.pendingImageUri !== null ||
    (!draft.removeAvatar && draft.person.avatar !== null);
  const canSave =
    draft.person.name.trim().length >= MIN_NAME_LENGTH && !isSaving;

  const fromLibrary = async () => {
    const uri = await getPeopleSources().pickImage();
    if (uri === null) {
      return;
    }
    setDraft((current) => ({
      ...current,
      pendingImageUri: uri,
      removeAvatar: false,
    }));
  };

  const removePhoto = () => {
    setDraft((current) => ({
      ...current,
      pendingImageUri: null,
      removeAvatar: true,
    }));
  };

  const setName = (name: string) => {
    setDraft((current) => ({
      ...current,
      person: { ...current.person, name },
    }));
  };

  const toggleArchived = () => {
    setDraft((current) => ({
      ...current,
      person: { ...current.person, isArchived: !current.person.isArchived },
    }));
  };

  const save = async () => {
    const name = draft.person.name.trim();
    if (!canSave) {
      return;
    }
    setIsSaving(true);
    let avatar = draft.removeAvatar ? null : draft.person.avatar;
    let avatarChanged = draft.removeAvatar && draft.person.avatar !== null;
    if (draft.pendingImageUri !== null) {
      try {
        avatar = await saveAvatar({
          id: draft.person.id,
          sourceUri: draft.pendingImageUri,
        });
        avatarChanged = true;
      } catch (error) {
        console.warn(error);
        showPhotoFailed();
        setIsSaving(false);
        return;
      }
    } else if (draft.removeAvatar && draft.person.avatar) {
      await deleteAvatar(draft.person.avatar);
    }

    const person: Person = {
      ...draft.person,
      name,
      avatar,
      updatedAt: avatarChanged
        ? new Date().toISOString()
        : draft.person.updatedAt,
    };

    if (mode === "create") {
      analytics.track("people:person_added", {
        source: "manual",
        has_avatar: avatar !== null,
      });
      peopleUpdater.createPerson(person);
    } else {
      analytics.track("people:person_updated", {
        name_changed: existing?.name !== name,
        avatar_changed: avatarChanged,
        is_archived: Boolean(person.isArchived),
      });
      peopleUpdater.updatePerson(person);
    }
    router.back();
  };

  return {
    person: draft.person,
    previewUri: draft.pendingImageUri,
    previewAvatar: draft.removeAvatar ? null : draft.person.avatar,
    hasPhoto,
    canSave,
    setName,
    toggleArchived,
    fromLibrary,
    removePhoto,
    save,
  };
};
