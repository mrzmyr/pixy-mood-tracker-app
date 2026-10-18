/**
 * Time away from Pixy before it locks again. Short trips to the photo or
 * contact picker move the app to the background on Android, so an instant
 * lock would ask for Face ID after every picked photo.
 */
export const LOCK_AFTER_MS = 60_000;

/** True when the user left Pixy at `leftAt` long enough ago to lock it. */
export const isLockDue = (leftAt: number | null, now: number): boolean =>
  leftAt !== null && now - leftAt >= LOCK_AFTER_MS;
