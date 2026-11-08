import type { IconSvgObject } from "@hugeicons/core-free-icons/types";
import { useMemo } from "react";
import { DuotoneIcon } from "@/components/duotone-icon";
import type { DuotoneTint } from "@/components/duotone-icon";
import useColors from "@/hooks/use-colors";
import {
  DEFAULT_TAG_ICON,
  isTagIconKey,
  TAG_ICON_TINTS,
  TAG_ICONS,
} from "../tag-icons";
import type { TagIconKey } from "../tag-icons";
import type { Tag } from "../tags-provider";

/** True for an outline part that encloses an area: not an open path. */
const isClosedPart = ([type, attributes]: IconSvgObject[number]) =>
  type !== "path" || /z\s*$/iu.test(String(attributes.d ?? ""));

/** Tint layer for one icon from its {@link TAG_ICON_TINTS} rule. */
const tintLayerFor = (key: TagIconKey): DuotoneTint | undefined => {
  const rule = TAG_ICON_TINTS[key];
  if (rule === "none") {
    return { fill: [] };
  }
  if (rule === "closed") {
    return {
      fill: TAG_ICONS[key].icon.flatMap((part, index) =>
        isClosedPart(part) ? [index] : []
      ),
    };
  }
  return undefined;
};

/**
 * Two-tone tag icon in the tag color, like emotion icons: outline in a darker
 * shade, tint layer at low opacity. An unknown or missing key draws the
 * default tag icon.
 */
export const TagIcon = ({
  icon,
  color,
  size = 24,
}: {
  icon: Tag["icon"];
  color: Tag["color"];
  size?: number;
}) => {
  const colors = useColors();
  const key = icon && isTagIconKey(icon) ? icon : DEFAULT_TAG_ICON;
  const tintLayer = useMemo(() => tintLayerFor(key), [key]);
  const tagColors = colors.tags[color] ?? colors.tags.slate;

  return (
    <DuotoneIcon
      icon={TAG_ICONS[key].icon}
      tintLayer={tintLayer}
      stroke={tagColors.iconStroke}
      tint={tagColors.iconTint}
      size={size}
    />
  );
};
