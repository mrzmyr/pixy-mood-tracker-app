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
  /** Story photos and bright days: rating at least this (good). */
  storyBrightMinRating: 4,
  /** Story harder days: rating at most this (bad), as in the day recap. */
  storyHardMaxRating: 2,
  /** Cover: photo days for the photo grid. Fewer: one photo. */
  storyCoverGridPhotoDays: 7,
  /** Same weekday: tag days on that weekday, at least. */
  weekdayHabitMinHits: 3,
  /** Same weekday: share of that weekday with the tag, at least. */
  weekdayHabitMinShare: 0.75,
  /** Same weekday: other weekdays' share, at most this part of it. */
  weekdayHabitMaxOtherRatio: 0.5,
  /** Made of: tags with enough days needed. */
  madeOfMinTags: 3,
  /** Made of: days with the tag, at least. */
  madeOfMinDays: 4,
  /** Made of: rows at most. */
  madeOfMaxRows: 5,
  /** Lifted: rows at most. Medium or strong lighter effects only. */
  liftedMaxRows: 3,
  /** Story people: people with enough bright connected days needed. */
  storyPeopleMinPeople: 2,
  /** Story people: bright connected days per person, at least. */
  storyPeopleMinBrightDays: 3,
  /** Story people: rows at most. */
  storyPeopleMaxRows: 2,
  /** Hard pattern: harder days with the tag, at least. */
  hardPatternMinDays: 2,
  /** Hard pattern: share of other days with the tag, below. */
  hardPatternMaxOtherShare: 0.5,
  /** Vs last month: check-in days needed in the month before. */
  vsLastMinCheckIns: 10,
  /** Vs last month: change in tag days, at least. */
  vsLastMinChange: 2,
  /** Vs last month: rows at most. */
  vsLastMaxRows: 4,
  /** Moments: weeks with a photo needed. */
  momentsMinWeeks: 3,
  /** Share card: photos on the card; fewer bright photo days show the grid. */
  sharePhotos: 3,
  /** Share card: lines at most. */
  shareMaxFacts: 3,
  /** Quiz: days a person or tag needs to be a statement or tile. */
  quizMinDays: 2,
} as const;
