/**
 * Every number a card rule compares against. Starting points from the
 * design prototype; tune here, never inline.
 */
export const THRESHOLDS = {
  /** Emotion again: good emotion, first time in at least this many days. */
  emotionAgainMinGapDays: 30,
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
  /** Story tags that felt lighter or heavier: rows at most. Medium or strong effects only. */
  storyTagEffectMaxRows: 3,
  /** Story orbit: people with enough connected days needed. */
  storyOrbitMinPeople: 3,
  /** Story orbit: connected days per person, at least. */
  storyOrbitMinDays: 2,
  /** Story orbit: people at most. */
  storyOrbitMaxPeople: 8,
  /** Quiz insight: a tag on at least this many of the answer's days. */
  storyQuizInsightMinTagDays: 3,
  /** Quiz insight: a city on at least this many of the answer's days. */
  storyQuizInsightMinPlaceDays: 2,
  /** Quiz insight skips tags and cities on more of the month: everyday things. */
  storyQuizInsightMaxMonthShare: 0.6,
  /** Story new people: faces at most. The rest show as a count. */
  storyNewPeopleMaxFaces: 54,
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
  /** Sleep chart: nights with sleep needed in a month. */
  sleepChartMinNightsMonth: 7,
  /** Sleep story slide: nights with sleep needed in the month. */
  storySleepMinNights: 7,
  /** Rough nights with something logged the evening before, to ask. */
  roughNightsMin: 2,
  /** Rough-night slides at most: the roughest, shown oldest first. */
  roughNightsMax: 7,
  /** Share of the month's days that makes a tag or person "most days". */
  roughNightsEverydayShare: 0.7,
  /** Repeat marker: share on rough nights minus share on all days. */
  roughNightsMarkMinLift: 0.25,
  /** Repeat markers at most. */
  roughNightsMarked: 2,
  /** Most used tags: different tags needed. */
  tagsMinDifferent: 3,
  /** Most used tags: rows at most. */
  tagsMaxRows: 5,
  /** Tag days: days with the tag in a month, at least. */
  tagDaysMinMonth: 6,
  /** Tag days: cards per period, at most. */
  tagDaysMaxCards: 2,
  /** Year in pixels: check-in days in the year needed. */
  yearPixelsMinDays: 30,
  /** Best month: check-in days a month needs to rank. */
  bestMonthMinDays: 7,
} as const;
