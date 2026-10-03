import * as FileSystem from "expo-file-system/legacy";
import type { PeopleSources } from "@/features/people";

const FILE = `${FileSystem.cacheDirectory}fake-people-avatar.jpg`;

/** 64x64 blue to orange gradient JPEG, so fake avatars are visible in screenshots. */
const AVATAR_BASE64 =
  "/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAQKADAAQAAAABAAAAQAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAQABAAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICBAICBAYEBAQGCAYGBgYICggICAgICgwKCgoKCgoMDAwMDAwMDA4ODg4ODhAQEBAQEhISEhISEhISEv/bAEMBAwMDBQQFCAQECBMNCw0TExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTE//dAAQABP/aAAwDAQACEQMRAD8Ay9lGyrmyjZX9Hf235n5d/ZHkU9lGyrmyjZR/bfmH9keRT2UbKubKNlH9t+Yf2R5FPZRsq5so2Uf235h/ZHkf/9B2yjZVzYKNgr7H+2/MP7I8inso2Vc2CjYKP7b8w/sjyKeyjZVzYKNgo/tvzD+yPIp7KNlXNgo2Cj+2/MP7I8j/0djZRsq7so2V8j/bfmfqH9k+RS2UbKu7KNlH9t+Yf2T5FLZRsq7so2Uf235h/ZPkUtlGyruyjZR/bfmH9k+R/9LsNho2Grfl0eXX85/235n9Q/2R5FTYaNhq35dHl0f235h/ZHkVNho2Grfl0eXR/bfmH9keRU2GjYat+XR5dH9t+Yf2R5H/2Q==";

const writeAvatar = async () => {
  await FileSystem.writeAsStringAsync(FILE, AVATAR_BASE64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return FILE;
};

/**
 * Stands in for the address book and photo library in e2e runs. The address
 * book holds three contacts; only Sam has a photo. Picking a photo returns a
 * bundled gradient image.
 */
export const fakePeopleSources: PeopleSources = {
  listContacts: () =>
    Promise.resolve({
      contacts: [
        { contactId: "fake-contact-sam", name: "Sam Fake" },
        { contactId: "fake-contact-kim", name: "Kim Fake" },
        { contactId: "fake-contact-lee", name: "Lee Fake" },
      ],
      isLimited: false,
    }),
  getContactImage: (contactId) =>
    contactId === "fake-contact-sam" ? writeAvatar() : Promise.resolve(null),
  shareMoreContacts: () => Promise.resolve(),
  pickImage: writeAvatar,
};
