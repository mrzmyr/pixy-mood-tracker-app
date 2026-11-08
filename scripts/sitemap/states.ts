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
    requires: ["quick-check-in"],
    states: [
      {
        id: "new",
        title: "New check-in",
        fixture: "year",
        wait: 'id="quick-check-in-scroll"',
      },
    ],
  },
  {
    id: "statistics",
    title: "Statistics",
    route: "/statistics",
    parent: "calendar",
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
    ],
  },
  {
    id: "statistics-highlights",
    title: "Highlights",
    route: "/statistics/highlights",
    parent: "statistics",
    hiddenBy: ["recaps"],
    states: [
      {
        id: "year",
        title: "Last 2 weeks",
        fixture: "year",
        wait: 'text="Last 2 weeks"',
      },
    ],
  },
  {
    id: "statistics-month",
    title: "Month report",
    route: "/statistics/month/2026-03-01",
    parent: "statistics",
    hiddenBy: ["recaps"],
    states: [
      {
        id: "year",
        title: "March 2026",
        fixture: "year",
        wait: 'text="Mood Count"',
      },
    ],
  },
  {
    id: "statistics-year",
    title: "Year report",
    route: "/statistics/year/2026-01-01",
    parent: "statistics",
    hiddenBy: ["recaps"],
    states: [
      { id: "year", title: "2026", fixture: "year", wait: 'text="Mood Count"' },
    ],
  },
  {
    id: "recaps-month",
    title: "Month recap",
    route: "/recaps/month/2026-03-01",
    parent: "calendar",
    requires: ["recaps"],
    states: [
      {
        id: "year",
        title: "March 2026",
        fixture: "year",
        wait: 'id="recaps-period-kind"',
      },
      {
        id: "moments",
        title: "Month moments",
        fixture: "recap-moments",
        wait: 'id="recaps-period-kind"',
      },
    ],
  },
  {
    id: "recaps-year",
    title: "Year recap",
    route: "/recaps/year/2026-01-01",
    parent: "recaps-month",
    requires: ["recaps"],
    states: [
      {
        id: "year",
        title: "2026",
        fixture: "year",
        wait: 'id="recaps-period-kind"',
      },
    ],
  },
  {
    id: "tags",
    title: "Tags",
    route: "/tags",
    parent: "calendar",
    states: [
      {
        id: "year",
        title: "Tags",
        fixture: "year",
        wait: 'id="tag-categories-link"',
      },
    ],
  },
  {
    id: "tag-create",
    title: "New tag",
    route: "/tags/create",
    parent: "tags",
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
    states: [
      { id: "work", title: "Work", fixture: "year", wait: 'id="tag-name"' },
    ],
  },
  {
    id: "tag-categories",
    title: "Tag categories",
    route: "/tags/categories",
    parent: "tags",
    states: [
      {
        id: "hobbies",
        title: "With Hobbies",
        fixture: "tag-categories",
        wait: 'id="tag-categories-close"',
      },
    ],
  },
  {
    id: "tag-category-edit",
    title: "Edit category",
    route: "/tags/categories/fixture-hobbies",
    parent: "tag-categories",
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
    states: [
      { id: "year", title: "Settings", fixture: "year", wait: 'id="data"' },
    ],
  },
  {
    id: "profile",
    title: "Profile",
    route: "/profile",
    parent: "settings",
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
    states: [
      { id: "year", title: "Steps", fixture: "year", wait: 'id="step-tags"' },
    ],
  },
  {
    id: "steps-tags",
    title: "Tags step",
    route: "/settings/steps/tags",
    parent: "steps",
    states: [
      {
        id: "year",
        title: "Tags step",
        fixture: "year",
        wait: 'id="step-tags-enabled"',
      },
    ],
  },
  {
    id: "steps-tag-categories",
    title: "Tag categories",
    route: "/settings/steps/tags/categories",
    parent: "steps-tags",
    states: [
      {
        id: "hobbies",
        title: "With Hobbies",
        fixture: "tag-categories",
        wait: 'id="tag-category-row-general"',
      },
    ],
  },
  {
    id: "steps-sleep",
    title: "Sleep step",
    route: "/settings/steps/sleep",
    parent: "steps",
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
    requires: ["people"],
    states: [
      {
        id: "people",
        title: "Three people",
        fixture: "people",
        wait: 'id="step-people-enabled"',
      },
    ],
  },
  {
    id: "person-create",
    title: "New person",
    route: "/people/create",
    parent: "steps-people",
    requires: ["people"],
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
    requires: ["people"],
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
    states: [
      { id: "year", title: "Data", fixture: "year", wait: 'id="export-json"' },
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    route: "/settings/privacy",
    parent: "settings",
    states: [
      {
        id: "year",
        title: "Privacy",
        fixture: "year",
        wait: 'id="behavioral-data-enabled"',
      },
    ],
  },
  {
    id: "feedback",
    title: "Feedback",
    route: "/feedback",
    parent: "settings",
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
    id: "feature-flags",
    title: "Feature flags",
    route: "/settings/feature-flags",
    parent: "settings",
    states: [
      {
        id: "year",
        title: "Overrides",
        fixture: "year",
        wait: 'id="feature-flags-on-count"',
      },
    ],
  },
];
