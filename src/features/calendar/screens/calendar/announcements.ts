import dayjs from "dayjs";
import semver from "semver";
import { z } from "zod";

const TextSchema = z.looseObject({ en: z.string() }).catchall(z.string());

/**
 * Card under the calendar from `ANNOUNCEMENTS_URL`. The website builds the
 * list from FeatureOS posts with label "In-app" plus a manual list.
 */
const AnnouncementSchema = z.object({
  /** Dismiss key, stored as a done action. */
  id: z.string(),
  title: TextSchema,
  subtitle: TextSchema.optional(),
  url: z.string(),
  /** Start date, ISO 8601. */
  date: z.string(),
  /** End date, ISO 8601. */
  endsAt: z.string().optional(),
  /** Semver range. Missing means any version. */
  appVersion: z.string().optional(),
  /** Missing means every platform. */
  platforms: z.array(z.string()).optional(),
  /** PostHog flag key that must be on. */
  flag: z.string().optional(),
});

/** One announcement. Fields beyond `id`, `title`, `url`, `date` are optional. */
export type Announcement = z.infer<typeof AnnouncementSchema>;

/**
 * Response body of `ANNOUNCEMENTS_URL`. Malformed items are dropped, so one
 * bad item never hides the others. A body that is no array fails.
 */
export const AnnouncementsSchema = z.array(z.unknown()).transform((items) =>
  items.flatMap((item) => {
    const parsed = AnnouncementSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  })
);

/**
 * Announcements to show, newest first: started, not ended, matching
 * `appVersion` and `platform`, and not dismissed. Flags are checked at render.
 */
export const pickAnnouncements = ({
  announcements,
  dismissedIds,
  appVersion,
  platform,
  now,
}: {
  announcements: Announcement[];
  dismissedIds: Set<string>;
  appVersion: string;
  platform: string;
  now: Date;
}): Announcement[] =>
  announcements
    .filter(
      (item) =>
        !dismissedIds.has(item.id) &&
        !dayjs(item.date).isAfter(now) &&
        (item.endsAt === undefined || dayjs(item.endsAt).isAfter(now)) &&
        (item.appVersion === undefined ||
          semver.satisfies(appVersion, item.appVersion)) &&
        (item.platforms === undefined || item.platforms.includes(platform))
    )
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

/** Title or subtitle in `language`, English otherwise. */
export const localize = (
  text: Announcement["title"],
  language: string
): string => text[language] ?? text.en;
