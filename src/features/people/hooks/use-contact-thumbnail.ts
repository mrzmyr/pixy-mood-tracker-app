import { useEffect, useState } from "react";
import { getPeopleSources } from "../sources";

/**
 * Thumbnails read so far, by contact id; `null` means the contact has no
 * photo. iOS writes a file per thumbnail, so each contact is read once per
 * app run and only when its row renders.
 */
const cache = new Map<string, string | null>();

/** Thumbnail URI of a contact for a list row; `null` while loading or without a photo. */
export const useContactThumbnail = (contactId: string) => {
  const [uri, setUri] = useState<string | null>(
    () => cache.get(contactId) ?? null
  );

  useEffect(() => {
    if (cache.has(contactId)) {
      return;
    }
    let isActive = true;
    void (async () => {
      let thumbnail: string | null = null;
      try {
        thumbnail = await getPeopleSources().getContactThumbnail(contactId);
      } catch (error) {
        console.warn(error);
      }
      cache.set(contactId, thumbnail);
      if (isActive) {
        setUri(thumbnail);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [contactId]);

  return uri;
};
