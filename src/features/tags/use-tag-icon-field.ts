import { useRouter } from "expo-router";
import { useEffect } from "react";
import { setTagIconPickerSession } from "./tag-icon-picker-session";
import type { TagIconKey } from "./tag-icons";
import type { Tag } from "./tags-provider";
import { useTagIconSuggestions } from "./use-tag-icon-suggestions";

/** Who set the tag icon or color: nobody yet, the suggestion, or the user. */
export type TagIconSource = "default" | "model" | "user";

const sourceOf = (
  picked: string | undefined,
  suggested: string | undefined
): TagIconSource => {
  if (picked) {
    return "user";
  }
  return suggested ? "model" : "default";
};

/**
 * Icon and color of a tag form. Icon: the user's pick, else the best
 * suggestion for the name, else none (default icon). Color: the user's pick,
 * else the color guessed with the first suggestion, else `defaultColor`;
 * later names keep that first guess. A pick wins for the rest of the form.
 * Shares the form values with the icon picker route through
 * {@link setTagIconPickerSession}.
 */
export const useTagIconField = ({
  enabled,
  suggestFor,
  title,
  pickedIcon,
  pickedColor,
  defaultColor,
  onIconPick,
  onColorPick,
}: {
  enabled: boolean;
  /** Name to suggest icons for. Empty: no suggestions, for example an unchanged tag in the edit form. */
  suggestFor: string;
  title: string;
  /** Icon the user picked or the tag already had. */
  pickedIcon: Tag["icon"];
  /** Color the user picked or the tag already had. */
  pickedColor: Tag["color"] | undefined;
  defaultColor: Tag["color"];
  onIconPick: (icon: TagIconKey) => void;
  onColorPick: (color: Tag["color"]) => void;
}) => {
  const router = useRouter();
  const { suggestions, isSuggesting, firstColor } = useTagIconSuggestions(
    enabled ? suggestFor : ""
  );
  const [suggested] = suggestions;
  const icon = pickedIcon ?? suggested;
  const color = pickedColor ?? firstColor ?? defaultColor;

  // The picker route is another screen: share the values through the store.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    setTagIconPickerSession({
      title,
      icon,
      color,
      suggestions,
      isSuggesting,
      onIconPick,
      onColorPick,
    });
  }, [
    enabled,
    title,
    icon,
    color,
    suggestions,
    isSuggesting,
    onIconPick,
    onColorPick,
  ]);

  useEffect(() => () => setTagIconPickerSession(null), []);

  return {
    icon,
    iconSource: sourceOf(pickedIcon, suggested),
    color,
    colorSource: sourceOf(pickedColor, firstColor),
    isSuggesting,
    openPicker: () => router.push("/tags/icon"),
  };
};
