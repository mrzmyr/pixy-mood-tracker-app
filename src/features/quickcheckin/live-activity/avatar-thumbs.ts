import * as FileSystem from "expo-file-system/legacy";
import { widgetsDirectory } from "expo-widgets";
import { getAvatarUri } from "@/features/people";
import type { Person } from "@/features/people";
import { renderSquareJpeg } from "@/lib/square-image";

/** File name prefix of avatar thumbnails in the shared widget folder. */
const THUMB_PREFIX = "quick-check-in-avatar-";

/** 16 pt at 3x. Live Activities do not render large images. */
const THUMB_SIZE = 48;

const THUMB_QUALITY = 0.7;

type ThumbPerson = Pick<Person, "id" | "avatar" | "createdAt" | "updatedAt">;

/** Changes with every new photo, so a replaced avatar gets a new file. */
const getThumbName = (person: ThumbPerson) =>
  `${THUMB_PREFIX}${person.id}-${(person.updatedAt ?? person.createdAt).replaceAll(/\D/gu, "")}.jpg`;

const ensureThumb = async (person: ThumbPerson & { avatar: string }) => {
  const name = getThumbName(person);
  const target = `${widgetsDirectory}${name}`;
  const info = await FileSystem.getInfoAsync(target);
  if (!info.exists) {
    const rendered = await renderSquareJpeg({
      sourceUri: getAvatarUri(person.avatar),
      size: THUMB_SIZE,
      quality: THUMB_QUALITY,
    });
    await FileSystem.moveAsync({ from: rendered, to: target });
  }
  return [person.id, name] as const;
};

/**
 * Writes small copies of the avatars of `people` into the shared widget
 * folder, where the Live Activity can read them, and removes older copies.
 *
 * @returns file names by person id. People without a photo, or whose photo
 * fails to render, are missing and keep the person symbol.
 */
export const syncAvatarThumbs = async (
  people: ThumbPerson[]
): Promise<Record<string, string>> => {
  if (!widgetsDirectory) {
    return {};
  }
  const results = await Promise.allSettled(
    people.flatMap((person) =>
      person.avatar ? [ensureThumb({ ...person, avatar: person.avatar })] : []
    )
  );
  const thumbs: Record<string, string> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      const [id, name] = result.value;
      thumbs[id] = name;
    }
  }
  const kept = new Set(Object.values(thumbs));
  const files = await FileSystem.readDirectoryAsync(widgetsDirectory);
  const deletes: Promise<void>[] = [];
  for (const file of files) {
    if (file.startsWith(THUMB_PREFIX) && !kept.has(file)) {
      deletes.push(
        FileSystem.deleteAsync(`${widgetsDirectory}${file}`, {
          idempotent: true,
        })
      );
    }
  }
  await Promise.all(deletes);
  return thumbs;
};
