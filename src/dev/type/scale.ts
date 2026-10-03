/** One text role in the type guide. */
export interface Role {
  /** Glyph size in points. */
  fontSize: number;
  /** Distance from one baseline to the next, in points. */
  lineHeight: number;
  /** Extra space between letters, in points. */
  letterSpacing: number;
  /** React Native font weight. */
  fontWeight: "400" | "600" | "700";
  /** Name shown on the guide screens. */
  label: string;
  /** When to use this role. */
  use: string;
  /** Sample sentence. Long enough to wrap on a phone. */
  sample: string;
}

const BODY_SAMPLE =
  "Pixy keeps every mood entry on this device, including the note you wrote beside it.";

/** Roles for body, titles, and captions. Tracking stays at 0. */
export const TYPE = {
  micro: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: "400",
    label: "Micro",
    use: "Tab labels and axis labels.",
    sample: "Monday Tuesday Wednesday Thursday",
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    fontWeight: "400",
    label: "Caption",
    use: "Hints under a control.",
    sample: "Turn this off later in Settings, under Privacy.",
  },
  secondary: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
    fontWeight: "400",
    label: "Secondary",
    use: "Supporting line under a title.",
    sample: "Entries from this week stay on this device.",
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0,
    fontWeight: "400",
    label: "Body, single line",
    use: "Rows, buttons, and other one-line labels.",
    sample: BODY_SAMPLE,
  },
  bodyReading: {
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0,
    fontWeight: "400",
    label: "Body, reading",
    use: "Paragraphs and lists that wrap.",
    sample: BODY_SAMPLE,
  },
  section: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
    fontWeight: "600",
    label: "Section",
    use: "Card and sheet titles.",
    sample: "Highlights from the last seven days",
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 0,
    fontWeight: "700",
    label: "Title",
    use: "Screen titles.",
    sample: "Your data stays on this device",
  },
  display: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0,
    fontWeight: "700",
    label: "Display",
    use: "Onboarding headlines.",
    sample: "Privacy, on this device",
  },
} as const satisfies Record<string, Role>;

/**
 * All-caps label at micro size.
 * The only role with tracking. Mixed-case type stays at 0.
 */
export const MICRO_CAPS: Role = {
  fontSize: 12,
  lineHeight: 16,
  letterSpacing: 0.6,
  fontWeight: "600",
  label: "Micro, caps",
  use: "All-caps labels at 12.",
  sample: "MOOD",
};

/** Vertical gaps, in points. Every value sits on a 4-point grid. */
export const SPACE = {
  /** Between single-line list items. */
  listTight: 4,
  /** Caption under a control, and between wrapping list items. */
  list: 8,
  /** Title or section to the first line under it, and between paragraphs. */
  afterTitle: 12,
  /** Display headline to the first line under it. */
  afterDisplay: 16,
  /** Horizontal padding on a normal screen. */
  screen: 16,
  /** Extra indent for a nested list. */
  nested: 16,
  /** Between sections. */
  section: 24,
  /** Between sections that are unrelated. */
  sectionLoose: 32,
  /** Horizontal padding on an onboarding slide. */
  onboarding: 32,
} as const;

/** Size, line height, and tracking for a role. */
export const formatSpec = ({ role }: { role: Role }): string =>
  `${role.fontSize} / ${role.lineHeight} · tracking ${role.letterSpacing}`;

/** Bullet dot. Vertically centered on the first line of body reading. */
export const BULLET = {
  /** Dot diameter. */
  size: 6,
  /** Space from the dot to the text. */
  gap: 12,
} as const;
