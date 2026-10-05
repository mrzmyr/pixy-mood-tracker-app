import dayjs from "dayjs";
import { MAX_PEOPLE, MAX_TAGS, TAG_COLOR_NAMES } from "@/constants/Config";
import type { ExportPerson, ImportData } from "@/features/datagate";
import { EMOTIONS } from "@/features/logger";
import type { LogItem } from "@/features/logs";
import { MAX_PHOTOS_PER_ENTRY } from "@/features/photos";
import type { Tag } from "@/features/tags";
import type { LogPhoto } from "@/types";

// Small JPEGs made with ffmpeg (`gradients`, `testsrc2`, `color` sources).
// One per aspect ratio, so layouts meet wide, tall, square, and tiny photos.
const IMAGES = [
  {
    width: 160,
    height: 120,
    base64:
      "/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYxLjE5LjEwMQD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABaAAEBAQEBAQAAAAAAAAAAAAAAAgMBBAUBAQADAQEBAQEAAAAAAAAAAAAFAwQGAgEIBxABAAAAAAAAAAAAAAAAAAAAABEBAQEBAAAAAAAAAAAAAAAAAAECEf/AABEIAHgAoAMBEgACEgADEgD/2gAMAwEAAhEDEQA/APtpYZVErpdYTGsNENsrPK5bWExrDVDbKzyuV1hM6w1Q2yqJXK6wmdYaobJVErldYTOsNEtsrPK5XWEzrDRLWplc1ZxKawpxe89RK6546PQpAAAAAAAAAAAAAAAAAAAAAAHgHKj9Ejrj115Uax1etC+VSidYSdnWqGuVRK5rWEzrDRLZKolcrrCZ1holtlZ5XK6wmdYaIbZWeVyusJjWGqG2VRK5bWExrDVDZKolctrCY1holrUyucs4ktYULnxGLbngPoqAAAAAAAAAAAAAAAAHgHKj9EgAAAAA+Prrj3K8M2sNK0tEqhDawlbnrRDZKzyuZ1hMaw1Q2yqJXLawmNYaobJVErldYTOsNEtsrPK5XWEzrDRLbKolcrrCZ1hohslUSuW1hMaw0S1KpXPJDWFC18Rz3c8B9HgAAAAAAAAAAeAcqP0SAAAAAAAAAAAD5x9dce5Xhk1hrWlolU9QmsJa560Q2Ss8rl9YTOsNUNsrPK5XWEzrDVDbKolcrrCZ1hqhslUSuV1hMaw0S2ys8rltYTGsNEtvWeVy+scS+sLS1K5UA3awoWPjC9WcB9HkAAAAeAcqP0SAAAAAAAAAAAAAAAAA+vjzZ16UlZKrYtYbVpaZVHUDrCX1jrRLZKolcvrCZ1holtlZ5XK6wmNYaIbZWeVy2sJjWGqG2VRK5bWExrDVDZKolctrCY1hols6olcvc8S+sLcaVcqCbNYdFgxvtnHgHKj9EAAAAAAAAAAAAAAAAAAAAAAAPr48Wde1JWyqmDWG5ohqlUSoDWEvrDVDZKolcvrCY1holslUSuV1hM6w0S2ys8rldYTOsNEtsrPK5XWExrDRDbKolctrCY1h5RBD+vAAAAAAAAAAAAAAAAAAAAAAAAAAAADrj6+K7nqxSVsqpG6wkeNENcrPK53WExrDVDbKzyuW1hM6w1Q2yqJXK6wmNYZDCOtAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHXHrryquerVOLpXiIvWGvT/2Q==",
  },
  {
    width: 120,
    height: 160,
    base64:
      "/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYxLjE5LjEwMQD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABgAAEBAQEBAQEBAQAAAAAAAAAABQQBAgcGAwgBAQEBAQEBAQEBAAAAAAAAAAAFAgMEAQcIBhABAQEBAAAAAAAAAAAAAAAAAAIBEREBAQEBAAAAAAAAAAAAAAAAAAIBEf/AABEIAKAAeAMBEgACEgADEgD/2gAMAwEAAhEDEQA/APxQ/Sh7wAAAAAAAAAAAAAAAAAAAAAAAAAAAB/bZUalwyk2bfWklq2Vh45phpketzj2sZvWR5GwAAAAAAAAAAAAAAAAAAAAAAH6jZUal/k5tNm3ZtDqVGpXptNmnJtCqVHZX5tMm3JtD2VGpX8pNm3NpJatlYeOaYaZHrc49rGb1keRsAAAAAAAAAAAAAAAAB9KqVGpfl00mzb2NIeyo1K/Npk05tIVSo1K/Npk05toeyo1K/Nps25NodSo1K9Nps05NoVSo7K/Npk25Noeyo1K/lJs25tJLVsrDxzTDTI9bnHtYzesjyNgAAAAAAAAAAPtlSobL8Km03KUWkSpUalemkybc20OpUalfmk2bcm0KpUalemk2bc2kPZUalfm0yac2kKpUalfm0yac20PZUalfm02bcm0OpUalem02acm0KpUdlfm0ybcm0PZUalfyk2bc2klq2Vh45phpketzj2sZvWR5GwAAAAH+gR/OYqDnHWs3jIM2y0vVNPK+PqVUqGyrzablMNIlSo1K9NJk25todSo1K/NJs25NoVSo1K9NJs25tIeyo1K/Npk05tIVSo1K/Npk05toeyo1K/Nps25NodSo1K9Nps05NoVSo7K/Npk25Noeyo1K/lJs25tJLVsrDxzTDTI9bnHtYzesj7+P52FQAAAAAAc461m8ZBm2Wl6pp5Xx9SqlQ2VebTcphpEqVGpXppMm3NtDqVGpX5pNm3JtCqVGpXppNm3NpD2VGpX5tMmnNpCqVGpX5tMmnNtD2VGpX5tNm3JtDqVGpXptNmnJtCqVHZX5tMm3Jt9fH4yPeAAAAAAAAAAAAOcdazeMgzbLS9U08r4+pVSobKvNpuUw0iVKjUr00mTbm2h1KjUr80mzbk2hVKjUr00mzbm0h7KjUr82mTTm0hVKjUr82mTTm2/ej8+HpAAAAAAAAAAAAAAAAAAHOOtZvGQZtlpeqaeV8fUqpUNlXm03KYaRKlRqV6aTJtzbQ6lRqV+aTZtybWhCHQAAAAAAAAAAAAAAAAAAAAAAAAc461m8ZBm2Wl6pp5Xx9f/Z",
  },
  {
    width: 320,
    height: 80,
    base64:
      "/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYxLjE5LjEwMQD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABYAAEBAQEBAQAAAAAAAAAAAAAAAgMBBQQBAQEBAQEBAQEAAAAAAAAAAAADAgQBBgUHEAEAAAAAAAAAAAAAAAAAAAAAEQEBAQAAAAAAAAAAAAAAAAAAARH/wAARCABQAUADARIAAhIAAxIA/9oADAMBAAIRAxEAPwD7B9iP5EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8evXiVJWKtsMluWxexVhktx2L2KsMluOxexVhktx2L2KsMWjjsXsVYYrcdi9irDJbjsXsVYZqcqtijKRJ60A8AAAAAAAAAAAAAAAAAAAAAemPqx+aAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOOs409eIWhYs2yxaOSxexRlitx2L2KsMluOxexVhktx2L2KsMWjjsXsVYYrcdi9irDNTkxaxRlDrnbsbeODA9AAAAAAAAAAAAAAAAHpj6sfmgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACVMWNtMs1uexbFGGS3JYtYqwyU5LFrFWWanJYtYoyyW5LFrFGWS3JYtYoyyU5LFrFGWanKrYoyl1FrGhwZAAAAAAAAAAAemPqx+aAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOOvHr14haVirbDJblsWsVYZLcli1irDJbksWsVYZLcli1irDFbksWsVYZLcli1irDJbkxaxVhmpzKWKMpE3rQDwAAAAB6Y+rH5oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA46zjT14hSFizbLJbksXsVYZLcdi9irDJbjsXsVYZLcdi9irDFo47F7FWGK3HYvYqwyW48XsVYQ6527G3jgwPR//2Q==",
  },
  {
    width: 80,
    height: 240,
    base64:
      "/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYxLjE5LjEwMQD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABTAAEBAQEAAAAAAAAAAAAAAAADAgAHAQADAQEAAAAAAAAAAAAAAAACAQMABBABAQAAAAAAAAAAAAAAAAAAABERAQEAAAAAAAAAAAAAAAAAAAAR/8AAEQgA8ABQAwESAAISAAMSAP/aAAwDAQACEQMRAD8A5YzqZzszMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMy2JhoWZAGhZkAaFmQBoWZAGhZkBRCzJNRCzCmoggggGMgggGohBGMZBBAoMggpqIWIKaiCCCmoMggpqDIIIBjIIIBjIIIFBkEFNRZCCJUcIIKagyCCmoMggpqDIIKagyCCmohYgpqIWIKaqCGSagyGSaiiEESgyCCAaFiCmohZkAaCGQFBkMk1BkMk1BkMk1BkMk1BkMk1FrCQ1EEMk1BkMk1BkMk1BkMk1BkMk1BkMgDQsyAoghhTUGQQU1FEIhKDIZJqIWZAGhZkBRCzJNRBDCmoMggpqDIIKagyCCmoMgggGshBGoMggpqDIIKagyCCmoMggpqDIIIBjIIIFELEFNRBDJNQZDJNRRIQRxQZBBTigyCCmohcEFOKIIIKcUGQQU4oMgggigyGScUGQyTUGQyTUWuEEY0EEEAxkEECgyCCmoMggpqDIZJqDIZJqIWZJqIWZAGghkAaiEEagyCCmoMggpqIWIKaiCGQBjhDIAxkMgKDIZJqDIZJqDhDJNRawkMaIQyAMcIZAUGQyTUGQyTUHCGSagyGSaiFmSaiFmEA0EEECilkQhoWZAGhZkAaVGQBpUZBElRkESVGQRJUZBElRkESVGQRMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzP/Z",
  },
  {
    width: 120,
    height: 120,
    base64:
      "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",
  },
  {
    width: 8,
    height: 8,
    base64:
      "/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYxLjE5LjEwMQD/2wBDAAgQEBMQExYWFhYWFhoYGhsbGxoaGhobGxsdHR0iIiIdHR0bGx0dICAiIiUmJSMjIiMmJigoKDAwLi44ODpFRVP/xABMAAEBAAAAAAAAAAAAAAAAAAAABwEBAQAAAAAAAAAAAAAAAAAABQYQAQAAAAAAAAAAAAAAAAAAAAARAQAAAAAAAAAAAAAAAAAAAAD/wAARCAAIAAgDASIAAhEAAxEA/9oADAMBAAIRAxEAPwCigGlS/9k=",
  },
];

// Longest note the logger accepts (SlideMessage MAX_LENGTH).
const MAX_MESSAGE_LENGTH = 10_000;
// Longest tag or person name (MAX_TAG_LENGTH).
const MAX_NAME = "Wwwwwwwwwwwwwwwwwwwwwwwwwwwwww";
const YEARS = 5;
// Entries on the newest day: every rating three times.
const NEWEST_DAY_ENTRIES = 21;
// Days before today with photos, one day in three.
const PHOTO_DAYS = 90;

const RATINGS: LogItem["rating"][] = [
  "extremely_bad",
  "very_bad",
  "bad",
  "neutral",
  "good",
  "very_good",
  "extremely_good",
];
const SLEEP: LogItem["sleep"]["quality"][] = [
  "very_bad",
  "bad",
  "neutral",
  "good",
  "very_good",
];

/** Fixed ids: kind prefix plus index as a version 4 UUID. */
const makeId = (kind: string, index: number) =>
  `${kind}000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;

const NAMES = [
  MAX_NAME,
  "A",
  "🔥🔥🔥",
  "عمل وحياة",
  "日本語のタグ",
  "Two  Spaces",
  "UPPERCASE NAME",
  "Ünïcödé Ñame",
  "emoji 🧘‍♀️ inside",
  "Bartholomew Montgomery-Smith",
];
const getName = (index: number, prefix: string) =>
  NAMES[index] ?? `${prefix} ${index + 1}`;

const TAGS: Tag[] = Array.from({ length: MAX_TAGS }, (_, index) => ({
  id: makeId("5a", index),
  title: getName(index, "Tag"),
  color: TAG_COLOR_NAMES[index % TAG_COLOR_NAMES.length],
  isArchived: index >= MAX_TAGS - 5,
}));

const PEOPLE: ExportPerson[] = Array.from(
  { length: MAX_PEOPLE },
  (_, index) => ({
    id: makeId("5b", index),
    name: getName(index, "Person"),
    avatar:
      index % 2 === 0
        ? { base64: IMAGES[index % IMAGES.length].base64, mime: "image/jpeg" }
        : null,
    isArchived: index >= MAX_PEOPLE - 5,
    createdAt: "2021-01-01T00:00:00.000Z",
  })
);

const LONG_MESSAGE = "Today was a lot. "
  .repeat(MAX_MESSAGE_LENGTH / 17 + 1)
  .slice(0, MAX_MESSAGE_LENGTH);

const MESSAGES = [
  LONG_MESSAGE,
  "",
  ".",
  "🙂🙃😭😡🥳🫠",
  "يوم طويل جدا في العمل، ولكن المساء كان هادئا.",
  "今日はとても長い一日でした。",
  "Line\n".repeat(60),
  "https://example.com/".concat("a".repeat(400)),
  "   \n   ",
  "Short day.",
];

let photoIndex = 0;
const photoFiles: Record<string, string> = {};

/** `count` photos cycling through every image; files exist unless `isMissing`. */
const makePhotos = (count: number, dateTime: string, isMissing = false) =>
  Array.from({ length: count }, (): LogPhoto => {
    const image = IMAGES[photoIndex % IMAGES.length];
    const id = makeId("5d", photoIndex);
    photoIndex += 1;
    const fileName = `${id}.jpg`;
    if (!isMissing) {
      photoFiles[fileName] = image.base64;
    }
    return {
      id,
      fileName,
      width: image.width,
      height: image.height,
      createdAt: dateTime,
      source: "library",
    };
  });

const ALL_TAGS = TAGS.map(({ id }) => ({ id }));
const ALL_PEOPLE = PEOPLE.map(({ id }) => ({ id }));
const ALL_EMOTIONS = EMOTIONS.map(({ key }) => key);

let itemIndex = 0;
const makeItem = ({
  day,
  minute,
  variant,
  photoCount = 0,
  isPhotoMissing = false,
}: {
  day: dayjs.Dayjs;
  minute: number;
  variant: number;
  photoCount?: number;
  isPhotoMissing?: boolean;
}): LogItem => {
  // 10:00 to 20:00 UTC keeps every entry on its local day from UTC-10 to UTC+3.
  const dateTime = day
    .hour(10)
    .minute(minute)
    .format("YYYY-MM-DDTHH:mm:00.000[Z]");
  const isMax = variant % 3 === 0;
  const item: LogItem = {
    id: makeId("5c", itemIndex),
    date: day.format("YYYY-MM-DD"),
    dateTime,
    createdAt: dateTime,
    rating: RATINGS[variant % RATINGS.length],
    sleep: { quality: SLEEP[variant % SLEEP.length] },
    message: MESSAGES[variant % MESSAGES.length],
    emotions: isMax
      ? ALL_EMOTIONS
      : ALL_EMOTIONS.slice(variant % 7, (variant % 7) + (variant % 4)),
    tags: isMax
      ? ALL_TAGS
      : ALL_TAGS.slice(variant % 9, (variant % 9) + (variant % 4)),
    people: isMax
      ? ALL_PEOPLE
      : ALL_PEOPLE.slice(variant % 11, (variant % 11) + (variant % 3)),
    photos: makePhotos(photoCount, dateTime, isPhotoMissing),
  };
  itemIndex += 1;
  return item;
};

// Fixed end day. `endsToday` shifts the newest day to today on load.
const END = dayjs("2026-01-01");

const makeItems = () => {
  const items: LogItem[] = [];
  const dayCount = END.diff(END.subtract(YEARS, "year"), "day");

  // Newest day: every rating, maximum photos, every note edge case.
  for (let index = 0; index < NEWEST_DAY_ENTRIES; index += 1) {
    items.push(
      makeItem({
        day: END,
        minute: index * 28,
        variant: index,
        photoCount: index % (MAX_PHOTOS_PER_ENTRY + 1),
      })
    );
  }
  // Day before: maximum photos whose files are missing, as after a restore.
  items.push(
    makeItem({
      day: END.subtract(1, "day"),
      minute: 0,
      variant: 1,
      photoCount: MAX_PHOTOS_PER_ENTRY,
      isPhotoMissing: true,
    })
  );

  for (let offset = 2; offset < dayCount; offset += 1) {
    // Gaps: one day in eleven has no entry.
    if (offset % 11 === 0) {
      continue;
    }
    const day = END.subtract(offset, "day");
    const entries = offset % 5 === 0 ? 3 : 1;
    for (let index = 0; index < entries; index += 1) {
      items.push(
        makeItem({
          day,
          minute: index * 180,
          variant: offset + index,
          photoCount:
            offset < PHOTO_DAYS && offset % 3 === 0
              ? (offset / 3) % (MAX_PHOTOS_PER_ENTRY + 1)
              : 0,
        })
      );
    }
  }
  return items;
};

const items = makeItems();

/**
 * Stress data for QA: 5 years of entries, the most tags, people, emotions,
 * and photos the app allows, and notes from empty to the 10,000 character
 * limit, in Latin, RTL, CJK, and emoji. The newest day holds 21 entries in
 * every rating. `photoFiles` holds the JPEG of each photo with a file;
 * the day before the newest day references 6 missing files.
 */
export const STRESS_FIXTURE = {
  // SAFETY: built from LogItem, Tag, and ExportPerson values; src/__tests__/dev-fixtures.ts checks it against pixySchema.
  data: {
    version: "1.92.0",
    items,
    tags: TAGS,
    people: PEOPLE,
    settings: {
      actionsDone: [{ title: "onboarding", date: "2021-01-01T09:00:00.000Z" }],
      steps: [
        "rating",
        "tags",
        "people",
        "emotions",
        "message",
        "photos",
        "feedback",
      ],
    },
  } as ImportData,
  photoFiles,
};
