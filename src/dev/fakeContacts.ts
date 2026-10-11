import * as Contacts from "expo-contacts";
import { createStructuredError } from "@/lib/errors";
import { writeAvatar } from "./fakePeopleSources";

/** Company of every fake contact; removal deletes only contacts with it. */
export const FAKE_CONTACT_COMPANY = "Pixy Test Contact";

const GIVEN_NAMES = [
  "Ada",
  "Ben",
  "Clara",
  "David",
  "Elif",
  "Felix",
  "Grace",
  "Hugo",
  "Ines",
  "Jonas",
  "Kira",
  "Liam",
  "Mara",
  "Noah",
  "Olga",
  "Paul",
  "Quinn",
  "Rosa",
  "Sami",
  "Tara",
  "Umut",
  "Vera",
  "Wen",
  "Ximena",
  "Yusuf",
  "Zoë",
  "Émile",
  "Åsa",
  "Björn",
  "Chiara",
];
const FAMILY_NAMES = [
  "Adler",
  "Becker",
  "Costa",
  "Dubois",
  "Eriksen",
  "Fischer",
  "García",
  "Hansen",
  "Ivanova",
  "Jensen",
  "Kowalski",
  "López",
  "Müller",
  "Nakamura",
  "Okafor",
  "Petrov",
  "Quist",
  "Rossi",
  "Schmidt",
  "Tanaka",
  "Ünal",
  "Vogel",
  "Weber",
  "Xu",
  "Yilmaz",
  "Zimmermann",
  "Øster",
  "Brown",
  "Kim",
  "Singh",
];
const BATCH_SIZE = 25;
/** Every fifth contact gets the bundled gradient photo. */
const PHOTO_EVERY = 5;

const requestAccess = async () => {
  const permission = await Contacts.requestPermissionsAsync();
  if (!permission.granted) {
    throw createStructuredError({
      status: "contacts_permission_denied",
      message: "Contacts access was not granted",
      why: "Creating or deleting contacts needs the contacts permission",
      fix: "Allow Contacts for Pixy Preview in the system settings, then open the link again",
    });
  }
};

/** Runs `task` for every item, `BATCH_SIZE` at a time, so the contact store is not flooded. */
const inBatches = async <T>(
  items: T[],
  task: (item: T) => Promise<void>,
  start = 0
): Promise<void> => {
  if (start >= items.length) {
    return;
  }
  await Promise.all(
    items.slice(start, start + BATCH_SIZE).map((item) => task(item))
  );
  await inBatches(items, task, start + BATCH_SIZE);
};

/**
 * Adds `count` fake contacts to the device address book. Names combine
 * fixed lists, so they repeat after 900 contacts. All carry
 * {@link FAKE_CONTACT_COMPANY} for {@link removeFakeContacts}.
 */
export const addFakeContacts = async (count: number) => {
  await requestAccess();
  const image = await writeAvatar();
  const indexes = Array.from({ length: count }, (_, index) => index);
  await inBatches(indexes, async (index) => {
    await Contacts.Contact.create({
      givenName: GIVEN_NAMES[index % GIVEN_NAMES.length],
      familyName:
        FAMILY_NAMES[
          Math.floor(index / GIVEN_NAMES.length) % FAMILY_NAMES.length
        ],
      company: FAKE_CONTACT_COMPANY,
      image: index % PHOTO_EVERY === 0 ? image : undefined,
    });
  });
  return count;
};

/** Deletes every contact with {@link FAKE_CONTACT_COMPANY}. Resolves the number deleted. */
export const removeFakeContacts = async () => {
  await requestAccess();
  const details = await Contacts.Contact.getAllDetails([
    Contacts.ContactField.COMPANY,
  ]);
  const fakes = details.filter(
    (detail) => detail.company === FAKE_CONTACT_COMPANY
  );
  await inBatches(fakes, (detail) => new Contacts.Contact(detail.id).delete());
  return fakes.length;
};
