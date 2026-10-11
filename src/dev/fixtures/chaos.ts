import {
  MAX_MESSAGE_LENGTH,
  MAX_PEOPLE,
  MAX_TAGS,
  TAG_COLOR_NAMES,
} from "@/constants/Config";
import { STEP_OPTIONS } from "@/constants/LoggerSteps";
import { RATING_KEYS, SLEEP_QUALITY_MAPPING } from "@/constants/Ratings";
import type { ExportPerson, ImportData } from "@/features/datagate";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";
import type { LogLocation, LogPhoto } from "@/types";
import { FIXTURE_AVATAR_BASE64 } from "@/dev/fixtures/avatar";

// Same seed, same data: screenshots stay reproducible.
const SEED = 805_461;
// Newest fixture day; `endsToday` shifts it to today.
const NEWEST_DAY = "2026-09-30";
const OLDEST_DAY = "2019-01-01";
// Entries on the newest day: one per hour.
const NEWEST_DAY_ENTRIES = 24;
/**
 * Entries on the fullest past day. The app has no entries-per-day limit:
 * logger, storage, import, calendar and day view never cap it. 100 is the
 * largest count that still loads fast and fills the day carousel with
 * enough pages to stress it.
 */
export const CHAOS_MAX_ENTRIES_PER_DAY = 100;
// Separate seed: the day plan never shifts when entry content changes.
const PLAN_SEED = 31_337;
// Days before the newest day: fullest day, and the day one entry short.
const MAX_DAY_OFFSET = 3;
const NEAR_MAX_DAY_OFFSET = 400;
// Entries per planned day, spread across history: a few small days, then
// days of 10 to 20 entries.
const SMALL_DAY_COUNTS = [2, 3, 4, 5, 2];
const BUSY_DAY_COUNTS = [10, 12, 14, 15, 17, 18, 19, 20];
// Planned days spread their entries over 06:00 to 20:00 UTC, so a day stays
// one calendar day in time zones from UTC-6 to UTC+3.
const PLAN_START_MINUTE = 6 * 60;
const PLAN_END_MINUTE = 20 * 60;
// Every Nth entry of a crowded day carries photos, many tags, and people.
const HEAVY_ENTRY_EVERY = 4;
// Every Nth entry of a crowded day carries a note of the maximum length.
const LONG_NOTE_EVERY = 10;
// Photo files in `photoAssets.ts`.
const PHOTO_FILES = 6;

const PRNG_MODULUS = 2_147_483_647;
const PRNG_MULTIPLIER = 48_271;

/**
 * Park-Miller PRNG: same seed, same sequence. Returns floats in (0, 1).
 * Products stay below 2^53, so doubles compute them exactly.
 */
const createRandom = (seed: number) => {
  let state = seed % PRNG_MODULUS;
  return () => {
    state = (state * PRNG_MULTIPLIER) % PRNG_MODULUS;
    return state / PRNG_MODULUS;
  };
};

const pad = (value: number) => value.toString(16).padStart(12, "0");
// Valid v4 UUID layout, unique per kind and index.
const chaosId = (kind: number, index: number) =>
  `c4a05000-${String(kind).padStart(4, "0")}-4000-8000-${pad(index)}`;

/**
 * Enabled emotion keys of `src/features/logger/config.ts`. Copied, because
 * the CLI imports fixtures and the logger config needs React Native.
 * `src/__tests__/dev-fixtures.ts` fails when this list drifts.
 */
export const CHAOS_EMOTION_KEYS = [
  "energized",
  "enthusiastic",
  "excited",
  "focused",
  "happy",
  "hopeful",
  "inspired",
  "optimistic",
  "productive",
  "proud",
  "surprised",
  "angry",
  "annoyed",
  "anxious",
  "concerned",
  "confused",
  "embarrassed",
  "fomo",
  "frustrated",
  "hyper",
  "impassioned",
  "irritated",
  "nervous",
  "overwhelmed",
  "pressured",
  "restless",
  "stressed",
  "uneasy",
  "worried",
  "accepted",
  "appreciated",
  "balanced",
  "calm",
  "comfortable",
  "compassionate",
  "connected",
  "content",
  "fragile",
  "good",
  "grateful",
  "heard",
  "loved",
  "relieved",
  "satisfied",
  "supported",
  "thankful",
  "alienated",
  "ashamed",
  "bored",
  "depressed",
  "disappointed",
  "exhausted",
  "hopeless",
  "insecure",
  "lonely",
  "meh",
  "pessimistic",
  "sad",
  "tired",
  "vulnerable",
  "fearful",
  "grieved",
  "rejected",
  "unmotivated",
  "weak",
  "awkward",
  "distracted",
  "desire",
  "impatient",
  "brave",
  "guilty",
  "motivated",
];

/** Tag titles: many scripts, emoji, combining marks, 3 and 30 UTF-16 units. */
const TAG_TITLES = [
  "Donaudampfschifffahrtsgesellsc",
  "abc",
  "Ärger über Größe",
  "Straße & Fußball",
  "Ελληνικά μαθήματα",
  "Русский язык",
  "العمل",
  "משפחה",
  "योग और ध्यान",
  "กาแฟตอนเช้า",
  "加班工作",
  "家族と散歩",
  "친구들과 저녁",
  "👩‍👩‍👧‍👦",
  "👍🏽👍🏿👋🏻",
  "🧑🏾‍💻🧑🏻‍🍳🧑🏼‍🚀",
  "🏳️‍🌈 Pride",
  "  Leerzeichen  ",
  "Z̤͔ͧ̑̓ä͖̭̈̇lͮ̒ͫǧ̗͚̚o̙̔ͮ",
  "Ünïcödé Ñandú",
  "Привет мир 123",
  "Σίσυφος",
  "שלום עולם",
  "مرحبا بالعالم",
  "नमस्ते दुनिया",
  "สวัสดีชาวโลก",
  "你好世界",
  "こんにちは世界",
  "안녕하세요 세계",
  "Ğüşıöç Türkçe",
  "Łódź Kraków",
  "Tiếng Việt",
  "ქართული",
  "Հայերեն",
  "አማርኛ ቋንቋ",
  "ᐃᓄᒃᑎᑐᑦ",
  "Mixed עברית English",
  "123 العربية abc",
  "<script>alert(1)</script>",
  "%s %d {{name}} $(x)",
  "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  "iiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
  "﷽ ﷺ",
  "𝕱𝖗𝖆𝖐𝖙𝖚𝖗 𝖙𝖊𝖝𝖙",
  "Ⅻ ⅷ ① ⑳",
  "ʇxǝʇ uʍop ǝpısdn",
  "Zero​Width​Space",
  "Ω≈ç√∫˜µ≤≥÷",
  "日本語の長いタグ名前テスト用文字列",
  "Ελληνικά & Русский & עברית",
];
// Archived tags still count toward MAX_TAGS.
const ARCHIVED_TAGS = new Set([5, 22, 41]);

const GIVEN_NAMES = [
  "Jürgen",
  "Søren",
  "Zoë",
  "Ольга",
  "Νίκος",
  "محمد",
  "יעל",
  "प्रिया",
  "สมชาย",
  "伟",
  "さくら",
  "민준",
  "Łukasz",
  "François",
  "Siobhán",
  "José María",
  "Nguyễn",
  "Åsa",
  "İbrahim",
  "Ægir",
];
const FAMILY_NAMES = [
  "Müller",
  "Straßburger",
  "Иванова",
  "Παπαδόπουλος",
  "العلي",
  "כהן",
  "शर्मा",
  "ใจดี",
  "王",
  "佐藤",
  "김",
  "Wołowski",
  "Dupont-Lefèvre",
  "Ó Briain",
  "García López",
  "Văn An",
  "Öberg",
  "Yılmaz",
  "🦄",
  "O'Neil",
];
// Replace generated names at these indexes.
const SPECIAL_NAMES = new Map([
  [0, "😀"],
  [1, "Hubertwolfeschlegelsteinhausen"],
  [2, "  Space Cadet  "],
  [3, "👨‍👩‍👧‍👦 Familie"],
  [4, "X"],
  [5, "عبد الرحمن بن عوف"],
]);
const ARCHIVED_PEOPLE = new Set([7, 19, 33]);

/** Note snippets in many scripts; entries join a random few. */
const SNIPPETS = [
  "Heute war ein schöner Tag. Äpfel, Öl, Übermut und die Straße voller Grüße.",
  "Сегодня я гулял в парке и думал о жизни.",
  "Σήμερα ήταν μια καλή μέρα στη θάλασσα.",
  "اليوم كان يوماً جميلاً مع العائلة والأصدقاء.",
  "היום היה יום טוב, הלכנו לים עם החברים.",
  "आज का दिन बहुत अच्छा था, मैंने दोस्तों के साथ खाना खाया।",
  "วันนี้อากาศดีมาก ฉันไปเดินเล่นที่สวนสาธารณะ",
  "今天天气很好，我和朋友一起去公园散步。",
  "今日はとても良い天気でした。友達と公園を散歩しました。",
  "오늘은 날씨가 정말 좋았어요. 친구들과 공원에 갔어요.",
  "Mixed: hello שלום مرحبا 123 world, then back to English.",
  "Emoji: 😀😂🥲😭🙏🏻🙏🏽🙏🏿 👨‍👩‍👧‍👦 👩🏽‍💻 🏳️‍🌈 🏴‍☠️ 🇩🇪🇯🇵🇮🇱",
  "Combining: é ä ñ Z̤͔ͧ̑̓ä͖̭̈̇lͮ̒ͫǧ̗͚̚o̙̔ͮ",
  "Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz",
  "a".repeat(120),
  "Line one\nLine two\n\n\nLine five after empty lines",
  "   leading and trailing spaces   ",
  "Tabs\tand\tzero​width​spaces",
  "<b>not bold</b> & &amp; $(template) %s {{mustache}}",
  "𝕿𝖍𝖊 𝖖𝖚𝖎𝖈𝖐 𝖇𝖗𝖔𝖜𝖓 𝖋𝖔𝖝 ﷽",
  "Tiếng Việt có dấu: Hà Nội, Đà Nẵng, Huế.",
  "Ğüşıöç İstanbul'da çay içtik.",
];

/** Places around the world, including extremes and a failed lookup. */
const PLACES: LogLocation[] = [
  { latitude: 52.52, longitude: 13.405, name: "Straße des 17. Juni, Berlin" },
  { latitude: 55.7558, longitude: 37.6173, name: "Красная площадь, Москва" },
  { latitude: 37.9715, longitude: 23.7257, name: "Ακρόπολη, Αθήνα" },
  {
    latitude: 24.7136,
    longitude: 46.6753,
    name: "الرياض، المملكة العربية السعودية",
  },
  { latitude: 31.7767, longitude: 35.2345, name: "ירושלים, ישראל" },
  { latitude: 28.6139, longitude: 77.209, name: "नई दिल्ली, भारत" },
  { latitude: 13.7563, longitude: 100.5018, name: "กรุงเทพมหานคร ประเทศไทย" },
  { latitude: 39.9042, longitude: 116.4074, name: "北京市东城区天安门广场" },
  { latitude: 35.6762, longitude: 139.6503, name: "東京都渋谷区" },
  { latitude: 37.5665, longitude: 126.978, name: "서울특별시 중구" },
  {
    latitude: -40.3463,
    longitude: 176.5531,
    name: "Taumatawhakatangihangakoauauotamateaturipukakapikimaungahoronukupokaiwhenuakitanatahu, New Zealand",
  },
  {
    latitude: 53.2215,
    longitude: -4.2093,
    name: "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch",
  },
  { latitude: 89.9999, longitude: 0, name: "North Pole" },
  { latitude: -89.9999, longitude: 0, name: "South Pole 🐧" },
  { latitude: 0, longitude: 0, name: "Null Island" },
  {
    latitude: -16.5,
    longitude: 179.9999,
    name: "Fiji, east of the antimeridian",
  },
  {
    latitude: 65.8,
    longitude: -179.9999,
    name: "Chukotka, west of the antimeridian",
  },
  // Reverse geocoding failed, so the card shows coordinates.
  { latitude: -33.8688, longitude: 151.2093, name: null },
  { latitude: 41.0082, longitude: 28.9784, name: "" },
];

// Days with no entries at all: months to a year.
const GAPS: [string, string][] = [
  ["2019-04-10", "2019-09-02"],
  ["2020-11-01", "2021-12-31"],
  ["2023-02-14", "2023-03-01"],
  ["2024-06-01", "2024-08-31"],
  ["2025-12-24", "2026-01-06"],
];

type Random = () => number;

const pick = <T>(random: Random, list: readonly T[]): T =>
  list[Math.floor(random() * list.length)];

// `count` distinct items of `list` in list order.
const sample = <T>(random: Random, list: readonly T[], count: number): T[] =>
  list
    .map((item) => ({ item, key: random() }))
    .sort((a, b) => a.key - b.key)
    .slice(0, count)
    .map(({ item }) => item);

// SAFETY: Object.keys of this literal constant returns exactly its declared keys.
const sleepQualities = Object.keys(
  SLEEP_QUALITY_MAPPING
) as LogItem["sleep"]["quality"][];

const createMessage = (random: Random): string => {
  const roll = random();
  if (roll < 0.15) {
    return "";
  }
  if (roll < 0.2) {
    return "\n\n   \n";
  }
  const parts = sample(random, SNIPPETS, 1 + Math.floor(random() * 4));
  return parts.join(random() < 0.5 ? "\n" : " ");
};

/** Note of exactly `MAX_MESSAGE_LENGTH` UTF-16 units, never a split emoji. */
const createMaxMessage = () => {
  let text = "";
  for (let index = 0; text.length < MAX_MESSAGE_LENGTH; index += 1) {
    text += `${SNIPPETS[index % SNIPPETS.length]}\n\n`;
  }
  let cut = "";
  for (const char of text) {
    if (cut.length + char.length > MAX_MESSAGE_LENGTH) {
      break;
    }
    cut += char;
  }
  return cut.padEnd(MAX_MESSAGE_LENGTH, ".");
};

const createPhotos = (
  random: Random,
  count: number,
  dateTime: string,
  nextId: () => string
): LogPhoto[] =>
  sample(
    random,
    Array.from({ length: PHOTO_FILES }, (_, index) => index + 1),
    count
  ).map((photo) => ({
    id: nextId(),
    fileName: `fixture-photo-${photo}.jpg`,
    width: photo === 3 ? 900 : 1200,
    height: photo === 3 ? 1200 : 900,
    createdAt: dateTime,
    source: random() < 0.5 ? "day" : "library",
  }));

const addDays = (day: string, days: number) => {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const isInGap = (day: string) =>
  GAPS.some(([start, end]) => day >= start && day <= end);

const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      86_400_000
  );

/**
 * Entry count per past day that holds more than one entry on purpose: the
 * fullest day, the day one short of it, then small and busy days spread
 * evenly across history. Planned days never fall into a gap.
 */
const planCrowdedDays = (): Map<string, number> => {
  const random = createRandom(PLAN_SEED);
  const plan = new Map<string, number>();
  const place = (offset: number, count: number) => {
    let day = addDays(NEWEST_DAY, -offset);
    while (plan.has(day) || isInGap(day)) {
      day = addDays(day, -1);
    }
    plan.set(day, count);
  };
  place(MAX_DAY_OFFSET, CHAOS_MAX_ENTRIES_PER_DAY);
  place(NEAR_MAX_DAY_OFFSET, CHAOS_MAX_ENTRIES_PER_DAY - 1);
  const counts = [...SMALL_DAY_COUNTS, ...BUSY_DAY_COUNTS];
  const span = daysBetween(OLDEST_DAY, NEWEST_DAY) - 2;
  const spread = sample(random, counts, counts.length);
  for (const [index, count] of spread.entries()) {
    place(2 + Math.floor(((index + random()) * span) / spread.length), count);
  }
  return plan;
};

/** Evenly spaced, strictly increasing minute of the day for entry `index`. */
const planMinute = (random: Random, index: number, count: number) => {
  const slot = Math.floor((PLAN_END_MINUTE - PLAN_START_MINUTE) / count);
  return PLAN_START_MINUTE + index * slot + Math.floor(random() * slot);
};

/**
 * Stress-test user that hits every limit: {@link MAX_TAGS} tags and
 * {@link MAX_PEOPLE} people with names in many scripts, years of entries
 * with gaps, every rating, sleep quality, and emotion, notes in many
 * scripts, places around the world, and a newest day with 24 entries. The
 * first entry of that day carries every tag, person, and emotion, 6
 * photos, and a note of {@link MAX_MESSAGE_LENGTH} characters. Past days
 * hold 2 to 5 and 10 to 20 entries, one day {@link CHAOS_MAX_ENTRIES_PER_DAY}
 * and one day one fewer, with heavy entries mixed in. Turns every
 * logger step on. Seeded, so every load produces the same data.
 *
 * Photos reference bundled files by name, like `withTimeline`.
 */
export const withChaos = (data: ImportData): ImportData => {
  const random = createRandom(SEED);
  let photoCount = 0;
  const nextPhotoId = () => {
    photoCount += 1;
    return chaosId(4, photoCount);
  };

  const tags: Tag[] = TAG_TITLES.slice(0, MAX_TAGS).map((title, index) => ({
    id: chaosId(1, index),
    title,
    color: TAG_COLOR_NAMES[index % TAG_COLOR_NAMES.length],
    ...(ARCHIVED_TAGS.has(index) && { isArchived: true }),
  }));

  const people: ExportPerson[] = Array.from(
    { length: MAX_PEOPLE },
    (_, index) => ({
      id: chaosId(2, index),
      name:
        SPECIAL_NAMES.get(index) ??
        `${GIVEN_NAMES[index % GIVEN_NAMES.length]} ${
          FAMILY_NAMES[
            (index * 7 + Math.floor(index / 20)) % FAMILY_NAMES.length
          ]
        }`,
      avatar:
        index % 4 === 0
          ? { base64: FIXTURE_AVATAR_BASE64, mime: "image/jpeg" as const }
          : null,
      ...(ARCHIVED_PEOPLE.has(index) && { isArchived: true }),
      createdAt: `2019-01-${String((index % 28) + 1).padStart(2, "0")}T08:00:00.000Z`,
    })
  );

  const items: LogItem[] = [];
  const addEntry = (
    date: string,
    hour: number,
    fields: Partial<LogItem> & Pick<LogItem, "rating" | "sleep">,
    minuteOfDay?: number
  ) => {
    const minute = minuteOfDay ?? hour * 60 + Math.floor(random() * 60);
    const dateTime = `${date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00.000Z`;
    items.push({
      id: chaosId(3, items.length),
      date,
      dateTime,
      createdAt: dateTime,
      message: "",
      emotions: [],
      tags: [],
      people: [],
      photos: [],
      ...fields,
    });
    return dateTime;
  };

  interface EntryOptions {
    /** Minute of the UTC day; default is a random minute of `hour`. */
    minuteOfDay?: number;
    /** `true` forces photos, many tags, people and emotions. */
    heavy?: boolean;
    /** Note of the maximum length. */
    longNote?: boolean;
  }

  const randomEntry = (
    date: string,
    hour: number,
    sleep: LogItem["sleep"],
    {
      minuteOfDay,
      heavy = random() < 0.05,
      longNote = false,
    }: EntryOptions = {}
  ) => {
    const dateTime = addEntry(
      date,
      hour,
      {
        rating: pick(random, RATING_KEYS),
        sleep,
        message: longNote ? createMaxMessage() : createMessage(random),
        emotions: sample(
          random,
          CHAOS_EMOTION_KEYS,
          heavy ? 20 : Math.floor(random() * 6)
        ),
        tags: sample(random, tags, heavy ? 15 : Math.floor(random() * 5)).map(
          ({ id }) => ({ id })
        ),
        people: sample(
          random,
          people,
          heavy ? 10 : Math.floor(random() * 3)
        ).map(({ id }) => ({ id })),
        ...(random() < 0.4 && { location: pick(random, PLACES) }),
      },
      minuteOfDay
    );
    const entry = items.at(-1);
    if (entry !== undefined && (random() < 0.25 || heavy)) {
      entry.photos = createPhotos(
        random,
        1 + Math.floor(random() * PHOTO_FILES),
        dateTime,
        nextPhotoId
      );
    }
  };

  // Newest day: the max entry, then one entry per remaining hour, every
  // rating at least 3 times.
  const maxSleep = { quality: pick(random, sleepQualities) };
  const maxDateTime = addEntry(NEWEST_DAY, 0, {
    rating: "extremely_good",
    sleep: maxSleep,
    message: createMaxMessage(),
    emotions: [...CHAOS_EMOTION_KEYS],
    tags: tags.map(({ id }) => ({ id })),
    people: people.map(({ id }) => ({ id })),
    location: PLACES[10],
  });
  const [maxEntry] = items;
  maxEntry.photos = createPhotos(random, PHOTO_FILES, maxDateTime, nextPhotoId);
  for (let hour = 1; hour < NEWEST_DAY_ENTRIES; hour += 1) {
    randomEntry(NEWEST_DAY, hour, maxSleep);
    const entry = items.at(-1);
    if (entry !== undefined) {
      entry.rating = RATING_KEYS[hour % RATING_KEYS.length];
    }
  }

  // Older days: dense for 60 days so statistics unlock, sparse before.
  // Planned days hold 2 to {@link CHAOS_MAX_ENTRIES_PER_DAY} entries.
  const crowdedDays = planCrowdedDays();
  for (let offset = 1; ; offset += 1) {
    const date = addDays(NEWEST_DAY, -offset);
    if (date < OLDEST_DAY) {
      break;
    }
    const crowdedCount = crowdedDays.get(date);
    if (crowdedCount !== undefined) {
      const sleep = { quality: pick(random, sleepQualities) };
      for (let index = 0; index < crowdedCount; index += 1) {
        // Every rating in turn; every 4th entry is heavy, every 10th has a
        // note of maximum length.
        randomEntry(date, 0, sleep, {
          minuteOfDay: planMinute(random, index, crowdedCount),
          heavy: crowdedCount >= 10 && index % HEAVY_ENTRY_EVERY === 0,
          longNote: crowdedCount >= 10 && index % LONG_NOTE_EVERY === 0,
        });
        const entry = items.at(-1);
        if (entry !== undefined) {
          entry.rating = RATING_KEYS[index % RATING_KEYS.length];
        }
      }
      continue;
    }
    const chance = offset <= 60 ? 0.9 : 0.5;
    if (isInGap(date) || random() >= chance) {
      continue;
    }
    const roll = random();
    let count = 8;
    if (roll < 0.8) {
      count = 1;
    } else if (roll < 0.97) {
      count = 2 + Math.floor(random() * 3);
    }
    const sleep = { quality: pick(random, sleepQualities) };
    for (let index = 0; index < count; index += 1) {
      randomEntry(date, Math.min(23, 7 + index * 2), sleep);
    }
  }

  return {
    ...data,
    tags,
    people,
    items,
    settings: { ...data.settings, steps: [...STEP_OPTIONS] },
  };
};
