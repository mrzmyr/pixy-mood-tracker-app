import FileText from "lucide-react-native/icons/file-text";
import Heart from "lucide-react-native/icons/heart";
import Image from "lucide-react-native/icons/image";
import Sun from "lucide-react-native/icons/sun";
import Tag from "lucide-react-native/icons/tag";
import Users from "lucide-react-native/icons/users";
import type { LucideIcon } from "lucide-react-native";
import type { LoggerStep } from "@/constants/logger-steps";

/** Logger step of a Core Module ([GLOSSARY.md](../../GLOSSARY.md)). */
export type CoreModule = Extract<
  LoggerStep,
  "rating" | "emotions" | "tags" | "people" | "photos" | "message"
>;

const MODULE_ICONS = {
  rating: Sun,
  emotions: Heart,
  tags: Tag,
  people: Users,
  photos: Image,
  message: FileText,
} as const satisfies Record<CoreModule, LucideIcon>;

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
