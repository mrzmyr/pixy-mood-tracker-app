/**
 * Every number a card rule compares against. Starting points from the
 * design prototype; tune here, never inline.
 */
export const THRESHOLDS = {
  /** Reminder nudge: a week that cannot reach this many check-in days. */
  reminderMaxCheckInDays: 5,
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
  /** Places: home areas needed without a trip, so one area never fills a card. */
  placesMinSpots: 2,
  /** Places: rows at most, trips first. */
  placesMaxRows: 5,
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
  /** People and mood: rows at most. */
  peopleMoodMaxRows: 8,
  /** Trends: rolling window in days. */
  trendWindowDays: 60,
  /** Trends: days between window ends. */
  trendStepDays: 14,
  /** Trends: days with and days without the driver per window. */
  trendMinDays: 5,
  /** Trends: window ends needed for a line. */
  trendMinPoints: 4,
  /** Trends: share of windows with enough data, more than. */
  trendMinCoverage: 0.55,
  /** Trends: change in mood steps below this reads as steady. */
  trendSteadyBelow: 0.25,
  /** Trends: rows at most. */
  trendMaxRows: 5,
  /** Month story: check-in days needed for a story. */
  storyMinCheckIns: 10,
  /** Month story: months back from the current month that keep a story. */
  storyMaxMonthsBack: 3,
  /** Week story: check-in days needed. */
  weekStoryMinCheckIns: 4,
  /** Week story: weeks before the current one that still get a story. */
  weekStoryMaxWeeksBack: 2,
  /** Story photos and bright days: rating at least this (good). */
  storyBrightMinRating: 4,
  /** Story tags that felt lighter or heavier: rows at most. Medium or strong effects only. */
  storyTagEffectMaxRows: 3,
  /** Story orbit: people with enough connected days needed. */
  storyOrbitMinPeople: 3,
  /** Story orbit: connected days per person, at least. */
  storyOrbitMinDays: 2,
  /** Story orbit: people at most. */
  storyOrbitMaxPeople: 8,
  /** Share card: bright photo days needed for photos on the card. */
  sharePhotos: 1,
  /** Mood chart: check-in days needed. */
  moodChartMinDays: 4,
  /** Mood count: check-in days needed. */
  moodCountMinDays: 10,
  /** Good and harder days: days of the kind needed. */
  moodDaysMin: 2,
  /** Good days: day rating at least this (good). */
  moodDaysGoodMinRating: 4,
  /** Harder days: day rating at most this (bad). */
  moodDaysHardMaxRating: 2,
  /** Sleep chart: nights with sleep needed in a week. */
  sleepChartMinNightsWeek: 3,
  /** Sleep chart: nights with sleep needed in a month. */
  sleepChartMinNightsMonth: 7,
  /** Most used tags: different tags needed. */
  tagsMinDifferent: 3,
  /** Most used tags: rows at most. */
  tagsMaxRows: 5,
  /** Tag days: days with the tag in a week, at least. */
  tagDaysMinWeek: 3,
  /** Tag days: days with the tag in a month, at least. */
  tagDaysMinMonth: 6,
  /** Tag days: cards per period, at most. */
  tagDaysMaxCards: 2,
  /** Year in pixels: check-in days in the year needed. */
  yearPixelsMinDays: 30,
  /** Best month: check-in days a month needs to rank. */
  bestMonthMinDays: 7,
} as const;
