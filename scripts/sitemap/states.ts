// Every screen and state the sitemap captures. Checked by states.test.ts:
// ids, parents, fixtures, flags, routes, and that every `id=` selector is a
// testID in src and every `text=` selector an English string.
//
// The capture clock starts at 2026-03-18 09:41 Europe/Berlin, so "today" is
// 2026-03-18 and today-relative fixtures end that day. Add a screen: pick
// a fixture, a route, and an element that only shows when the screen is
// ready. Taps use testIDs; native header items have labels only.
import type { ScreenSpec } from "./manifest.ts";

const TODAY = "2026-03-18";
/** Newest entry of the `year` fixture; dates shift so it lands on today. */
const YEAR_NEWEST_LOG = "b4e69720-ca77-5f71-9788-e735d10406db";
const WORK_TAG = "ad3d979b-4bf1-5bd8-8fcf-407b2606649c";
const PERSON_SAM = "7f1d6a3e-0001-4a3e-8f6e-0f0000000001";
/** Entry of today with three photos in the `timeline` fixture. */
const TIMELINE_PHOTO_ENTRY = "7e1a0000-0000-4000-8000-000000000002";

const PERSONAS = [
  "lea",
  "jonas",
  "sara",
  "ben",
  "mia",
  "paul",
  "nina",
] as const;

/** Screens in tree order. The first state of each screen is its card image. */
export const SCREENS: ScreenSpec[] = [
  {
    id: "calendar",
    title: "Calendar",
    route: "/calendar",
    parent: null,
    userData: true,
    states: [
      {
        id: "year",
        title: "One year of entries",
        fixture: "year",
        wait: 'id="calendar-list"',
      },
      {
        id: "empty",
        title: "No entries",
        fixture: "empty",
        wait: 'id="calendar-list"',
      },
      ...PERSONAS.map((persona) => ({
        id: `persona-${persona}`,
        title: `Persona ${persona[0].toUpperCase()}${persona.slice(1)}`,
        fixture: `persona-${persona}`,
        wait: 'id="calendar-list"',
      })),
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    route: "/onboarding",
    parent: "calendar",
    userData: false,
    states: [
      {
        id: "welcome",
        title: "Welcome",
        fixture: "fresh",
        wait: 'id="onboarding-start"',
      },
    ],
  },
  {
    id: "day",
    title: "Day",
    route: `/days/${TODAY}`,
    parent: "calendar",
    userData: true,
    states: [
      {
        id: "year",
        title: "Entries of today",
        fixture: "year",
        wait: 'id="log-list"',
      },
      {
        id: "timeline",
        title: "Many entries, photos, places",
        fixture: "timeline",
        wait: 'id="log-list"',
      },
      {
        id: "empty",
        title: "Day without entries",
        fixture: "empty",
        wait: 'id="log-list"',
      },
    ],
  },
  {
    id: "entry-edit",
    title: "Edit entry",
    route: `/logs/${YEAR_NEWEST_LOG}/edit`,
    parent: "day",
    userData: false,
    states: [
      {
        id: "rating",
        title: "Rating step",
        fixture: "year",
        wait: 'id="logger-close"',
      },
    ],
  },
  {
    id: "entry-create",
    title: "New entry",
    route: `/logs/create/${encodeURIComponent("2026-03-18T08:41:00.000Z")}`,
    parent: "calendar",
    userData: false,
    states: [
      {
        id: "rating",
        title: "Rating step",
        fixture: "year",
        wait: 'id="mood-good"',
      },
      {
        id: "every-step",
        title: "Every step on",
        fixture: "persona-paul",
        wait: 'id="mood-good"',
      },
    ],
  },
  {
    id: "request",
    title: "Request a word",
    route: "/request?kind=emotion",
    parent: "entry-create",
    userData: false,
    states: [
      {
        id: "emotion",
        title: "Emotion word",
        fixture: "year",
        wait: 'id="request-emotion-word"',
      },
    ],
  },
  {
    id: "quick-check-in",
    title: "Quick check-in",
    route: "/check-in/new",
    parent: "calendar",
    userData: false,
    requires: ["quick-check-in"],
    states: [
      {
        id: "new",
        title: "New check-in",
        fixture: "year",
        wait: 'id="quick-check-in-slides"',
      },
    ],
  },
  {
    id: "statistics",
    title: "Statistics",
    route: "/statistics",
    parent: "calendar",
    userData: true,
    hiddenBy: ["recaps"],
    states: [
      {
        id: "year",
        title: "One year of entries",
        fixture: "year",
        wait: 'text="Highlights"',
      },
      {
        id: "locked",
        title: "Too few entries",
        fixture: "persona-mia",
        wait: 'text="Highlights"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'text="Highlights"',
      },
    ],
  },
  {
    id: "statistics-highlights",
    title: "Highlights",
    route: "/statistics/highlights",
    parent: "statistics",
    userData: true,
    hiddenBy: ["recaps"],
    states: [
      {
        id: "year",
        title: "Last 2 weeks",
        fixture: "year",
        wait: 'text="Last 2 weeks"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'text="Last 2 weeks"',
      },
    ],
  },
  {
    id: "statistics-month",
    title: "Month report",
    route: "/statistics/month/2026-03-01",
    parent: "statistics",
    userData: true,
    hiddenBy: ["recaps"],
    states: [
      {
        id: "year",
        title: "March 2026",
        fixture: "year",
        wait: 'text="Month Report"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'text="Month Report"',
      },
    ],
  },
  {
    id: "statistics-year",
    title: "Year report",
    route: "/statistics/year/2026-01-01",
    parent: "statistics",
    userData: true,
    hiddenBy: ["recaps"],
    states: [
      {
        id: "year",
        title: "2026",
        fixture: "year",
        wait: 'text="Year Report"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'text="Year Report"',
      },
    ],
  },
  {
    id: "recaps-month",
    title: "Month recap",
    route: "/recaps/month/2026-03-01",
    parent: "calendar",
    userData: true,
    requires: ["recaps"],
    states: [
      {
        id: "year",
        title: "March 2026",
        fixture: "year",
        wait: 'id="recaps-period-label"',
      },
      {
        id: "moments",
        title: "Month moments",
        fixture: "recap-moments",
        wait: 'id="recaps-period-label"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="recaps-empty"',
      },
    ],
  },
  {
    id: "recaps-year",
    title: "Year recap",
    route: "/recaps/year/2026-01-01",
    parent: "recaps-month",
    userData: true,
    requires: ["recaps"],
    states: [
      {
        id: "year",
        title: "2026",
        fixture: "year",
        wait: 'id="recaps-period-label"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="recaps-empty"',
      },
    ],
  },
  {
    id: "tags",
    title: "Tags",
    route: "/tags",
    parent: "calendar",
    userData: true,
    states: [
      {
        id: "year",
        title: "Tags",
        fixture: "year",
        wait: 'id="tag-categories-link"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="tag-categories-link"',
      },
    ],
  },
  {
    id: "tag-create",
    title: "New tag",
    route: "/tags/create",
    parent: "tags",
    userData: false,
    states: [
      {
        id: "empty",
        title: "Empty form",
        fixture: "year",
        wait: 'id="tag-name"',
      },
    ],
  },
  {
    id: "tag-edit",
    title: "Edit tag",
    route: `/tags/${WORK_TAG}`,
    parent: "tags",
    userData: false,
    states: [
      { id: "work", title: "Work", fixture: "year", wait: 'id="tag-name"' },
    ],
  },
  {
    id: "tag-categories",
    title: "Tag categories",
    route: "/tags/categories",
    parent: "tags",
    userData: true,
    states: [
      {
        id: "hobbies",
        title: "With Hobbies",
        fixture: "tag-categories",
        wait: 'id="tag-categories-close"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="tag-categories-close"',
      },
    ],
  },
  {
    id: "tag-category-edit",
    title: "Edit category",
    route: "/tags/categories/fixture-hobbies",
    parent: "tag-categories",
    userData: false,
    states: [
      {
        id: "hobbies",
        title: "Hobbies",
        fixture: "tag-categories",
        wait: 'id="tag-category-name"',
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    route: "/settings",
    parent: "calendar",
    userData: false,
    states: [
      { id: "year", title: "Settings", fixture: "year", wait: 'id="data"' },
    ],
  },
  {
    id: "profile",
    title: "Profile",
    route: "/profile",
    parent: "settings",
    userData: false,
    states: [
      {
        id: "klara",
        title: "Klara",
        fixture: "year",
        wait: 'id="profile-name"',
      },
    ],
  },
  {
    id: "steps",
    title: "Check-in steps",
    route: "/settings/steps",
    parent: "settings",
    userData: false,
    states: [
      { id: "year", title: "Steps", fixture: "year", wait: 'id="step-tags"' },
    ],
  },
  {
    id: "steps-tags",
    title: "Tags step",
    route: "/settings/steps/tags",
    parent: "steps",
    userData: true,
    states: [
      {
        id: "year",
        title: "Tags step",
        fixture: "year",
        wait: 'id="step-tags-enabled"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="step-tags-enabled"',
      },
    ],
  },
  {
    id: "steps-tag-categories",
    title: "Tag categories",
    route: "/settings/steps/tags/categories",
    parent: "steps-tags",
    userData: true,
    states: [
      {
        id: "hobbies",
        title: "With Hobbies",
        fixture: "tag-categories",
        wait: 'id="tag-category-row-general"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="tag-category-row-general"',
      },
    ],
  },
  {
    id: "steps-sleep",
    title: "Sleep step",
    route: "/settings/steps/sleep",
    parent: "steps",
    userData: false,
    states: [
      {
        id: "year",
        title: "Sleep step",
        fixture: "year",
        wait: 'id="step-sleep-enabled"',
      },
    ],
  },
  {
    id: "steps-people",
    title: "People step",
    route: "/settings/steps/people",
    parent: "steps",
    userData: true,
    states: [
      {
        id: "people",
        title: "Three people",
        fixture: "people",
        wait: 'id="step-people-enabled"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="step-people-enabled"',
      },
    ],
  },
  {
    id: "person-create",
    title: "New person",
    route: "/people/create",
    parent: "steps-people",
    userData: false,
    states: [
      {
        id: "empty",
        title: "Empty form",
        fixture: "people",
        wait: 'id="person-name"',
      },
    ],
  },
  {
    id: "person-edit",
    title: "Edit person",
    route: `/people/${PERSON_SAM}`,
    parent: "steps-people",
    userData: false,
    states: [
      {
        id: "sam",
        title: "Sam, with photo",
        fixture: "people",
        wait: 'id="person-name"',
      },
    ],
  },
  {
    id: "reminder",
    title: "Reminder",
    route: "/settings/reminder",
    parent: "settings",
    userData: false,
    states: [
      {
        id: "year",
        title: "Reminder",
        fixture: "year",
        wait: 'id="reminder-enabled"',
      },
    ],
  },
  {
    id: "colors",
    title: "Colors",
    route: "/settings/colors",
    parent: "settings",
    userData: false,
    states: [
      {
        id: "year",
        title: "Colors",
        fixture: "year",
        wait: 'id="color-scale-ColorBrew-RdYlGn"',
      },
    ],
  },
  {
    id: "app-icon",
    title: "App icon",
    route: "/settings/app-icon",
    parent: "settings",
    userData: false,
    states: [
      {
        id: "default",
        title: "Default icon",
        fixture: "year",
        wait: 'id="app-icon-default"',
      },
    ],
  },
  {
    id: "app-lock",
    title: "App Lock",
    route: "/settings/app-lock",
    parent: "settings",
    userData: false,
    requires: ["app-lock"],
    states: [
      {
        id: "off",
        title: "Lock off",
        fixture: "year",
        wait: 'id="app-lock-enabled"',
      },
    ],
  },
  {
    id: "data",
    title: "Data",
    route: "/settings/data",
    parent: "settings",
    userData: false,
    states: [
      { id: "year", title: "Data", fixture: "year", wait: 'id="export-json"' },
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    route: "/settings/privacy",
    parent: "settings",
    userData: false,
    states: [
      {
        id: "year",
        title: "Privacy",
        fixture: "year",
        wait: 'text="Privacy"',
      },
    ],
  },
  {
    id: "feedback",
    title: "Feedback",
    route: "/feedback",
    parent: "settings",
    userData: false,
    states: [
      {
        id: "issue",
        title: "Report an issue",
        fixture: "year",
        wait: 'id="feedback-screen"',
      },
    ],
  },
  {
    id: "orbit",
    title: "Orbit",
    route: "/settings/orbit",
    parent: "settings",
    userData: true,
    requires: ["orbit"],
    states: [
      {
        id: "people",
        title: "People of the last 4 weeks",
        fixture: "people",
        wait: 'id="orbit-screen"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="orbit-empty"',
      },
    ],
  },
  {
    id: "people-archive",
    title: "Archived people",
    route: "/settings/steps/people/archive",
    parent: "steps-people",
    userData: true,
    states: [
      {
        id: "people",
        title: "One archived person",
        fixture: "people",
        wait: 'id="people-archive"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="people-archive"',
      },
    ],
  },
  {
    id: "tags-archive",
    title: "Archived tags",
    route: "/settings/steps/tags/archive",
    parent: "steps-tags",
    userData: true,
    states: [
      {
        id: "archived",
        title: "Two archived tags",
        fixture: "archive",
        wait: 'id="tags-archive"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="tags-archive"',
      },
    ],
  },
  {
    id: "photo",
    title: "Photo",
    route: `/photos/${TIMELINE_PHOTO_ENTRY}?index=0`,
    parent: "day",
    userData: false,
    states: [
      {
        id: "timeline",
        title: "First photo of today",
        fixture: "timeline",
        wait: 'id="photo-viewer"',
      },
    ],
  },
  {
    id: "recap-story",
    title: "Recap story",
    route: "/recaps/story/2026-02-01",
    parent: "recaps-month",
    userData: false,
    requires: ["recaps"],
    states: [
      {
        id: "february",
        title: "February story",
        fixture: "recap-story",
        wait: 'id="recap-story-close"',
      },
    ],
  },
  {
    id: "licenses",
    title: "Licenses",
    route: "/settings/licenses",
    parent: "settings",
    userData: false,
    states: [
      {
        id: "year",
        title: "Open source licenses",
        fixture: "year",
        wait: 'id="licenses-list"',
      },
    ],
  },
  {
    id: "development-tools",
    title: "Development tools",
    route: "/settings/development-tools",
    parent: "settings",
    userData: true,
    states: [
      {
        id: "year",
        title: "One year of entries",
        fixture: "year",
        wait: 'id="development-tools"',
      },
      {
        id: "empty",
        title: "No data",
        fixture: "empty",
        wait: 'id="development-tools"',
      },
    ],
  },
  {
    id: "feature-flags",
    title: "Feature flags",
    route: "/settings/feature-flags",
    parent: "settings",
    userData: false,
    states: [
      {
        id: "year",
        title: "Feature flags",
        fixture: "year",
        wait: 'id="feature-flags-on-count"',
      },
    ],
  },
];

/**
 * Route files under src/app the sitemap does not capture, with the reason.
 * states.test.ts fails on a route file in neither list.
 */
export const NOT_CAPTURED = {
  "src/app/(app)/index.tsx": "Redirects to /calendar.",
  "src/app/(app)/dev/fixture.tsx":
    "Deep link handler: loads a fixture, then leaves. Capture uses it.",
  "src/app/(app)/dev/feature-flag.tsx":
    "Deep link handler: sets flags, then leaves. Capture uses it.",
  "src/app/(app)/dev/fake-contacts.tsx":
    "Deep link handler: seeds device contacts for tests.",
  "src/app/(app)/dev/fake-files.tsx":
    "Deep link handler: seeds files for tests.",
  "src/app/(app)/dev/fixtures.tsx": "Developer fixture picker, not product UI.",
  "src/app/(app)/dev/playground/index.tsx": "Developer playground.",
  "src/app/(app)/dev/playground/design-system.tsx": "Developer playground.",
  "src/app/(app)/dev/playground/recap-story.tsx": "Developer playground.",
  "src/app/(app)/logs/voice.tsx":
    "Starts listening on open; simulator audio crashes it. Needs a phone.",
  "src/app/(app)/people/import.tsx":
    "Reads device contacts; needs the contacts permission and device data.",
  "src/app/(app)/tags/icon.tsx":
    "Opens only from a tap in tag create; a deep link alone goes back.",
} satisfies Record<string, string>;
