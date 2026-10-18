import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { MAX_TAG_LENGTH } from "@/constants/config";
import Alert from "@/lib/alert";
import { createStructuredError } from "@/lib/errors";
import type { StructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { saveAvatar } from "../avatars";
import { buildContactIndex, filterContactRows } from "../contact-import";
import { usePeopleState, usePeopleUpdater } from "../people-provider";
import { getPeopleLimit } from "../people-limit";
import { getPeopleSources } from "../sources";
import type { ContactList } from "../sources";
import type { Person } from "../people-provider";

const showPermissionDenied = (onClose: () => void) => {
  Alert.alert(
    t("people_contacts_denied_title"),
    t("people_contacts_denied_message"),
    [
      { text: t("cancel"), style: "cancel", onPress: onClose },
      {
        text: t("people_open_settings"),
        onPress: () => {
          onClose();
          void Linking.openSettings();
        },
      },
    ],
    { cancelable: false }
  );
};

/**
 * Reads the address book. Resolves `"denied"` when the user refused the
 * permission; other failures resolve a `contacts_read_failed` error.
 */
const readContacts = async (): Promise<
  ContactList | "denied" | StructuredError
> => {
  try {
    return await getPeopleSources().listContacts();
  } catch (error) {
    if (
      error instanceof Error &&
      "status" in error &&
      error.status === "contacts_permission_denied"
    ) {
      return "denied";
    }
    const readError = createStructuredError({
      status: "contacts_read_failed",
      message: "Contacts could not be read",
      why: error instanceof Error ? error.message : String(error),
      fix: "Try again, or add the person by name",
    });
    console.warn(readError);
    return readError;
  }
};

/**
 * State of the contact import list: loads the address book, filters it,
 * tracks the selection up to `MAX_PEOPLE`, and imports the picked
 * contacts with their photos. A refused permission shows an alert that leads
 * to the system settings and closes the screen.
 */
export const useContactImport = () => {
  const router = useRouter();
  const analytics = useAnalytics();
  const { people } = usePeopleState();
  const peopleUpdater = usePeopleUpdater();
  const [list, setList] = useState<ContactList | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [readError, setReadError] = useState<StructuredError | null>(null);

  useEffect(() => {
    let isActive = true;
    void (async () => {
      const result = await readContacts();
      if (!isActive) {
        return;
      }
      if (result === "denied") {
        showPermissionDenied(() => router.back());
        return;
      }
      if (result instanceof Error) {
        setReadError(result);
        return;
      }
      setList(result);
    })();
    return () => {
      isActive = false;
    };
  }, [router]);

  const retry = async () => {
    setReadError(null);
    setList(null);
    const result = await readContacts();
    if (result === "denied") {
      showPermissionDenied(() => router.back());
    } else if (result instanceof Error) {
      setReadError(result);
    } else {
      setList(result);
    }
  };

  const contactIndex = useMemo(
    () => buildContactIndex({ contacts: list?.contacts ?? [], people }),
    [list, people]
  );
  const rows = useMemo(
    () => filterContactRows(contactIndex, query),
    [contactIndex, query]
  );
  const { remaining } = getPeopleLimit(people);
  const isAtLimit = selectedIds.length >= remaining;

  const toggle = (contactId: string) => {
    setSelectedIds((current) => {
      if (current.includes(contactId)) {
        return current.filter((id) => id !== contactId);
      }
      return current.length >= remaining ? current : [...current, contactId];
    });
  };

  const shareMore = async () => {
    try {
      await getPeopleSources().shareMoreContacts();
    } catch (error) {
      console.warn(error);
    }
    const result = await readContacts();
    if (result instanceof Error) {
      setReadError(result);
    } else if (result !== "denied") {
      setList(result);
    }
  };

  const importSelected = async () => {
    if (selectedIds.length === 0 || isImporting) {
      return;
    }
    setIsImporting(true);
    const sources = getPeopleSources();
    const selected = new Set(selectedIds);
    const picked = (list?.contacts ?? []).filter((contact) =>
      selected.has(contact.contactId)
    );
    const created = await Promise.all(
      picked.map(async (contact): Promise<Person> => {
        const id = uuidv4();
        let avatar: string | null = null;
        try {
          const imageUri = await sources.getContactImage(contact.contactId);
          if (imageUri !== null) {
            avatar = await saveAvatar({ id, sourceUri: imageUri });
          }
        } catch (error) {
          // A broken photo must not block the import; the person gets the fallback icon.
          console.warn(error);
        }
        const now = new Date().toISOString();
        return {
          id,
          name: contact.name.slice(0, MAX_TAG_LENGTH),
          avatar,
          contactId: contact.contactId,
          createdAt: now,
          updatedAt: avatar === null ? undefined : now,
        };
      })
    );
    for (const person of created) {
      peopleUpdater.createPerson(person);
    }
    analytics.track("people:contacts_imported", {
      count: picked.length,
      avatars_count: created.filter((person) => person.avatar !== null).length,
      is_limited: Boolean(list?.isLimited),
    });
    router.back();
  };

  return {
    isLoading: list === null && readError === null,
    error: readError,
    retry,
    isLimited: Boolean(list?.isLimited),
    rows,
    query,
    setQuery,
    selectedIds,
    isAtLimit,
    isImporting,
    toggle,
    shareMore,
    importSelected,
  };
};
