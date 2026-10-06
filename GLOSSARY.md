# Pixy Mood Tracker

Personal mood journal on one device. Person records how they feel, then sees patterns over days, months, years.

## Logging

**Entry**: One record of how person felt at one moment: Rating, plus optional Emotions, Tags, Note. Many Entries per Day allowed. _Avoid_: Log, log item, record, mood

**Check-in**: Guided flow that creates or edits one Entry, one Step at a time. _Avoid_: Logger, log flow, wizard

**Core Module**: One kind of data Entry records, with own Step, own color, own icon: Mood, Emotions, Tags, People, Photos, Note. Rating is the Mood module and is required. Others are optional. Feedback Step is no Core Module. _Avoid_: Feature, section, widget

**Step**: One screen of Check-in (mood, tags, emotions, note, feedback). Person turns each Step on or off. _Avoid_: Slide, page

**Rating**: Required 7-point mood value of Entry, from `extremely_bad` to `extremely_good`. _Avoid_: Mood score, mood level

**Emotion**: Named feeling from fixed catalog of 72, each with short description. Entry holds zero or more. _Avoid_: Feeling, mood word

**Tag**: Person-defined label (activity, person, place) with title and color. Entry holds zero or more. _Avoid_: Label, category, factor

**Archived Tag**: Tag hidden from picker, Filters, Statistics. Stays on Entries that already hold it. _Avoid_: Deleted tag, hidden tag

**Note**: Optional free text on Entry. _Avoid_: Message, journal, text

**Sleep Quality**: Legacy 5-point value on Entries from older versions. No longer recorded, only shown. _Avoid_: Sleep

## History

**Day**: All Entries of one local calendar date, with average Rating. _Avoid_: Log day, date

**Pixel**: One colored square representing one Day, colored by Day's average Rating on active Scale. _Avoid_: Cell, dot, square

**Calendar**: Month grid of Pixels, scrolling back through older months. _Avoid_: History, timeline

**Filter**: Narrowing of Calendar by text, Rating, Tag. _Avoid_: Search, query

**Scale**: Color palette mapping each Rating to one color. Person picks one of 5. _Avoid_: Theme, color scheme

## Insights

**Statistics**: Summary of Entries over period: averages, Peaks, distributions. _Avoid_: Stats, analytics, insights

**Peak**: Day or Tag that stands out in period, e.g. best and worst Days. _Avoid_: Highlight, outlier

**Report**: Statistics bound to one month or one year. Year Report includes Year in Pixels. _Avoid_: Summary, review

**Year in Pixels**: One year of Pixels on one screen. _Avoid_: Year grid, year view

## Data

**Export**: File with all Entries, Tags, Settings, created by person to move or keep data. _Avoid_: Backup, dump

**Import**: Load Export file into app, replacing current data. _Avoid_: Restore, sync

**Reset**: Deletion of all Entries, or of whole app state, started by person. _Avoid_: Wipe, clear

## Engagement

**Reminder**: One daily notification at person-chosen time, prompting Check-in. _Avoid_: Notification, alert, nudge

**Question**: Short survey item shown in feedback Step, single or multiple choice. _Avoid_: Survey, poll, prompt

**Onboarding**: First-run walkthrough before first Entry. _Avoid_: Intro, tutorial
