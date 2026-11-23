import type { IconSvgObject } from "@hugeicons/core-free-icons/types";
import type { DuotoneTint } from "@/components/duotone-icon";
import type { Emotion } from "@/types";

/** Own two-tone layer for one emotion icon. */
export type EmotionTint = DuotoneTint;

/** Cloud body of the Hugeicons cloud icons, cut flat at `bottom`. */
const cloud = (bottom: number): IconSvgObject => [
  [
    "path",
    {
      key: "tint-cloud",
      d: `M7 ${bottom}H17.5A4.5 4.5 0 0 0 17.5 9A5.5 5.5 0 0 0 6.52 8.02A5 5 0 0 0 7 ${bottom}Z`,
    },
  ],
];

/**
 * Tint layer for icons where filling every shape looks wrong: open paths cut
 * white wedges, slashes split the fill, line icons get no fill. Icons without
 * an entry fill every shape.
 */
export const EMOTION_TINTS: Partial<Record<Emotion["key"], EmotionTint>> = {
  // checkbox squares behind checks
  productive: {
    fill: [],
    underlay: [
      ["rect", { key: "tint-0", x: 2, y: 3, width: 7, height: 7, rx: 2 }],
      ["rect", { key: "tint-1", x: 2, y: 14, width: 7, height: 7, rx: 2 }],
    ],
  },
  // tint sea between top and bottom wave
  calm: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M2 6.1932C2.68524 7.24434 3.57104 7.24434 4.27299 6.1932C6.52985 2.7408 8.67954 8.67642 10.273 6.23213C12.703 2.56944 14.4508 8.92184 16.273 6.1932C18.6492 2.5582 20.1295 8.57758 22 6.58418L22 18.58418C20.1295 20.57758 18.6492 14.5582 16.273 18.1932C14.4508 20.92184 12.703 14.56944 10.273 18.23213C8.67954 20.67642 6.52985 14.7408 4.27299 18.1932C3.57104 19.24434 2.68524 19.24434 2 18.1932Z",
        },
      ],
    ],
  },
  // tint area under the trend line
  pessimistic: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M3 7 L7 11 L9 12.4 L13 9.6 L15 11 L20 16 V20 H3 Z",
        },
      ],
    ],
  },
  // own cloud body
  uneasy: {
    fill: [],
    underlay: cloud(17),
  },
  // own cloud body
  worried: {
    fill: [1],
    underlay: cloud(18),
  },
  // own cloud body
  depressed: {
    fill: [],
    underlay: cloud(17.5),
  },
  // own cloud body
  troubled: {
    fill: [],
    underlay: cloud(17),
  },
  // own cloud body
  forlorn: {
    fill: [],
    underlay: cloud(17),
  },
  // own cloud body + drop
  miserable: {
    fill: [1],
    underlay: cloud(18),
  },
  // own cloud body + bolt
  furious: {
    fill: [1],
    underlay: cloud(17.5),
  },
  // tint ring only
  supported: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          fillRule: "evenodd",
          d: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0Z M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z",
        },
      ],
    ],
  },
  // own hand silhouettes
  grateful: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M12 3 C11 2 10 2.3 9.7 2.8 L7 9.4 L5.2 13 V19.6 C7 19.8 8.5 20.2 9.3 20 C10.9 19.7 12 18.3 12 16.7 Z",
        },
      ],
      [
        "path",
        {
          key: "tint-1",
          d: "M12 3 C13 2 14 2.3 14.3 2.8 L17 9.4 L18.8 13 V19.6 C17 19.8 15.5 20.2 14.7 20 C13.1 19.7 12 18.3 12 16.7 Z",
        },
      ],
    ],
  },
  // outer ear shape only
  heard: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M6.08 18C6.08 20.2 7.23 22 9.31 22C11.39 22 13.08 20.5 13.62 18C13.87 16.8 14.4 16.08 15.23 15.5C17.38 14 19 11.69 19 9C19 5.13 15.87 2 12 2C8.13 2 5 5.13 5 9 Z",
        },
      ],
    ],
  },
  // whole eye under the slash
  ashamed: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M2 12C4 7.5 8 5 12 5C16 5 20 7.5 22 12C20 16.5 16 19 12 19C8 19 4 16.5 2 12Z",
        },
      ],
    ],
  },
  // whole circle under the slash
  hopeless: {
    fill: [],
    underlay: [["circle", { key: "tint-0", cx: 12, cy: 12, r: 10 }]],
  },
  // whole circle under the slash
  disengaged: {
    fill: [],
    underlay: [["circle", { key: "tint-0", cx: 12, cy: 12, r: 9 }]],
  },
  // whole shield under the slash
  vulnerable: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M12 2C11 2.2 8 3.8 6 4.5C4.2 5 3 5.5 3 8.3V11.2C3 16.8 8 20.2 10.6 21.5C11.2 21.8 11.5 22 12 22C12.5 22 12.8 21.8 13.4 21.5C16 20.2 21 16.8 21 11.2V8.3C21 5.8 20.2 5 17.4 4C16 3.6 13 2.2 12 2Z",
        },
      ],
    ],
  },
  // two link pills under the slash
  disconnected: {
    fill: [],
    underlay: [
      ["rect", { key: "tint-0", x: 2, y: 7, width: 8, height: 10, rx: 5 }],
      ["rect", { key: "tint-1", x: 14, y: 7, width: 8, height: 10, rx: 5 }],
    ],
  },
  // whole flag under the slash
  discouraged: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M4 4.2C6 3.2 8.5 2.6 11.76 3.84C13.45 4.72 15.25 5.04 17.02 4.84C18.56 4.67 20 4.5 20 7.1V13.3C17.5 14.6 15 14.6 12 13.5C9 12.4 6.5 12.6 4 13.5Z",
        },
      ],
    ],
  },
  // whole hand silhouette
  disgusted: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M8 14V5.75C8 4.78 8.78 4 9.75 4C10.72 4 11.5 4.78 11.5 5.75V3.75C11.5 2.78 12.28 2 13.25 2C14.22 2 15 2.78 15 3.75V5.75C15 4.78 15.78 4 16.75 4C17.72 4 18.5 4.78 18.5 5.75V8.75C18.5 7.78 19.28 7 20.25 7C21.22 7 22 7.78 22 8.75V14.8C22 18.78 18.78 22 14.8 22H12C9.5 22 7.2 20.7 5.8 18.7L2.3 13.5C1.6 12.4 2.6 10.5 3.9 10.5C4.6 10.5 5.2 10.8 5.6 11.2Z",
        },
      ],
    ],
  },
  // tint the gavel head
  guilty: {
    fill: [5],
    underlay: [["path", { key: "tint-0", d: "M14 2L21 9L14 16L7 9Z" }]],
  },
  // add sun disc
  irate: {
    fill: [0],
    underlay: [["circle", { key: "tint-0", cx: 11, cy: 12, r: 3.9 }]],
  },
  // closed shapes only
  joyful: {
    fill: [1, 2],
  },
  // tint outer band + cloud
  in_awe: {
    fill: [3],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M2 15V12A8 8 0 0 1 17.5 9L14.5 9.5A5 5 0 0 0 5 12V15Z",
        },
      ],
    ],
  },
  // tub + head only
  blissful: {
    fill: [0, 3],
  },
  // own hand silhouette
  sympathetic: {
    fill: [0],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M6 7.5H7.8C8.6 7.5 9.4 7.7 10.1 8L14.9 10C15.6 10.3 16 11 16 11.7V13H20.6C21.4 13 22 13.6 22 14.4C22 15.1 21.6 15.6 21 15.8L15.7 17.3C14.7 17.6 13.7 17.6 12.8 17.3L6 15.5Z",
        },
      ],
    ],
  },
  // tint shoulders, stop before check
  understood: {
    fill: [1],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M3 21C3.3 17.3 6.3 14.2 10 14H11L12 14.07C13 14.14 14 14.4 15 14.9L13.5 21Z",
        },
      ],
    ],
  },
  // tint shoulders, stop before X
  rejected: {
    fill: [2],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M2.5 19V17C2.5 15.7 3 14.5 4.2 14C5.6 13.4 7.2 13 9 13C10.4 13 11.8 13.24 13 13.67L14 19Z",
        },
      ],
    ],
  },
  // tint shoulders
  excluded: {
    fill: [1, 2],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M3 20.5C3.3 16.8 6.3 13.7 10 13.5H11L12 13.57L13.5 20.5Z",
        },
      ],
    ],
  },
  // tint island mounds only
  isolated: {
    fill: [],
    underlay: [
      [
        "path",
        {
          key: "tint-0",
          d: "M8 19C9.2 16.6 11.4 15 14 15C16.6 15 18.8 16.6 20 19Z",
        },
      ],
      ["path", { key: "tint-1", d: "M4 19C5.4 16.3 8 14.5 11 15.1L8 19Z" }],
    ],
  },
  // closed half sun
  optimistic: {
    fill: [],
    underlay: [["path", { key: "tint-0", d: "M8 17A4 4 0 0 1 16 17Z" }]],
  },
};
