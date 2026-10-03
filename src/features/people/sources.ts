import * as Contacts from "expo-contacts";
import * as ImagePicker from "expo-image-picker";
import { createStructuredError } from "@/lib/errors";

/** Name and photo of one contact the user picked. Nothing else is read. */
export interface PickedContact {
  /** OS contact id; only used to detect a second pick of the same contact. */
  contactId: string;
  name: string;
  imageUri: string | null;
}

/**
 * OS boundary of the people feature: the contact picker and the photo
 * library. E2E runs swap it for a fake (`src/dev/fakePeopleSources.ts`),
 * because the system screens are outside the app and tests cannot drive
 * them.
 */
export interface PeopleSources {
  /**
   * Opens the contact picker. Resolves `null` on cancel. Rejects with
   * status `contacts_permission_denied` when the user refused access; the
   * OS needs it to read the picked contact's name and photo.
   */
  pickContact: () => Promise<PickedContact | null>;
  /** Opens the photo library. Resolves the image URI, or `null` on cancel. */
  pickImage: () => Promise<string | null>;
}

const systemPeopleSources: PeopleSources = {
  pickContact: async () => {
    // Both platforms read the picked contact from the contact store by id,
    // which needs the permission even though the picker itself does not.
    const permission = await Contacts.requestPermissionsAsync();
    if (!permission.granted) {
      throw createStructuredError({
        status: "contacts_permission_denied",
        message: "Contacts access was not granted",
        why: "The OS contact store cannot be read without the permission",
        fix: "Allow Contacts for Pixy in the system settings, or add the person by name",
      });
    }
    const contact = await Contacts.Contact.presentPicker();
    if (contact === null) {
      return null;
    }
    const [name, imageUri] = await Promise.all([
      contact.getFullName(),
      contact.getImage(),
    ]);
    return { contactId: contact.id, name: name.trim(), imageUri };
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
