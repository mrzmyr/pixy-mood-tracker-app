/**
 * Every number a card rule compares against. Starting points from the
 * design prototype; tune here, never inline.
 */
export const THRESHOLDS = {
  /** Reminder nudge: a week that cannot reach this many check-in days. */
  reminderMaxCheckInDays: 5,
  /** Group your tags: at least this many active tags, all in General. */
  categoriesMinTags: 30,
  /** Emotion again: good emotion, first time in at least this many days. */
  emotionAgainMinGapDays: 30,
  /** Emotion absent: days with no hard emotion, counted back from period end. */
  emotionAbsentDays: 21,
  /** Emotion absent: the window before those days, in days. */
  emotionAbsentBeforeDays: 60,
  /** Emotion absent: hard emotion on at least this many days before. */
  emotionAbsentMinBefore: 5,
  /** Emotion absent: check-in days needed in the absent window. */
  emotionAbsentMinCheckIns: 12,
  /** Heavier week: average rating this far below the usual average. */
  heavierWeekDrop: 0.6,
  /** Usual average needs at least this many earlier days. */
  usualMinDays: 20,
  /** Person back: connected again after at least this many days. */
  personBackMinGapDays: 28,
  /** First city: farther than this from every earlier place, in km. */
  newCityMinKm: 15,
  /** New person and first city: earlier check-in days needed. */
  newMinHistoryDays: 15,
  /** Person milestone: connected days in a calendar year. */
  personMilestones: [10, 25, 50, 100, 200],
  /** Tag back: absent at least this many days. */
  tagBackMinGapDays: 21,
  /** Tag back: used on at least this many days before. */
  tagBackMinUses: 8,
  /** Sleep: nights in a row for a run. */
  sleepRunNights: 3,
  /** Sleep turnaround: rough nights the week before, at least. */
  sleepTurnaroundMinRoughBefore: 2,
  /** Rough nights: rough nights the week before, at most. */
  sleepRoughMaxRoughBefore: 1,
  /** Your emotions: different emotions needed. */
  emotionsMinDifferent: 3,
  /** Most connected: people needed. */
  mostConnectedMinPeople: 2,
  /** Trips: farther than this from home, in km. */
  tripMinKm: 25,
  /** Trips: days in one city merge across gaps up to this many days. */
  tripMaxGapDays: 2,
  /** Effects: days with the driver needed for any signal. */
  effectMinDays: 5,
  /** Effects: difference over standard error for a strong signal. */
  effectStrongScore: 2,
  /** Effects: difference over standard error for a medium signal. */
  effectMediumScore: 1,
  /** Stood out: days before the week the pattern comes from. */
  stoodOutHistoryDays: 90,
  /** Stood out: days with history needed in those 90 days. */
  stoodOutMinHistoryDays: 28,
  /** Stood out: tag days in the week, at least. */
  stoodOutMinDays: 2,
  /** Stood out: smallest lift in mood steps worth naming. */
  stoodOutMinDelta: 0.25,
  /** Stood out: cards per week, at most. */
  stoodOutMaxCards: 2,
  /** What moves your mood: check-in days in the period needed. */
  whatMovesMinDays: 40,
  /** What moves your mood: rows per kind, at most. */
  whatMovesMaxRows: 8,
  /** People and mood: people with enough days needed. */
  peopleMoodMinPeople: 4,
} as const;
