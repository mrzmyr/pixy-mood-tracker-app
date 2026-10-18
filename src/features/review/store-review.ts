/**
 * Saved entries (all time) that unlock the automatic store review prompt.
 * Seven entries is about one week of use: the user has seen value, and the
 * prompt follows a success moment (a save). Users above the threshold get
 * the prompt on their next save.
 */
export const STORE_REVIEW_ENTRIES_THRESHOLD = 7;

/** Analytics `trigger` value for the entries threshold prompt. */
export const STORE_REVIEW_TRIGGER = "entries_7";

/** Wait after a save so the save UI settles before the system prompt. */
export const STORE_REVIEW_DELAY_MS = 1500;

/** Inputs for {@link shouldRequestStoreReview}. */
export interface StoreReviewInput {
  /** Saved entries across all time, including the entry just saved. */
  entriesCount: number;
  /** `storeReviewPromptedAt` from settings; `null` until prompted once. */
  promptedAt: string | null;
  /** `StoreReview.isAvailableAsync()`: native prompt exists on this device. */
  isReviewAvailable: boolean;
  /** Production build. Development and preview (e2e, QA) builds never prompt. */
  isReviewBuild: boolean;
  /** Settings loaded from storage. A failed read must not record the prompt. */
  isSettingsReady: boolean;
}

/**
 * Decide whether to request the automatic store review prompt.
 *
 * True only once per install: the entries threshold is reached, the prompt
 * never ran, and the build, device, and settings storage allow it.
 */
export const shouldRequestStoreReview = ({
  entriesCount,
  promptedAt,
  isReviewAvailable,
  isReviewBuild,
  isSettingsReady,
}: StoreReviewInput): boolean =>
  isReviewBuild &&
  isSettingsReady &&
  isReviewAvailable &&
  promptedAt === null &&
  entriesCount >= STORE_REVIEW_ENTRIES_THRESHOLD;
