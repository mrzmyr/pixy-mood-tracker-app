/**
 * Latest allowed entry time: `date`, or `now` when `date` lies in the future.
 * Entries describe the past, like the calendar, which disables future days.
 */
export const clampToNow = (date: Date, now: Date = new Date()) =>
  date.getTime() > now.getTime() ? new Date(now) : date;

/**
 * Moves `dateTime` to the day a Material 3 date dialog returned and keeps
 * its time of day. The dialog returns the day as UTC midnight, so the day
 * comes from the UTC fields.
 */
export const withPickedDay = (dateTime: Date, pickedDay: Date) => {
  const result = new Date(dateTime);
  result.setFullYear(
    pickedDay.getUTCFullYear(),
    pickedDay.getUTCMonth(),
    pickedDay.getUTCDate()
  );
  return result;
};
