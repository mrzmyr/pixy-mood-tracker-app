/** Counts for a list capped at `max` items. See {@link getItemLimit}. */
export interface ItemLimit {
  /** All items, archived ones included. */
  count: number;
  /** Items that are archived; they still use a slot. */
  archivedCount: number;
  /** Slots left, never below 0. */
  remaining: number;
  /** True once no slot is left. */
  reached: boolean;
}

/**
 * Decide whether a capped list is full. Pass the whole stored list: archived
 * items stay in storage and use a slot, so every screen that shows or hides
 * a create action must count them.
 */
export const getItemLimit = (
  items: readonly { isArchived?: boolean }[],
  max: number
): ItemLimit => {
  const count = items.length;
  return {
    count,
    archivedCount: items.filter((item) => item.isArchived).length,
    remaining: Math.max(0, max - count),
    reached: count >= max,
  };
};
