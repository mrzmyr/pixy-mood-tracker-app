import {
  FileTextIcon,
  HeartIcon,
  ImageIcon,
  SunIcon,
  TagIcon,
  UsersIcon,
} from "@/components/icons";
import type { Icon as IconComponent } from "@/components/icons";
import type { LoggerStep } from "@/constants/logger-steps";

/** Logger step of a Core Module ([GLOSSARY.md](../../GLOSSARY.md)). */
export type CoreModule = Extract<
  LoggerStep,
  "rating" | "emotions" | "tags" | "people" | "photos" | "message"
>;

const MODULE_ICONS = {
  rating: SunIcon,
  emotions: HeartIcon,
  tags: TagIcon,
  people: UsersIcon,
  photos: ImageIcon,
  message: FileTextIcon,
} as const satisfies Record<CoreModule, IconComponent>;

/**
 * Icon of a Core Module. The only file that imports these glyphs:
 * `pixy-standards/component-scope` blocks them elsewhere, so each glyph
 * keeps one meaning.
 */
export const ModuleIcon = ({
  module,
  color,
  size = 20,
}: {
  module: CoreModule;
  color: string;
  size?: number;
}) => {
  const Icon = MODULE_ICONS[module];
  return <Icon width={size} height={size} color={color} />;
};
