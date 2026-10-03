import * as Contacts from "expo-contacts";
import * as ImagePicker from "expo-image-picker";
import { createStructuredError } from "@/lib/errors";

/** One entry of the device address book. Only the name is read for the list. */
export interface ContactSummary {
  /** OS contact id; detects contacts that are already people. */
  contactId: string;
  name: string;
}

/** Contacts the app may read, and whether iOS limits them to a shared subset. */
export interface ContactList {
  contacts: ContactSummary[];
  /** iOS 18+ "limited access": the list holds only contacts the user shared. */
  isLimited: boolean;
}

/**
 * OS boundary of the people feature: the address book and the photo
 * library. E2E runs swap it for a fake (`src/dev/fakePeopleSources.ts`),
 * because the system screens are outside the app and tests cannot drive
 * them.
 */
export interface PeopleSources {
  /**
   * Asks for the contacts permission and reads the names of all readable
   * contacts. Rejects with status `contacts_permission_denied` when the user
   * refused access.
   */
  listContacts: () => Promise<ContactList>;
  /** Photo of one contact as a local URI, or `null` without a photo. */
  getContactImage: (contactId: string) => Promise<string | null>;
  /** iOS 18+ limited access: lets the user share more contacts with Pixy. */
  shareMoreContacts: () => Promise<void>;
  /** Opens the photo library. Resolves the image URI, or `null` on cancel. */
  pickImage: () => Promise<string | null>;
}

const systemPeopleSources: PeopleSources = {
  listContacts: async () => {
    const permission = await Contacts.requestPermissionsAsync();
    if (!permission.granted) {
      throw createStructuredError({
        status: "contacts_permission_denied",
        message: "Contacts access was not granted",
        why: "The OS contact store cannot be read without the permission",
        fix: "Allow Contacts for Pixy in the system settings, or add the person by name",
      });
    }
    const details = await Contacts.Contact.getAllDetails([
      Contacts.ContactField.FULL_NAME,
    ]);
    const contacts = details.flatMap((detail) => {
      const name = (detail.fullName ?? "").trim();
      return name === "" ? [] : [{ contactId: detail.id, name }];
    });
    return {
      contacts,
      isLimited: permission.accessPrivileges === "limited",
    };
  },
  getContactImage: (contactId) => new Contacts.Contact(contactId).getImage(),
  shareMoreContacts: async () => {
    await Contacts.Contact.presentAccessPicker();
  },
  pickImage: async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    return result.canceled ? null : result.assets[0].uri;
  },
};

let override: PeopleSources | null = null;

/** Replaces the contact picker and photo library until the app restarts. */
export const setPeopleSourcesOverride = (sources: PeopleSources | null) => {
  override = sources;
};

/** Returns the active sources: the override, else the system pickers. */
export const getPeopleSources = () => override ?? systemPeopleSources;
