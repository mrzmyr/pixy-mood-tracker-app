/**
 * Action title for a month story card the user closed on the calendar. It
 * lives in `actionsDone`, so Development Tools can remove it and the card
 * shows again.
 */
export const recapStoryDismissedAction = (monthStart: string) =>
  `recap_story_dismissed_${monthStart}`;
